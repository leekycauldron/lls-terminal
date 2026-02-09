from pathlib import Path

from config import EPISODES_DIR, CHARACTERS_DIR, SETTINGS_DIR
from models import EpisodeState
from services.llm import generate
from services.openai_images import generate_scene_image


def generate_thumbnail_prompt(state: EpisodeState) -> str:
    """Use LLM to generate a thumbnail image prompt from the episode content."""
    # Summarize the script
    script_summary = []
    for line in state.script.lines[:10]:
        script_summary.append(f"{line.character_id}: {line.text_en}")

    # List characters that appear
    char_descriptions = []
    for char_id in set(l.character_id for l in state.script.lines):
        char = state.context.characters.get(char_id)
        if char:
            char_descriptions.append(f"- {char_id}: {char.get('visual', '')}")

    prompt = f"""Generate a vivid image prompt for a YouTube thumbnail for this Chinese learning show episode.

Episode idea: {state.script.idea}

Characters appearing (with visual descriptions):
{chr(10).join(char_descriptions)}

First few lines of dialogue:
{chr(10).join(script_summary)}

Requirements:
- The thumbnail should capture the central conflict or emotion of the episode
- Include the main characters with their described visual appearances
- Bright, eye-catching composition suitable for a YouTube thumbnail
- Show expressive faces and dynamic poses
- Animated/cartoon style consistent with a family learning show
- Do NOT include any text or titles in the image

Return ONLY the image prompt, nothing else."""

    return generate(
        system="You write image generation prompts for YouTube thumbnails. Return only the prompt text.",
        user=prompt,
        max_tokens=512,
    ).strip()


def generate_thumbnail_image(state: EpisodeState) -> str:
    """Generate thumbnail image with character and setting references. Returns the image_file path."""
    ep_dir = EPISODES_DIR / state.id
    image_file = "thumbnail.png"
    output_path = ep_dir / image_file

    # Collect character references for characters in the script
    script_chars = set(l.character_id for l in state.script.lines)
    char_refs = []
    for char_id in script_chars:
        char = state.context.characters.get(char_id)
        if char and char.get("reference"):
            ref_path = CHARACTERS_DIR.parent / char["reference"]
            if ref_path.exists():
                char_refs.append(str(ref_path))

    # Find the most-used setting for a setting reference
    setting_ref = None
    if state.scenes.scenes:
        setting_counts: dict[str, int] = {}
        for scene in state.scenes.scenes:
            setting_counts[scene.setting_id] = setting_counts.get(scene.setting_id, 0) + 1
        top_setting = max(setting_counts, key=setting_counts.get)
        setting = state.context.settings.get(top_setting)
        if setting and setting.get("reference"):
            ref_path = SETTINGS_DIR.parent / setting["reference"]
            if ref_path.exists():
                setting_ref = str(ref_path)

    # Append art style to prompt if set
    prompt = state.thumbnail.prompt
    if state.art_style:
        prompt = f"{prompt}\n\nArt style: {state.art_style}"

    generate_scene_image(
        prompt=prompt,
        setting_reference=setting_ref,
        character_references=char_refs if char_refs else None,
        output_path=output_path,
    )

    return image_file


def revert_thumbnail_image(state: EpisodeState) -> None:
    """Delete thumbnail image file."""
    if state.thumbnail.image_file:
        image_path = EPISODES_DIR / state.id / state.thumbnail.image_file
        if image_path.exists():
            image_path.unlink()
