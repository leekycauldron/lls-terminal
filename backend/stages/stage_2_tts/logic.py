from pathlib import Path

from config import EPISODES_DIR
from models import EpisodeState, TTSLineStatus
from services.elevenlabs import generate_tts


def initialize_tts(state: EpisodeState) -> list[TTSLineStatus]:
    """Create a TTSLineStatus for each script line."""
    statuses = []
    for line in state.script.lines:
        existing = next(
            (ls for ls in state.tts.line_statuses if ls.line_id == line.id), None
        )
        if existing:
            statuses.append(existing)
        else:
            statuses.append(TTSLineStatus(line_id=line.id))
    return statuses


def generate_line_tts(state: EpisodeState, line_id: str) -> TTSLineStatus:
    """Generate TTS for a single script line."""
    line = next((l for l in state.script.lines if l.id == line_id), None)
    if not line:
        raise ValueError(f"Line {line_id} not found in script")

    character = state.context.characters.get(line.character_id)
    if not character:
        raise ValueError(f"Character {line.character_id} not found")

    voice_id = character.get("voice_id", "")
    if not voice_id:
        raise ValueError(f"No voice_id for character {line.character_id}")

    ep_dir = EPISODES_DIR / state.id
    audio_dir = ep_dir / "audio"
    audio_file = f"audio/line_{line_id}.mp3"
    output_path = ep_dir / audio_file

    duration_ms = generate_tts(voice_id, line.text_zh, output_path)

    return TTSLineStatus(
        line_id=line_id,
        audio_file=audio_file,
        duration_ms=duration_ms,
        generated=True,
    )


def revert_line_tts(state: EpisodeState, line_id: str) -> None:
    """Delete audio file for a line."""
    status = next(
        (ls for ls in state.tts.line_statuses if ls.line_id == line_id), None
    )
    if status and status.audio_file:
        audio_path = EPISODES_DIR / state.id / status.audio_file
        if audio_path.exists():
            audio_path.unlink()
