import uuid
from pathlib import Path

from models import EpisodeState, ScriptLine
from services.llm import generate_json

PROMPTS_DIR = Path(__file__).parent / "prompts"


def format_characters(characters: dict) -> str:
    lines = []
    for name, info in characters.items():
        lines.append(f"- {name}: {info.get('role', '')}. {info.get('personality', '')}")
    return "\n".join(lines)


def format_settings(settings: dict) -> str:
    lines = []
    for key, info in settings.items():
        lines.append(f"- {key} ({info['name_zh']} / {info['name_en']})")
    return "\n".join(lines)


def format_episode_history(history: list[dict]) -> str:
    if not history:
        return "(No previous episodes)"
    lines = []
    for ep in history:
        lines.append(f"- {ep.get('id', '')}: {ep.get('title', '')} — {ep.get('summary', '')}")
    return "\n".join(lines)


def check_seed(state: EpisodeState, seed: str) -> dict:
    prompt_template = (PROMPTS_DIR / "seed_check.txt").read_text()
    history = [ep.model_dump() for ep in state.context.episode_history]
    prompt = prompt_template.format(
        episode_history=format_episode_history(history),
        seed=seed,
    )
    return generate_json(
        system="You check story ideas for conflicts with previous episodes. Return JSON only.",
        user=prompt,
    )


def generate_idea(state: EpisodeState, seed: str) -> dict:
    prompt_template = (PROMPTS_DIR / "generate_idea.txt").read_text()
    history = [ep.model_dump() for ep in state.context.episode_history]
    prompt = prompt_template.format(
        characters=format_characters(state.context.characters),
        settings=format_settings(state.context.settings),
        episode_history=format_episode_history(history),
        seed=seed,
    )
    return generate_json(
        system="You are a creative writer for a Chinese learning show. Return JSON only.",
        user=prompt,
    )


def generate_script(state: EpisodeState, idea: str) -> list[ScriptLine]:
    prompt_template = (PROMPTS_DIR / "generate_script.txt").read_text()
    prompt = prompt_template.format(
        characters=format_characters(state.context.characters),
        settings=format_settings(state.context.settings),
        idea=idea,
    )
    result = generate_json(
        system="You are a scriptwriter for a Chinese learning show. Return JSON only.",
        user=prompt,
        max_tokens=16384,
    )
    lines = []
    for i, line_data in enumerate(result.get("lines", [])):
        lines.append(ScriptLine(
            id=str(uuid.uuid4())[:8],
            order=i,
            character_id=line_data["character_id"],
            text_zh=line_data["text_zh"],
            text_en=line_data["text_en"],
            text_pinyin=line_data["text_pinyin"],
            direction=line_data.get("direction") or None,
        ))
    return lines
