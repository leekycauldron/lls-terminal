import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from config import EPISODES_DIR
from models import EpisodeState, TimelineClip
from stages.stage_4_stitch.logic import initialize_timeline, calculate_total_duration
from services.ffmpeg import build_video

router = APIRouter(prefix="/api/episodes/{ep_id}/timeline", tags=["timeline"])


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
    clips = initialize_timeline(state)
    state.timeline.clips = clips
    state.timeline.total_duration_ms = calculate_total_duration(clips)
    state.current_stage = "stage_4_stitch"
    _save_state(ep_id, state)
    return state.timeline.model_dump()


@router.put("/clips")
async def update_clips(ep_id: str, clips: list[TimelineClip]):
    state = _load_state(ep_id)
    state.timeline.clips = clips
    state.timeline.total_duration_ms = calculate_total_duration(clips)
    _save_state(ep_id, state)
    return [c.model_dump() for c in clips]


@router.put("/clips/{clip_id}")
async def update_clip(ep_id: str, clip_id: str, updates: dict):
    state = _load_state(ep_id)
    clip = next((c for c in state.timeline.clips if c.id == clip_id), None)
    if not clip:
        raise HTTPException(404, f"Clip {clip_id} not found")

    for key, value in updates.items():
        if hasattr(clip, key):
            setattr(clip, key, value)

    state.timeline.total_duration_ms = calculate_total_duration(state.timeline.clips)
    _save_state(ep_id, state)
    return clip.model_dump()


@router.post("/export")
async def export_video(ep_id: str):
    state = _load_state(ep_id)
    if not state.timeline.clips:
        raise HTTPException(400, "No clips in timeline")

    ep_dir = EPISODES_DIR / ep_id
    clip_dicts = [c.model_dump() for c in state.timeline.clips]

    output_path = build_video(clip_dicts, ep_dir)

    state.timeline.output_file = str(output_path.relative_to(ep_dir))
    state.timeline.total_duration_ms = calculate_total_duration(state.timeline.clips)
    _save_state(ep_id, state)

    return {
        "output_file": state.timeline.output_file,
        "total_duration_ms": state.timeline.total_duration_ms,
    }


@router.get("/download")
async def download_video(ep_id: str):
    state = _load_state(ep_id)
    if not state.timeline.output_file:
        raise HTTPException(400, "No exported video yet")

    output_path = EPISODES_DIR / ep_id / state.timeline.output_file
    if not output_path.exists():
        raise HTTPException(404, "Video file not found")

    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename=f"{ep_id}_output.mp4",
    )


@router.post("/approve")
async def approve(ep_id: str):
    state = _load_state(ep_id)
    if not state.timeline.output_file:
        raise HTTPException(400, "Must export video before approving")

    state.timeline.approved = True
    state.current_stage = "stage_5_thumbnail"
    _save_state(ep_id, state)
    return {"approved": True, "current_stage": state.current_stage}
