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


START_PAD = 500
LINE_GAP = 300


def _scene_audio_durations(scene, tts_statuses):
    """Get list of audio durations for lines in a scene."""
    durations = []
    for line_id in scene.line_ids:
        tts = next((ls for ls in tts_statuses if ls.line_id == line_id), None)
        if tts and tts.duration_ms:
            durations.append(tts.duration_ms)
    return durations


def _calc_scene_duration(audio_durations: list[int], scene_gap_ms: int) -> int:
    """Calculate scene clip duration from its audio and the desired gap."""
    n = len(audio_durations)
    audio_span = sum(audio_durations) + LINE_GAP * max(0, n - 1)
    scene_end_pad = max(0, scene_gap_ms - START_PAD)
    return max(START_PAD + audio_span + scene_end_pad, scene_gap_ms)


def initialize_timeline(state: EpisodeState, scene_gap_ms: int = 1000) -> list[TimelineClip]:
    """Auto-populate timeline from scenes and audio."""
    clips: list[TimelineClip] = []
    ep_dir = EPISODES_DIR / state.id

    # Scene clips: each scene gets a clip, laid out sequentially
    current_ms = 0
    scene_order = 0
    for scene in sorted(state.scenes.scenes, key=lambda s: s.order):
        audio_durations = _scene_audio_durations(scene, state.tts.line_statuses)
        scene_duration = _calc_scene_duration(audio_durations, scene_gap_ms)

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
            zoom_end=1.1,
        ))
        scene_order += 1
        current_ms += scene_duration

    # Audio clips: position each line's audio within its scene
    audio_order = 0
    for scene in sorted(state.scenes.scenes, key=lambda s: s.order):
        scene_clip = next(
            (c for c in clips if c.source_id == scene.id and c.track == "scenes"), None
        )
        if not scene_clip:
            continue

        offset = scene_clip.start_ms + START_PAD
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
            offset += duration + LINE_GAP

    return clips


def reflow_timeline(state: EpisodeState, scene_gap_ms: int) -> list[TimelineClip]:
    """Reposition all clips using the new scene gap, preserving zoom settings."""
    clips = state.timeline.clips
    scenes = sorted(state.scenes.scenes, key=lambda s: s.order)

    # Build lookup of existing scene clip zoom settings
    zoom_by_scene: dict[str, tuple[float, float]] = {}
    for c in clips:
        if c.track == "scenes":
            zoom_by_scene[c.source_id] = (c.zoom_start, c.zoom_end)

    # Build lookup of audio durations from existing clips
    audio_dur_by_line: dict[str, int] = {}
    audio_file_by_line: dict[str, str] = {}
    for c in clips:
        if c.track == "audio":
            audio_dur_by_line[c.source_id] = c.duration_ms
            audio_file_by_line[c.source_id] = c.source_file

    new_clips: list[TimelineClip] = []
    current_ms = 0
    scene_order = 0

    for scene in scenes:
        # Get audio durations for this scene's lines
        audio_durations = []
        for line_id in scene.line_ids:
            if line_id in audio_dur_by_line:
                audio_durations.append(audio_dur_by_line[line_id])

        scene_duration = _calc_scene_duration(audio_durations, scene_gap_ms)
        zoom = zoom_by_scene.get(scene.id, (1.0, 1.1))

        new_clips.append(TimelineClip(
            id=str(uuid.uuid4())[:8],
            type="scene",
            source_id=scene.id,
            source_file=scene.image_file,
            track="scenes",
            start_ms=current_ms,
            duration_ms=scene_duration,
            order=scene_order,
            zoom_start=zoom[0],
            zoom_end=zoom[1],
        ))
        scene_order += 1
        current_ms += scene_duration

    # Re-lay audio clips within scenes
    audio_order = 0
    for scene in scenes:
        scene_clip = next(
            (c for c in new_clips if c.source_id == scene.id and c.track == "scenes"), None
        )
        if not scene_clip:
            continue

        offset = scene_clip.start_ms + START_PAD
        for line_id in scene.line_ids:
            if line_id not in audio_dur_by_line:
                continue
            duration = audio_dur_by_line[line_id]
            source_file = audio_file_by_line[line_id]

            new_clips.append(TimelineClip(
                id=str(uuid.uuid4())[:8],
                type="audio",
                source_id=line_id,
                source_file=source_file,
                track="audio",
                start_ms=offset,
                duration_ms=duration,
                order=audio_order,
            ))
            audio_order += 1
            offset += duration + LINE_GAP

    return new_clips


def calculate_total_duration(clips: list[TimelineClip]) -> int:
    """Calculate total timeline duration from clips."""
    if not clips:
        return 0
    return max(c.start_ms + c.duration_ms for c in clips)
