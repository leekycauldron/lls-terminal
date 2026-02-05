import uuid
from pathlib import Path

from config import EPISODES_DIR, CHARACTERS_DIR, SETTINGS_DIR
from models import EpisodeState, Scene
from services.llm import generate_json
from services.openai_images import generate_scene_image

PROMPTS_DIR = Path(__file__).parent / "prompts"


def format_script_lines(state: EpisodeState) -> str:
    lines = []
    for line in state.script.lines:
        lines.append(
            f"- [{line.id}] {line.character_id}: {line.text_zh} ({line.text_en})"
        )
    return "\n".join(lines)


def format_characters(characters: dict) -> str:
    lines = []
    for name, info in characters.items():
        lines.append(f"- {name}: {info.get('role', '')}. Visual: {info.get('visual', '')}")
    return "\n".join(lines)


def format_settings(settings: dict) -> str:
    lines = []
    for key, info in settings.items():
        lines.append(f"- {key} ({info['name_zh']} / {info['name_en']})")
    return "\n".join(lines)


def generate_scene_breakdown(state: EpisodeState) -> list[Scene]:
    """Use LLM to break script into scenes."""
    prompt_template = (PROMPTS_DIR / "scene_breakdown.txt").read_text()
    prompt = prompt_template.format(
        script_lines=format_script_lines(state),
        settings=format_settings(state.context.settings),
        characters=format_characters(state.context.characters),
    )
    result = generate_json(
        system="You are a scene breakdown specialist for a Chinese learning show. Return JSON only.",
        user=prompt,
        max_tokens=4096,
    )

    scenes = []
    for i, scene_data in enumerate(result.get("scenes", [])):
        scenes.append(Scene(
            id=str(uuid.uuid4())[:8],
            order=i,
            prompt=scene_data["prompt"],
            setting_id=scene_data["setting_id"],
            character_ids=scene_data["character_ids"],
            line_ids=scene_data["line_ids"],
        ))
    return scenes


def generate_single_scene_image(state: EpisodeState, scene: Scene) -> str:
    """Generate image for one scene. Returns the image_file path."""
    ep_dir = EPISODES_DIR / state.id
    scenes_dir = ep_dir / "scenes"
    image_file = f"scenes/scene_{scene.id}.png"
    output_path = ep_dir / image_file

    # Build reference paths
    setting_ref = None
    setting = state.context.settings.get(scene.setting_id)
    if setting and setting.get("reference"):
        ref = setting["reference"]
        setting_ref_path = SETTINGS_DIR.parent / ref
        if setting_ref_path.exists():
            setting_ref = str(setting_ref_path)

    char_refs = []
    for char_id in scene.character_ids:
        char = state.context.characters.get(char_id)
        if char and char.get("reference"):
            ref = char["reference"]
            ref_path = CHARACTERS_DIR.parent / ref
            if ref_path.exists():
                char_refs.append(str(ref_path))

    generate_scene_image(
        prompt=scene.prompt,
        setting_reference=setting_ref,
        character_references=char_refs if char_refs else None,
        output_path=output_path,
    )

    return image_file


def revert_scene_image(state: EpisodeState, scene: Scene) -> None:
    """Delete image file for a scene."""
    if scene.image_file:
        image_path = EPISODES_DIR / state.id / scene.image_file
        if image_path.exists():
            image_path.unlink()
