import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import EPISODES_DIR, OPENAI_API_KEY
from models import EpisodeState, Scene
from stages.stage_3_scenes.logic import (
    generate_scene_breakdown,
    generate_single_scene_image,
    revert_scene_image,
)

router = APIRouter(prefix="/api/episodes/{ep_id}/scenes", tags=["scenes"])


def _load_state(ep_id: str) -> EpisodeState:
    state_path = EPISODES_DIR / ep_id / "state.json"
    if not state_path.exists():
        raise HTTPException(404, f"Episode {ep_id} not found")
    return EpisodeState(**json.loads(state_path.read_text()))


def _save_state(ep_id: str, state: EpisodeState) -> None:
    state_path = EPISODES_DIR / ep_id / "state.json"
    state_path.write_text(state.model_dump_json(indent=2))


@router.post("/generate-breakdown")
async def breakdown(ep_id: str):
    state = _load_state(ep_id)
    scenes = generate_scene_breakdown(state)
    state.scenes.scenes = scenes
    state.current_stage = "stage_3_scenes"
    _save_state(ep_id, state)
    return state.scenes.model_dump()


@router.put("/scenes")
async def update_scenes(ep_id: str, scenes: list[Scene]):
    state = _load_state(ep_id)
    state.scenes.scenes = scenes
    _save_state(ep_id, state)
    return [s.model_dump() for s in scenes]


@router.post("/scenes")
async def add_scene(ep_id: str, scene: Scene):
    state = _load_state(ep_id)
    state.scenes.scenes.append(scene)
    # Reorder
    state.scenes.scenes.sort(key=lambda s: s.order)
    _save_state(ep_id, state)
    return [s.model_dump() for s in state.scenes.scenes]


@router.delete("/scenes/{scene_id}")
async def delete_scene(ep_id: str, scene_id: str):
    state = _load_state(ep_id)
    scene = next((s for s in state.scenes.scenes if s.id == scene_id), None)
    if not scene:
        raise HTTPException(404, f"Scene {scene_id} not found")
    if scene.generated:
        raise HTTPException(400, "Cannot delete scene with generated image. Revert first.")
    state.scenes.scenes = [s for s in state.scenes.scenes if s.id != scene_id]
    for i, s in enumerate(state.scenes.scenes):
        s.order = i
    _save_state(ep_id, state)
    return [s.model_dump() for s in state.scenes.scenes]


@router.post("/generate-image/{scene_id}")
async def gen_image(ep_id: str, scene_id: str):
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY not configured in .env")

    state = _load_state(ep_id)
    scene = next((s for s in state.scenes.scenes if s.id == scene_id), None)
    if not scene:
        raise HTTPException(404, f"Scene {scene_id} not found")

    try:
        image_file = generate_single_scene_image(state, scene)
    except Exception as e:
        raise HTTPException(500, f"Image generation failed for scene {scene_id}: {e}")

    scene.image_file = image_file
    scene.generated = True
    _save_state(ep_id, state)
    return scene.model_dump()


@router.post("/generate-all-images")
async def gen_all_images(ep_id: str):
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY not configured in .env")

    state = _load_state(ep_id)
    results = []
    for scene in state.scenes.scenes:
        if scene.generated:
            results.append(scene.model_dump())
            continue
        try:
            image_file = generate_single_scene_image(state, scene)
        except Exception as e:
            raise HTTPException(500, f"Image generation failed for scene {scene.id}: {e}")
        scene.image_file = image_file
        scene.generated = True
        _save_state(ep_id, state)
        results.append(scene.model_dump())
    return results


@router.delete("/revert-image/{scene_id}")
async def revert_image(ep_id: str, scene_id: str):
    state = _load_state(ep_id)
    scene = next((s for s in state.scenes.scenes if s.id == scene_id), None)
    if not scene:
        raise HTTPException(404, f"Scene {scene_id} not found")

    revert_scene_image(state, scene)
    scene.image_file = ""
    scene.generated = False
    _save_state(ep_id, state)
    return {"reverted": True, "scene_id": scene_id}


class ModeRequest(BaseModel):
    mode: str


@router.put("/mode")
async def set_mode(ep_id: str, req: ModeRequest):
    state = _load_state(ep_id)
    if req.mode not in ("manual", "auto"):
        raise HTTPException(400, "Mode must be 'manual' or 'auto'")
    state.scenes.mode = req.mode
    _save_state(ep_id, state)
    return {"mode": state.scenes.mode}


@router.post("/approve")
async def approve(ep_id: str):
    state = _load_state(ep_id)
    for scene in state.scenes.scenes:
        if not scene.generated:
            raise HTTPException(400, f"Scene {scene.id} does not have an image generated")

    state.scenes.approved = True
    state.current_stage = "stage_4_stitch"
    _save_state(ep_id, state)
    return {"approved": True, "current_stage": state.current_stage}
