import uuid

from config import EPISODES_DIR
from models import EpisodeState, ScriptLine, TimelineClip
from services.ffmpeg import get_audio_duration_ms


def _ms_to_srt_time(ms: int) -> str:
    """Convert milliseconds to SRT timecode format HH:MM:SS,mmm."""
    hours = ms // 3_600_000
    ms %= 3_600_000
    minutes = ms // 60_000
    ms %= 60_000
    seconds = ms // 1_000
    millis = ms % 1_000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"


def generate_srt(state: EpisodeState, offset_ms: int = 0) -> str:
    """Generate SRT caption content with zh / pinyin / en lines per entry."""
    audio_clips = sorted(
        [c for c in state.timeline.clips if c.type == "audio"],
        key=lambda c: c.start_ms,
    )
    lines_by_id: dict[str, ScriptLine] = {
        line.id: line for line in state.script.lines
    }

    entries: list[str] = []
    for idx, clip in enumerate(audio_clips, start=1):
        line = lines_by_id.get(clip.source_id)
        if not line:
            continue
        start = _ms_to_srt_time(clip.start_ms + offset_ms)
        end = _ms_to_srt_time(clip.start_ms + clip.duration_ms + offset_ms)
        entries.append(
            f"{idx}\n{start} --> {end}\n{line.text_zh}\n{line.text_pinyin}\n{line.text_en}"
        )

    return "\n\n".join(entries) + "\n"


def initialize_timeline(state: EpisodeState) -> list[TimelineClip]:
    """Auto-populate timeline from scenes and audio."""
    clips: list[TimelineClip] = []
    ep_dir = EPISODES_DIR / state.id

    # Scene clips: each scene gets a clip, laid out sequentially
    current_ms = 0
    scene_order = 0
    for scene in sorted(state.scenes.scenes, key=lambda s: s.order):
        # Calculate duration: sum of audio for lines in this scene, minimum 3s
        scene_duration = 3000
        for line_id in scene.line_ids:
            tts_status = next(
                (ls for ls in state.tts.line_statuses if ls.line_id == line_id), None
            )
            if tts_status and tts_status.duration_ms:
                scene_duration += tts_status.duration_ms

        clips.append(TimelineClip(
            id=str(uuid.uuid4())[:8],
            type="scene",
            source_id=scene.id,
            source_file=scene.image_file,
            track="scenes",
            start_ms=current_ms,
            duration_ms=scene_duration,
            order=scene_order,
            zoom_start=1.0,
            zoom_end=1.3,
        ))
        scene_order += 1
        current_ms += scene_duration

    # Audio clips: position each line's audio within its scene
    audio_order = 0
    for scene in sorted(state.scenes.scenes, key=lambda s: s.order):
        # Find the scene clip to get its start time
        scene_clip = next(
            (c for c in clips if c.source_id == scene.id and c.track == "scenes"), None
        )
        if not scene_clip:
            continue

        offset = scene_clip.start_ms + 500  # 500ms padding at scene start
        for line_id in scene.line_ids:
            tts_status = next(
                (ls for ls in state.tts.line_statuses if ls.line_id == line_id), None
            )
            if not tts_status or not tts_status.generated:
                continue

            audio_path = ep_dir / tts_status.audio_file
            duration = tts_status.duration_ms
            if audio_path.exists() and duration == 0:
                duration = get_audio_duration_ms(audio_path)

            clips.append(TimelineClip(
                id=str(uuid.uuid4())[:8],
                type="audio",
                source_id=line_id,
                source_file=tts_status.audio_file,
                track="audio",
                start_ms=offset,
                duration_ms=duration,
                order=audio_order,
            ))
            audio_order += 1
            offset += duration + 300  # 300ms gap between lines

    return clips


def calculate_total_duration(clips: list[TimelineClip]) -> int:
    """Calculate total timeline duration from clips."""
    if not clips:
        return 0
    return max(c.start_ms + c.duration_ms for c in clips)
