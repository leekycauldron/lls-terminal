import base64
from pathlib import Path

import httpx
from openai import OpenAI

from config import OPENAI_API_KEY

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY, timeout=httpx.Timeout(180.0))
    return _client


def generate_scene_image(
    prompt: str,
    setting_reference: str | None,
    character_references: list[str] | None,
    output_path: Path,
) -> None:
    """Generate a scene image using OpenAI gpt-image-1 with reference images."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    client = get_client()

    # Collect reference image paths
    ref_paths: list[Path] = []
    if setting_reference:
        p = Path(setting_reference)
        if p.exists():
            ref_paths.append(p)
    if character_references:
        for ref in character_references:
            p = Path(ref)
            if p.exists():
                ref_paths.append(p)

    if ref_paths:
        # Use images.edit with reference images for visual continuity
        image_files = [open(str(p), "rb") for p in ref_paths]
        try:
            response = client.images.edit(
                model="gpt-image-1",
                image=image_files,
                prompt=prompt,
                n=1,
                size="1536x1024",
            )
        finally:
            for f in image_files:
                f.close()
    else:
        # No references, use generate
        response = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            n=1,
            size="1536x1024",
        )

    # Decode and save
    image_b64 = response.data[0].b64_json
    output_path.write_bytes(base64.standard_b64decode(image_b64))
