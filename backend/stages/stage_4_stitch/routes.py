import json
import shutil

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config import EPISODES_DIR, TEMPLATES_DIR
from models import EpisodeState, TimelineClip, IntroData
from stages.stage_4_stitch.logic import initialize_timeline, reflow_timeline, calculate_total_duration, generate_srt
from services.ffmpeg import build_video, get_audio_duration_ms
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
    scene_gap_ms = state.timeline.scene_gap_ms
    clips = initialize_timeline(state, scene_gap_ms=scene_gap_ms)
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


class ReflowRequest(BaseModel):
    scene_gap_ms: int


@router.post("/reflow")
async def reflow(ep_id: str, req: ReflowRequest):
    state = _load_state(ep_id)
    scene_gap_ms = max(200, min(3000, req.scene_gap_ms))
    clips = reflow_timeline(state, scene_gap_ms)
    state.timeline.clips = clips
    state.timeline.scene_gap_ms = scene_gap_ms
    state.timeline.total_duration_ms = calculate_total_duration(clips)
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


@router.post("/intro/upload-video")
async def upload_intro_video(ep_id: str, file: UploadFile = File(...)):
    state = _load_state(ep_id)
    ep_dir = EPISODES_DIR / ep_id
    video_path = ep_dir / "intro_video.mp4"
    contents = await file.read()
    video_path.write_bytes(contents)
    duration_ms = get_audio_duration_ms(video_path)
    state.timeline.intro.video_file = "intro_video.mp4"
    state.timeline.intro.video_uploaded = True
    state.timeline.intro.video_duration_ms = duration_ms
    _save_state(ep_id, state)
    return state.timeline.intro.model_dump()


class IntroUpdateRequest(BaseModel):
    title_zh: str | None = None
    title_en: str | None = None
    title_pinyin: str | None = None
    character_id: str | None = None
    tts_text: str | None = None
    speed: float | None = None


@router.put("/intro")
async def update_intro(ep_id: str, req: IntroUpdateRequest):
    state = _load_state(ep_id)
    if req.title_zh is not None:
        state.timeline.intro.title_zh = req.title_zh
    if req.title_en is not None:
        state.timeline.intro.title_en = req.title_en
    if req.title_pinyin is not None:
        state.timeline.intro.title_pinyin = req.title_pinyin
    if req.character_id is not None:
        state.timeline.intro.character_id = req.character_id
    if req.tts_text is not None:
        state.timeline.intro.tts_text = req.tts_text
    if req.speed is not None:
        state.timeline.intro.speed = max(0.25, min(4.0, req.speed))
    _save_state(ep_id, state)
    return state.timeline.intro.model_dump()


@router.post("/intro/generate-title")
async def generate_intro_title(ep_id: str):
    state = _load_state(ep_id)
    idea = state.script.idea or state.script.seed
    script_lines = "\n".join(
        f"{l.character_id}: {l.text_en}" for l in state.script.lines
    )

    # Build character name list for the English title
    char_names = []
    for char_id in set(l.character_id for l in state.script.lines):
        char = state.context.characters.get(char_id)
        role = char.get("role", "") if char else ""
        char_names.append(f"{char_id} ({role})")
    char_list = ", ".join(char_names)

    result = generate_json(
        system="You are a bilingual Chinese/English title writer for a Mandarin learning show. Return JSON only.",
        user=(
            f"Generate a short, catchy episode title in Mandarin Chinese, pinyin, and English.\n\n"
            f"Characters: {char_list}\n\n"
            f"Episode story: {idea}\n\n"
            f"Script dialogue:\n{script_lines[:2000]}\n\n"
            f'Return JSON: {{"title_zh": "...", "title_pinyin": "...", "title_en": "..."}}\n'
            f"Rules:\n"
            f"- The title should be specific to THIS episode's plot, not generic\n"
            f"- Reference a concrete moment, object, or conflict from the story (e.g. '作业去哪了？' not '学习的一天')\n"
            f"- Make it fun and intriguing — something a kid would click on\n"
            f"- 2-6 words each. The Chinese title should be natural Mandarin with proper tone marks in pinyin\n"
            f"- The English title MUST use pinyin names for characters (e.g. 'Sīyuán's Hidden Talent' not 'Steven's Hidden Talent')\n"
            f"- Use the actual pinyin of the Chinese name with tone marks (思源 = Sīyuán, 思琪 = Sīqí, 佳敏 = Jiāmǐn, 明浩 = Mínghào, 南珍 = Nánzhēn)"
        ),
        max_tokens=256,
    )

    ep_num = int(ep_id.replace("ep_", ""))
    title_zh = result.get("title_zh", state.script.seed)
    title_en = result.get("title_en", state.script.seed)
    title_pinyin = result.get("title_pinyin", "")

    state.timeline.intro.title_zh = title_zh
    state.timeline.intro.title_en = title_en
    state.timeline.intro.title_pinyin = title_pinyin
    # Update TTS text to use the generated title
    state.timeline.intro.tts_text = f"第{ep_num}集：{title_zh}"
    _save_state(ep_id, state)
    return state.timeline.intro.model_dump()


class FixTitleRequest(BaseModel):
    source_field: str | None = None


@router.post("/intro/fix-title")
async def fix_intro_title(ep_id: str, req: FixTitleRequest):
    """Translate the edited title field into the other two fields."""
    state = _load_state(ep_id)
    intro = state.timeline.intro
    source = req.source_field or "title_en"

    field_labels = {
        "title_zh": "Chinese",
        "title_pinyin": "Pinyin",
        "title_en": "English",
    }
    source_label = field_labels.get(source, "English")
    source_value = getattr(intro, source, "")
    targets = [f for f in ("title_zh", "title_pinyin", "title_en") if f != source]
    target_labels = " and ".join(field_labels[t] for t in targets)

    result = generate_json(
        system="You are a translator. You ONLY output JSON. No explanation, no markdown, no commentary.",
        user=(
            f'The user wrote this {source_label} episode title: "{source_value}"\n'
            f'Translate it into {target_labels}. Pinyin must have tone marks.\n'
            f'Keep character names in pinyin for English (思源=Sīyuán, 思琪=Sīqí, 佳敏=Jiāmǐn, 明浩=Mínghào, 南珍=Nánzhēn).\n\n'
            f'{{"title_zh": "...", "title_pinyin": "...", "title_en": "..."}}'
        ),
        max_tokens=128,
    )

    ep_num = int(ep_id.replace("ep_", ""))
    # Keep the source field unchanged, only update the others
    for field in targets:
        setattr(state.timeline.intro, field, result.get(field, getattr(intro, field)))
    state.timeline.intro.tts_text = f"第{ep_num}集：{state.timeline.intro.title_zh}"
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
    speed = intro.speed if intro.speed != 1.0 else state.tts.speed
    duration_ms = generate_tts(voice_id, intro.tts_text, audio_path, speed=speed)

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

    # Prepend intro if we have TTS and either video or image
    has_video_intro = intro.video_uploaded and intro.tts_generated
    has_image_intro = intro.image_uploaded and intro.tts_generated
    if has_video_intro or has_image_intro:
        if has_video_intro:
            intro_source = intro.video_file
            intro_duration = intro.video_duration_ms
        else:
            intro_source = intro.image_file
            intro_duration = _calc_intro_duration_ms(intro)
        # Offset all existing clips by intro duration
        for c in export_clips:
            c["start_ms"] += intro_duration
        # Prepend intro scene clip (zoom to match scene clips for smooth transition)
        export_clips.insert(0, {
            "id": "intro_scene",
            "type": "scene",
            "source_id": "intro",
            "source_file": intro_source,
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
    if intro.video_uploaded and intro.tts_generated:
        offset_ms = intro.video_duration_ms
    elif intro.image_uploaded and intro.tts_generated:
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
