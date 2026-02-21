import json
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import SHORTS_DIR
from shorts.models import ShortState, ShortSummary, ShortConfig, FlashcardItem

router = APIRouter(prefix="/api/shorts", tags=["shorts"])

REGISTRY_PATH = SHORTS_DIR / "registry.json"


def _load_registry() -> list[dict]:
    if not REGISTRY_PATH.exists():
        return []
    return json.loads(REGISTRY_PATH.read_text())


def _save_registry(registry: list[dict]) -> None:
    SHORTS_DIR.mkdir(parents=True, exist_ok=True)
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2))


def _load_state(short_id: str) -> ShortState:
    state_path = SHORTS_DIR / short_id / "state.json"
    if not state_path.exists():
        raise HTTPException(404, f"Short {short_id} not found")
    return ShortState(**json.loads(state_path.read_text()))


def _save_state(short_id: str, state: ShortState) -> None:
    state_path = SHORTS_DIR / short_id / "state.json"
    state_path.write_text(state.model_dump_json(indent=2))


# --- CRUD ---


@router.get("/")
async def list_shorts() -> list[ShortSummary]:
    return [ShortSummary(**s) for s in _load_registry()]


class CreateShortRequest(BaseModel):
    theme: str = "whats_this"
    topic: str = ""


@router.post("/")
async def create_short(req: CreateShortRequest) -> ShortSummary:
    registry = _load_registry()
    num = len(registry) + 1
    short_id = f"short_{num:03d}"
    short_dir = SHORTS_DIR / short_id
    short_dir.mkdir(parents=True, exist_ok=True)
    (short_dir / "images").mkdir(exist_ok=True)
    (short_dir / "audio").mkdir(exist_ok=True)

    state = ShortState(id=short_id, theme=req.theme, topic=req.topic)
    _save_state(short_id, state)

    summary = ShortSummary(
        id=short_id,
        theme=req.theme,
        topic=req.topic,
        title=req.topic or f"Short {num}",
        date=datetime.now().isoformat(),
    )
    registry.append(summary.model_dump())
    _save_registry(registry)
    return summary


@router.get("/{short_id}")
async def get_short(short_id: str) -> ShortState:
    return _load_state(short_id)


@router.delete("/{short_id}")
async def delete_short(short_id: str):
    registry = _load_registry()
    if not any(s["id"] == short_id for s in registry):
        raise HTTPException(404, f"Short {short_id} not found")
    registry = [s for s in registry if s["id"] != short_id]
    _save_registry(registry)
    short_dir = SHORTS_DIR / short_id
    if short_dir.exists():
        shutil.rmtree(short_dir)
    return {"deleted": short_id}


# --- Setup ---


@router.put("/{short_id}/config")
async def update_config(short_id: str, config: ShortConfig) -> ShortConfig:
    state = _load_state(short_id)
    state.config = config
    _save_state(short_id, state)
    return config


class UpdateTopicRequest(BaseModel):
    topic: str = ""
    theme: str = ""


@router.put("/{short_id}/setup")
async def update_setup(short_id: str, req: UpdateTopicRequest) -> ShortState:
    state = _load_state(short_id)
    if req.topic:
        state.topic = req.topic
    if req.theme:
        state.theme = req.theme
    _save_state(short_id, state)
    return state


# --- Content ---


class GenerateContentRequest(BaseModel):
    count: int = 6


@router.post("/{short_id}/generate-content")
async def generate_content(short_id: str, req: GenerateContentRequest):
    from shorts.logic import generate_word_list

    state = _load_state(short_id)
    if not state.topic:
        raise HTTPException(400, "Topic is required before generating content")
    items = generate_word_list(state, count=req.count)
    state.items = items
    state.current_step = "content"
    state.content_approved = False
    _save_state(short_id, state)
    return {"items": [item.model_dump() for item in items]}


@router.put("/{short_id}/items")
async def update_items(short_id: str, items: list[FlashcardItem]):
    state = _load_state(short_id)
    state.items = items
    _save_state(short_id, state)
    return {"items": [item.model_dump() for item in items]}


@router.post("/{short_id}/approve-content")
async def approve_content(short_id: str):
    state = _load_state(short_id)
    if not state.items:
        raise HTTPException(400, "No content to approve")
    state.content_approved = True
    state.current_step = "assets"
    _save_state(short_id, state)
    return {"content_approved": True, "current_step": "assets"}


# --- Assets ---


@router.post("/{short_id}/generate-image/{item_id}")
async def generate_image(short_id: str, item_id: str):
    from shorts.logic import generate_item_image

    state = _load_state(short_id)
    item = next((i for i in state.items if i.id == item_id), None)
    if not item:
        raise HTTPException(404, f"Item {item_id} not found")
    short_dir = SHORTS_DIR / short_id
    image_file = generate_item_image(item, state.config, short_dir)
    item.image_file = image_file
    item.image_generated = True
    _save_state(short_id, state)
    return item.model_dump()


@router.post("/{short_id}/generate-all-images")
async def generate_all_images(short_id: str):
    from shorts.logic import generate_item_image

    state = _load_state(short_id)
    short_dir = SHORTS_DIR / short_id
    for item in state.items:
        if not item.image_generated:
            image_file = generate_item_image(item, state.config, short_dir)
            item.image_file = image_file
            item.image_generated = True
            _save_state(short_id, state)
    return {"items": [item.model_dump() for item in state.items]}


@router.delete("/{short_id}/revert-image/{item_id}")
async def revert_image(short_id: str, item_id: str):
    state = _load_state(short_id)
    item = next((i for i in state.items if i.id == item_id), None)
    if not item:
        raise HTTPException(404, f"Item {item_id} not found")
    if item.image_file:
        img_path = SHORTS_DIR / short_id / item.image_file
        if img_path.exists():
            img_path.unlink()
    item.image_file = ""
    item.image_generated = False
    _save_state(short_id, state)
    return item.model_dump()


@router.post("/{short_id}/generate-tts")
async def generate_tts(short_id: str):
    from shorts.logic import generate_item_tts, generate_question_tts

    state = _load_state(short_id)
    if not state.config.voice_id:
        raise HTTPException(400, "Voice ID must be set before generating TTS")
    short_dir = SHORTS_DIR / short_id

    # Generate shared question TTS
    if not state.tts_question_file:
        q_file, q_dur = generate_question_tts(state.config, short_dir)
        state.tts_question_file = q_file
        state.tts_question_duration_ms = q_dur
        _save_state(short_id, state)

    # Generate per-item TTS
    for item in state.items:
        if not item.tts_generated:
            generate_item_tts(item, state.config, short_dir)
            _save_state(short_id, state)

    return state.model_dump()


@router.post("/{short_id}/approve-assets")
async def approve_assets(short_id: str):
    state = _load_state(short_id)
    all_images = all(i.image_generated for i in state.items)
    all_tts = all(i.tts_generated for i in state.items)
    if not all_images:
        raise HTTPException(400, "Not all images have been generated")
    if not all_tts:
        raise HTTPException(400, "Not all TTS clips have been generated")
    state.assets_approved = True
    state.current_step = "export"
    _save_state(short_id, state)
    return {"assets_approved": True, "current_step": "export"}


# --- Export ---


@router.post("/{short_id}/export")
async def export_video(short_id: str):
    from shorts.logic import build_short_video

    state = _load_state(short_id)
    short_dir = SHORTS_DIR / short_id
    output_file = build_short_video(state, short_dir)
    state.output_file = output_file
    _save_state(short_id, state)
    return {"output_file": output_file}


@router.get("/{short_id}/download")
async def download_video(short_id: str):
    from fastapi.responses import FileResponse

    state = _load_state(short_id)
    if not state.output_file:
        raise HTTPException(404, "No video has been exported yet")
    video_path = SHORTS_DIR / short_id / state.output_file
    if not video_path.exists():
        raise HTTPException(404, "Video file not found")
    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=f"{short_id}.mp4",
    )


@router.post("/{short_id}/approve")
async def approve_short(short_id: str):
    state = _load_state(short_id)
    state.completed = True
    _save_state(short_id, state)

    # Update registry
    registry = _load_registry()
    for s in registry:
        if s["id"] == short_id:
            s["completed"] = True
            s["title"] = state.title or state.topic
            break
    _save_registry(registry)
    return {"completed": True}
