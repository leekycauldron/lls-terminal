import json
import shutil

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config import EPISODES_DIR, TEMPLATES_DIR
from models import EpisodeState, TimelineClip, IntroData
from stages.stage_4_stitch.logic import initialize_timeline, calculate_total_duration, generate_srt
from services.ffmpeg import build_video
from services.elevenlabs import generate_tts
from services.llm import generate_json

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

    # Set default intro TTS text if not already set
    ep_num = int(ep_id.replace("ep_", ""))
    seed = state.script.seed
    if not state.timeline.intro.tts_text:
        state.timeline.intro.tts_text = f"第{ep_num}集：{seed}"

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


@router.post("/intro/upload-image")
async def upload_intro_image(ep_id: str, file: UploadFile = File(...)):
    state = _load_state(ep_id)
    ep_dir = EPISODES_DIR / ep_id
    image_path = ep_dir / "intro.png"
    contents = await file.read()
    image_path.write_bytes(contents)
    state.timeline.intro.image_file = "intro.png"
    state.timeline.intro.image_uploaded = True
    _save_state(ep_id, state)
    return state.timeline.intro.model_dump()


class IntroUpdateRequest(BaseModel):
    title_zh: str | None = None
    title_en: str | None = None
    character_id: str | None = None
    tts_text: str | None = None


@router.put("/intro")
async def update_intro(ep_id: str, req: IntroUpdateRequest):
    state = _load_state(ep_id)
    if req.title_zh is not None:
        state.timeline.intro.title_zh = req.title_zh
    if req.title_en is not None:
        state.timeline.intro.title_en = req.title_en
    if req.character_id is not None:
        state.timeline.intro.character_id = req.character_id
    if req.tts_text is not None:
        state.timeline.intro.tts_text = req.tts_text
    _save_state(ep_id, state)
    return state.timeline.intro.model_dump()


@router.post("/intro/generate-title")
async def generate_intro_title(ep_id: str):
    state = _load_state(ep_id)
    seed = state.script.seed
    script_lines = "\n".join(
        f"{l.character_id}: {l.text_zh}" for l in state.script.lines
    )

    result = generate_json(
        system="You are a bilingual Chinese/English title writer for a Mandarin learning show. Return JSON only.",
        user=(
            f"Generate a short, catchy episode title in both Mandarin Chinese and English "
            f"for an episode about: {seed}\n\n"
            f"Script excerpt:\n{script_lines[:1000]}\n\n"
            f"Return JSON: {{\"title_zh\": \"...\", \"title_en\": \"...\"}}\n"
            f"Keep titles concise (2-6 words each). The Chinese title should be natural Mandarin."
        ),
        max_tokens=256,
    )

    ep_num = int(ep_id.replace("ep_", ""))
    title_zh = result.get("title_zh", seed)
    title_en = result.get("title_en", seed)

    state.timeline.intro.title_zh = title_zh
    state.timeline.intro.title_en = title_en
    # Update TTS text to use the generated title
    state.timeline.intro.tts_text = f"第{ep_num}集：{title_zh}"
    _save_state(ep_id, state)
    return state.timeline.intro.model_dump()


@router.post("/intro/generate-tts")
async def generate_intro_tts(ep_id: str):
    state = _load_state(ep_id)
    intro = state.timeline.intro

    if not intro.character_id:
        raise HTTPException(400, "No character selected for intro")
    if not intro.tts_text:
        raise HTTPException(400, "No TTS text for intro")

    char = state.context.characters.get(intro.character_id)
    if not char:
        raise HTTPException(404, f"Character {intro.character_id} not found")

    voice_id = char.get("voice_id", "")
    if not voice_id:
        raise HTTPException(400, f"Character {intro.character_id} has no voice_id")

    ep_dir = EPISODES_DIR / ep_id
    audio_path = ep_dir / "audio" / "intro.mp3"
    duration_ms = generate_tts(voice_id, intro.tts_text, audio_path)

    state.timeline.intro.audio_file = "audio/intro.mp3"
    state.timeline.intro.audio_duration_ms = duration_ms
    state.timeline.intro.tts_generated = True
    _save_state(ep_id, state)
    return state.timeline.intro.model_dump()


def _calc_intro_duration_ms(intro: IntroData) -> int:
    """Calculate intro scene duration: max(audio + 1500, 3000) ms."""
    return max(intro.audio_duration_ms + 1500, 3000)


@router.post("/export")
async def export_video(ep_id: str):
    state = _load_state(ep_id)
    if not state.timeline.clips:
        raise HTTPException(400, "No clips in timeline")

    ep_dir = EPISODES_DIR / ep_id
    export_clips = [c.model_dump() for c in state.timeline.clips]
    intro = state.timeline.intro

    # Prepend intro if image uploaded and TTS generated
    if intro.image_uploaded and intro.tts_generated:
        intro_duration = _calc_intro_duration_ms(intro)
        # Offset all existing clips by intro duration
        for c in export_clips:
            c["start_ms"] += intro_duration
        # Prepend intro scene clip
        export_clips.insert(0, {
            "id": "intro_scene",
            "type": "scene",
            "source_id": "intro",
            "source_file": intro.image_file,
            "track": "scenes",
            "start_ms": 0,
            "duration_ms": intro_duration,
            "order": -2,
            "zoom_start": 1.0,
            "zoom_end": 1.0,
        })
        # Prepend intro audio clip (start at 500ms)
        export_clips.insert(1, {
            "id": "intro_audio",
            "type": "audio",
            "source_id": "intro",
            "source_file": intro.audio_file,
            "track": "audio",
            "start_ms": 500,
            "duration_ms": intro.audio_duration_ms,
            "order": -1,
            "zoom_start": 1.0,
            "zoom_end": 1.0,
        })

    # Append outro (always)
    outro_src = TEMPLATES_DIR / "outro.png"
    outro_dest = ep_dir / "outro.png"
    if outro_src.exists() and not outro_dest.exists():
        shutil.copy2(outro_src, outro_dest)
    if outro_dest.exists():
        # Find the end of all current clips
        last_end = max(c["start_ms"] + c["duration_ms"] for c in export_clips)
        export_clips.append({
            "id": "outro_scene",
            "type": "scene",
            "source_id": "outro",
            "source_file": "outro.png",
            "track": "scenes",
            "start_ms": last_end,
            "duration_ms": 5000,
            "order": 9999,
            "zoom_start": 1.0,
            "zoom_end": 1.0,
        })

    output_path = build_video(export_clips, ep_dir)

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


@router.get("/captions")
async def download_captions(ep_id: str):
    state = _load_state(ep_id)
    if not state.timeline.clips:
        raise HTTPException(400, "No clips in timeline")

    # Compute intro offset for SRT timecodes
    intro = state.timeline.intro
    offset_ms = 0
    if intro.image_uploaded and intro.tts_generated:
        offset_ms = _calc_intro_duration_ms(intro)

    srt_content = generate_srt(state, offset_ms=offset_ms)
    ep_dir = EPISODES_DIR / ep_id
    srt_path = ep_dir / "captions.srt"
    srt_path.write_text(srt_content, encoding="utf-8")

    return FileResponse(
        path=str(srt_path),
        media_type="text/plain",
        filename=f"{ep_id}_captions.srt",
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
