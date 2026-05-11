import json
import subprocess
from pathlib import Path

import httpx

from config import ELEVENLABS_API_KEY

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"


ELEVENLABS_SPEED_MIN = 0.7
ELEVENLABS_SPEED_MAX = 1.2


def generate_tts(voice_id: str, text: str, output_path: Path, speed: float = 1.0) -> int:
    """Generate TTS audio via ElevenLabs API. Returns duration in ms.

    Speed is split into two stages:
    - The native ElevenLabs range (0.7-1.2) is sent to the API directly.
    - Any remaining factor outside that range is applied post-generation
      via ffmpeg atempo filter, preserving pitch.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    speed = max(0.25, min(4.0, speed))

    # Clamp the API portion to ElevenLabs' native range
    api_speed = max(ELEVENLABS_SPEED_MIN, min(ELEVENLABS_SPEED_MAX, speed))
    # Remaining factor to apply via ffmpeg (e.g. speed=0.5, api=0.7 → post=0.5/0.7)
    post_factor = speed / api_speed

    response = httpx.post(
        f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        json={
            "text": text,
            "model_id": "eleven_v3",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "speed": api_speed,
            },
        },
        timeout=60.0,
    )
    response.raise_for_status()

    output_path.write_bytes(response.content)

    # Apply post-generation speed adjustment if needed
    if abs(post_factor - 1.0) > 0.01:
        _apply_atempo(output_path, post_factor)

    return get_audio_duration_ms(output_path)


def _apply_atempo(audio_path: Path, factor: float) -> None:
    """Adjust audio speed using ffmpeg atempo filter.

    atempo only accepts values in [0.5, 100.0], so for factors below 0.5
    we chain multiple atempo filters.
    """
    # Build atempo filter chain — each filter clamped to [0.5, 100.0]
    filters = []
    remaining = factor
    while remaining < 0.5:
        filters.append("atempo=0.5")
        remaining /= 0.5
    filters.append(f"atempo={remaining:.4f}")

    tmp_path = audio_path.with_suffix(".tmp.mp3")
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(audio_path),
            "-af", ",".join(filters),
            "-c:a", "libmp3lame",
            "-q:a", "2",
            str(tmp_path),
        ],
        check=True,
        capture_output=True,
    )
    tmp_path.replace(audio_path)


def get_audio_duration_ms(path: Path) -> int:
    """Get audio duration in milliseconds using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            str(path),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    info = json.loads(result.stdout)
    duration_s = float(info["format"]["duration"])
    return int(duration_s * 1000)
