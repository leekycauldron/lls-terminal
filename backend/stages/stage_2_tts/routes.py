import json
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import EPISODES_DIR, ELEVENLABS_API_KEY
from models import EpisodeState, ScriptLine, TTSLineStatus
from stages.stage_2_tts.logic import initialize_tts, generate_line_tts, revert_line_tts

router = APIRouter(prefix="/api/episodes/{ep_id}/tts", tags=["tts"])


def _load_state(ep_id: str) -> EpisodeState:
    state_path = EPISODES_DIR / ep_id / "state.json"
    if not state_path.exists():
        raise HTTPException(404, f"Episode {ep_id} not found")
    return EpisodeState(**json.loads(state_path.read_text()))


def _save_state(ep_id: str, state: EpisodeState) -> None:
    state_path = EPISODES_DIR / ep_id / "state.json"
    state_path.write_text(state.model_dump_json(indent=2))


@router.post("/initialize")
async def initialize(ep_id: str):
    state = _load_state(ep_id)
    state.tts.line_statuses = initialize_tts(state)
    state.current_stage = "stage_2_tts"
    _save_state(ep_id, state)
    return state.tts.model_dump()


@router.post("/generate/{line_id}")
async def generate_single(ep_id: str, line_id: str):
    state = _load_state(ep_id)
    # Ensure line exists
    line_ids = [l.id for l in state.script.lines]
    if line_id not in line_ids:
        raise HTTPException(404, f"Line {line_id} not found")

    # Must generate sequentially - check all prior lines are generated
    line_index = line_ids.index(line_id)
    for i in range(line_index):
        prior_id = line_ids[i]
        prior_status = next(
            (ls for ls in state.tts.line_statuses if ls.line_id == prior_id), None
        )
        if not prior_status or not prior_status.generated:
            raise HTTPException(400, f"Must generate line {prior_id} first (sequential)")

    if not ELEVENLABS_API_KEY:
        raise HTTPException(500, "ELEVENLABS_API_KEY not configured in .env")

    try:
        result = generate_line_tts(state, line_id)
    except Exception as e:
        raise HTTPException(500, f"TTS generation failed for line {line_id}: {e}")

    # Update status
    found = False
    for i, ls in enumerate(state.tts.line_statuses):
        if ls.line_id == line_id:
            state.tts.line_statuses[i] = result
            found = True
            break
    if not found:
        state.tts.line_statuses.append(result)

    _save_state(ep_id, state)
    return result.model_dump()


@router.post("/generate-all")
async def generate_all(ep_id: str):
    if not ELEVENLABS_API_KEY:
        raise HTTPException(500, "ELEVENLABS_API_KEY not configured in .env")

    state = _load_state(ep_id)
    results = []
    for line in state.script.lines:
        status = next(
            (ls for ls in state.tts.line_statuses if ls.line_id == line.id), None
        )
        if status and status.generated:
            results.append(status.model_dump())
            continue

        try:
            result = generate_line_tts(state, line.id)
        except Exception as e:
            raise HTTPException(500, f"TTS generation failed for line {line.id}: {e}")

        # Update in state
        found = False
        for i, ls in enumerate(state.tts.line_statuses):
            if ls.line_id == line.id:
                state.tts.line_statuses[i] = result
                found = True
                break
        if not found:
            state.tts.line_statuses.append(result)

        _save_state(ep_id, state)
        results.append(result.model_dump())

    return results


@router.delete("/revert/{line_id}")
async def revert(ep_id: str, line_id: str):
    state = _load_state(ep_id)

    # Must revert from end - check no later lines are generated
    line_ids = [l.id for l in state.script.lines]
    if line_id not in line_ids:
        raise HTTPException(404, f"Line {line_id} not found")

    line_index = line_ids.index(line_id)
    for i in range(line_index + 1, len(line_ids)):
        later_id = line_ids[i]
        later_status = next(
            (ls for ls in state.tts.line_statuses if ls.line_id == later_id), None
        )
        if later_status and later_status.generated:
            raise HTTPException(400, f"Must revert line {later_id} first (revert from end)")

    revert_line_tts(state, line_id)

    for i, ls in enumerate(state.tts.line_statuses):
        if ls.line_id == line_id:
            state.tts.line_statuses[i] = TTSLineStatus(line_id=line_id)
            break

    _save_state(ep_id, state)
    return {"reverted": True, "line_id": line_id}


class ModeRequest(BaseModel):
    mode: str


@router.put("/mode")
async def set_mode(ep_id: str, req: ModeRequest):
    state = _load_state(ep_id)
    if req.mode not in ("manual", "auto"):
        raise HTTPException(400, "Mode must be 'manual' or 'auto'")
    state.tts.mode = req.mode
    _save_state(ep_id, state)
    return {"mode": state.tts.mode}


class SpeedRequest(BaseModel):
    speed: float


@router.put("/speed")
async def set_speed(ep_id: str, req: SpeedRequest):
    state = _load_state(ep_id)
    state.tts.speed = max(0.25, min(4.0, req.speed))
    _save_state(ep_id, state)
    return {"speed": state.tts.speed}


@router.put("/lines")
async def update_lines(ep_id: str, lines: list[ScriptLine]):
    state = _load_state(ep_id)
    # Can't edit lines that already have TTS generated
    generated_ids = {ls.line_id for ls in state.tts.line_statuses if ls.generated}
    for line in lines:
        if line.id in generated_ids:
            original = next((l for l in state.script.lines if l.id == line.id), None)
            if original and (
                line.text_zh != original.text_zh
                or line.text_en != original.text_en
                or line.text_pinyin != original.text_pinyin
            ):
                raise HTTPException(400, f"Cannot edit line {line.id}: TTS already generated. Revert first.")

    state.script.lines = lines
    _save_state(ep_id, state)
    return [l.model_dump() for l in lines]


class AddLineRequest(BaseModel):
    position: int
    line: ScriptLine


@router.post("/lines")
async def add_line(ep_id: str, req: AddLineRequest):
    state = _load_state(ep_id)
    # Can only add after the last generated line
    generated_ids = [ls.line_id for ls in state.tts.line_statuses if ls.generated]
    if generated_ids:
        last_gen_id = generated_ids[-1]
        last_gen_index = next(
            (i for i, l in enumerate(state.script.lines) if l.id == last_gen_id), -1
        )
        if req.position <= last_gen_index:
            raise HTTPException(400, "Can only add lines after the last generated line")

    state.script.lines.insert(req.position, req.line)
    for i, line in enumerate(state.script.lines):
        line.order = i
    # Add a TTS status for the new line
    state.tts.line_statuses.append(TTSLineStatus(line_id=req.line.id))
    _save_state(ep_id, state)
    return [l.model_dump() for l in state.script.lines]


@router.delete("/lines/{line_id}")
async def delete_line(ep_id: str, line_id: str):
    state = _load_state(ep_id)
    # Can't delete if TTS is generated
    status = next(
        (ls for ls in state.tts.line_statuses if ls.line_id == line_id), None
    )
    if status and status.generated:
        raise HTTPException(400, f"Cannot delete line {line_id}: TTS already generated. Revert first.")

    state.script.lines = [l for l in state.script.lines if l.id != line_id]
    state.tts.line_statuses = [ls for ls in state.tts.line_statuses if ls.line_id != line_id]
    for i, line in enumerate(state.script.lines):
        line.order = i
    _save_state(ep_id, state)
    return [l.model_dump() for l in state.script.lines]


@router.post("/approve")
async def approve(ep_id: str):
    state = _load_state(ep_id)
    # All lines must have TTS generated
    for line in state.script.lines:
        status = next(
            (ls for ls in state.tts.line_statuses if ls.line_id == line.id), None
        )
        if not status or not status.generated:
            raise HTTPException(400, f"Line {line.id} does not have TTS generated")

    state.tts.approved = True
    state.current_stage = "stage_3_scenes"
    _save_state(ep_id, state)
    return {"approved": True, "current_stage": state.current_stage}
