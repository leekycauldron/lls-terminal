import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import EPISODES_DIR, OPENAI_API_KEY
from models import EpisodeState
from stages.stage_5_thumbnail.logic import (
    generate_thumbnail_prompt,
    generate_thumbnail_image,
    revert_thumbnail_image,
)

router = APIRouter(prefix="/api/episodes/{ep_id}/thumbnail", tags=["thumbnail"])


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
    """Auto-generate a thumbnail prompt from the episode story."""
    state = _load_state(ep_id)
    try:
        prompt = generate_thumbnail_prompt(state)
    except Exception as e:
        raise HTTPException(500, f"Prompt generation failed: {e}")

    state.thumbnail.prompt = prompt
    state.current_stage = "stage_5_thumbnail"
    _save_state(ep_id, state)
    return state.thumbnail.model_dump()


class PromptRequest(BaseModel):
    prompt: str


@router.put("/prompt")
async def update_prompt(ep_id: str, req: PromptRequest):
    state = _load_state(ep_id)
    state.thumbnail.prompt = req.prompt
    _save_state(ep_id, state)
    return state.thumbnail.model_dump()


@router.post("/generate")
async def generate(ep_id: str):
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY not configured in .env")

    state = _load_state(ep_id)
    if not state.thumbnail.prompt:
        raise HTTPException(400, "Thumbnail prompt is empty")

    try:
        image_file = generate_thumbnail_image(state)
    except Exception as e:
        raise HTTPException(500, f"Thumbnail generation failed: {e}")

    state.thumbnail.image_file = image_file
    state.thumbnail.generated = True
    state.current_stage = "stage_5_thumbnail"
    _save_state(ep_id, state)
    return state.thumbnail.model_dump()


@router.delete("/revert")
async def revert(ep_id: str):
    state = _load_state(ep_id)
    revert_thumbnail_image(state)
    state.thumbnail.image_file = ""
    state.thumbnail.generated = False
    _save_state(ep_id, state)
    return {"reverted": True}


@router.post("/approve")
async def approve(ep_id: str):
    state = _load_state(ep_id)
    if not state.thumbnail.generated:
        raise HTTPException(400, "Must generate thumbnail before approving")

    state.thumbnail.approved = True
    state.current_stage = "stage_5_thumbnail_complete"
    _save_state(ep_id, state)
    return {"approved": True, "current_stage": state.current_stage}
