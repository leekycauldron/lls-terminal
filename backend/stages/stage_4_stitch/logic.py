import uuid

from config import EPISODES_DIR
from models import EpisodeState, TimelineClip
from services.ffmpeg import get_audio_duration_ms


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
