import base64
import logging
import time
from pathlib import Path

import httpx

from config import BFL_API_KEY, BFL_MODEL

log = logging.getLogger(__name__)

BFL_API_BASE = "https://api.bfl.ai/v1"


def _role_to_label(role: str) -> str:
    """Turn a role like 'Younger brother, 8 years old' into 'the young boy'."""
    r = role.lower()
    if "grandmother" in r or "grandma" in r:
        return "the grandmother"
    if "grandfather" in r or "grandpa" in r:
        return "the grandfather"
    if "mother" in r or "mom" in r:
        return "the mother"
    if "father" in r or "dad" in r:
        return "the father"
    if "sister" in r:
        return "the older girl"
    if "brother" in r:
        return "the young boy"
    if "girl" in r:
        return "the girl"
    if "boy" in r:
        return "the boy"
    if "woman" in r or "female" in r:
        return "the woman"
    if "man" in r or "male" in r:
        return "the man"
    return "the person"


def generate_scene_image(
    prompt: str,
    setting_reference: tuple[str, str] | None,
    character_references: list[tuple[str, str, str]] | None,
    output_path: Path,
) -> None:
    """Generate a scene image using BFL Flux 2 with optional reference images.

    setting_reference: (path, description) or None
    character_references: list of (path, name, role) or None
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    headers = {"x-key": BFL_API_KEY, "Content-Type": "application/json"}

    # Collect reference images as base64, tracking which image number each is
    ref_data: list[str] = []  # base64 strings in order
    # Track image numbers for building the prompt (1-indexed)
    setting_img_num: int | None = None
    char_img_entries: list[tuple[int, str, str]] = []  # (image_num, name, label)

    if setting_reference:
        p = Path(setting_reference[0])
        if p.exists():
            ref_data.append(base64.standard_b64encode(p.read_bytes()).decode())
            setting_img_num = len(ref_data)
            log.info(f"Setting ref loaded as image {setting_img_num}: {p} ({p.stat().st_size // 1024}KB)")
        else:
            log.warning(f"Setting ref NOT FOUND: {p}")

    if character_references:
        for path, name, role in character_references:
            p = Path(path)
            if p.exists():
                ref_data.append(base64.standard_b64encode(p.read_bytes()).decode())
                img_num = len(ref_data)
                # Build a short distinguishing label from the role, e.g. "the boy" "the mother"
                label = _role_to_label(role)
                char_img_entries.append((img_num, name, label))
                log.info(f"Character ref loaded as image {img_num} ({label}): {p} ({p.stat().st_size // 1024}KB)")
            else:
                log.warning(f"Character ref NOT FOUND: {p}")

    payload: dict = {
        "width": 1920,
        "height": 1072,
        "output_format": "png",
    }

    if ref_data:
        # Replace character names in the prompt with "the <label> from image N"
        edited_prompt = prompt
        for img_num, name, label in char_img_entries:
            edited_prompt = edited_prompt.replace(name, f"{label} from image {img_num}")

        if setting_img_num:
            edited_prompt = f"In the setting from image {setting_img_num}. {edited_prompt}"

        payload["prompt"] = edited_prompt

        # Attach image data
        payload["input_image"] = ref_data[0]
        for i, b64 in enumerate(ref_data[1:], start=2):
            if i > 8:
                break
            payload[f"input_image_{i}"] = b64

        ref_keys = [k for k in payload if k.startswith("input_image")]
        log.info(f"Image editing mode: {len(ref_keys)} reference(s) ({ref_keys})")
    else:
        payload["prompt"] = prompt
        log.info("Text-to-image mode (no references)")

    log.info(f"Prompt: {payload['prompt'][:200]}...")

    # Submit generation request
    with httpx.Client(timeout=httpx.Timeout(30.0)) as client:
        submit_resp = client.post(
            f"{BFL_API_BASE}/{BFL_MODEL}",
            headers=headers,
            json=payload,
        )
        submit_resp.raise_for_status()
        task = submit_resp.json()
        polling_url = task["polling_url"]
        log.info(f"Submitted: id={task.get('id')} cost={task.get('cost')} input_mp={task.get('input_mp')} output_mp={task.get('output_mp')}")

        # Poll until ready
        deadline = time.monotonic() + 180
        while True:
            if time.monotonic() > deadline:
                raise TimeoutError("BFL image generation timed out after 180s")

            time.sleep(1.0)
            poll_resp = client.get(polling_url, headers=headers)
            poll_resp.raise_for_status()
            result = poll_resp.json()

            if result["status"] == "Ready":
                image_url = result["result"]["sample"]
                # Download the image
                img_resp = client.get(image_url)
                img_resp.raise_for_status()
                output_path.write_bytes(img_resp.content)
                return

            if result["status"] not in ("Pending", "Processing"):
                raise RuntimeError(f"BFL generation failed with status: {result['status']}")
