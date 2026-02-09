import json
import subprocess
from pathlib import Path

import httpx

from config import ELEVENLABS_API_KEY

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"


def generate_tts(voice_id: str, text: str, output_path: Path, speed: float = 1.0) -> int:
    """Generate TTS audio via ElevenLabs API. Returns duration in ms."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    response = httpx.post(
        f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "speed": max(0.25, min(4.0, speed)),
            },
        },
        timeout=60.0,
    )
    response.raise_for_status()

    output_path.write_bytes(response.content)
    return get_audio_duration_ms(output_path)


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
    )
    info = json.loads(result.stdout)
    duration_s = float(info["format"]["duration"])
    return int(duration_s * 1000)
