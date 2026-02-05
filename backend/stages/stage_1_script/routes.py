import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import EPISODES_DIR
from models import EpisodeState, ScriptLine
from stages.stage_1_script.logic import check_seed, generate_idea, generate_script

router = APIRouter(prefix="/api/episodes/{ep_id}/script", tags=["script"])


def _load_state(ep_id: str) -> EpisodeState:
    state_path = EPISODES_DIR / ep_id / "state.json"
    if not state_path.exists():
        raise HTTPException(404, f"Episode {ep_id} not found")
    return EpisodeState(**json.loads(state_path.read_text()))


def _save_state(ep_id: str, state: EpisodeState) -> None:
    state_path = EPISODES_DIR / ep_id / "state.json"
    state_path.write_text(state.model_dump_json(indent=2))


class SeedRequest(BaseModel):
    seed: str


class IdeaRequest(BaseModel):
    seed: str


class GenerateScriptRequest(BaseModel):
    idea: str


class AddLineRequest(BaseModel):
    position: int
    line: ScriptLine


@router.post("/check-seed")
async def check_seed_endpoint(ep_id: str, req: SeedRequest):
    state = _load_state(ep_id)
    result = check_seed(state, req.seed)
    state.script.seed = req.seed
    _save_state(ep_id, state)
    return result


@router.post("/generate-idea")
async def generate_idea_endpoint(ep_id: str, req: IdeaRequest):
    state = _load_state(ep_id)
    result = generate_idea(state, req.seed)
    state.script.seed = req.seed
    state.script.idea = result.get("idea", "")
    _save_state(ep_id, state)
    return result


@router.post("/generate-script")
async def generate_script_endpoint(ep_id: str, req: GenerateScriptRequest):
    state = _load_state(ep_id)
    lines = generate_script(state, req.idea)
    state.script.idea = req.idea
    state.script.lines = lines
    state.current_stage = "stage_1_script"
    _save_state(ep_id, state)
    return [line.model_dump() for line in lines]


@router.put("/lines")
async def update_lines(ep_id: str, lines: list[ScriptLine]):
    state = _load_state(ep_id)
    state.script.lines = lines
    _save_state(ep_id, state)
    return [line.model_dump() for line in lines]


@router.post("/lines")
async def add_line(ep_id: str, req: AddLineRequest):
    state = _load_state(ep_id)
    state.script.lines.insert(req.position, req.line)
    for i, line in enumerate(state.script.lines):
        line.order = i
    _save_state(ep_id, state)
    return [line.model_dump() for line in state.script.lines]


@router.delete("/lines/{line_id}")
async def delete_line(ep_id: str, line_id: str):
    state = _load_state(ep_id)
    state.script.lines = [l for l in state.script.lines if l.id != line_id]
    for i, line in enumerate(state.script.lines):
        line.order = i
    _save_state(ep_id, state)
    return [line.model_dump() for line in state.script.lines]


@router.post("/approve")
async def approve_script(ep_id: str):
    state = _load_state(ep_id)
    if not state.script.lines:
        raise HTTPException(400, "Cannot approve empty script")
    state.script.approved = True
    state.current_stage = "stage_2_tts"
    _save_state(ep_id, state)

    # Update episode registry with summary
    registry_path = EPISODES_DIR / "registry.json"
    registry = json.loads(registry_path.read_text()) if registry_path.exists() else []
    for ep in registry:
        if ep["id"] == ep_id:
            ep["summary"] = state.script.idea
            break
    registry_path.write_text(json.dumps(registry, indent=2))

    return {"approved": True, "current_stage": state.current_stage}
