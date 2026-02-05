import json

from fastapi import APIRouter, HTTPException

from config import CHARACTERS_DIR, SETTINGS_DIR, EPISODES_DIR
from models import EpisodeState, EpisodeSummary, ContextData

router = APIRouter(prefix="/api/episodes/{ep_id}", tags=["context"])


@router.get("/context")
async def load_context(ep_id: str):
    state_path = EPISODES_DIR / ep_id / "state.json"
    if not state_path.exists():
        raise HTTPException(404, f"Episode {ep_id} not found")

    characters = json.loads((CHARACTERS_DIR / "registry.json").read_text())
    settings = json.loads((SETTINGS_DIR / "registry.json").read_text())

    registry_path = EPISODES_DIR / "registry.json"
    all_episodes: list[dict] = json.loads(registry_path.read_text()) if registry_path.exists() else []
    history = [ep for ep in all_episodes if ep["id"] != ep_id]

    # Enrich history with script summaries from each episode's state
    enriched_history = []
    for ep in history:
        ep_state_path = EPISODES_DIR / ep["id"] / "state.json"
        summary_text = ep.get("summary", "")
        if ep_state_path.exists() and not summary_text:
            ep_state = json.loads(ep_state_path.read_text())
            script = ep_state.get("script", {})
            summary_text = script.get("idea", "")
        enriched_history.append(EpisodeSummary(
            id=ep["id"],
            title=ep["title"],
            summary=summary_text,
            date=ep.get("date", ""),
        ))

    context = ContextData(
        characters=characters,
        settings=settings,
        episode_history=enriched_history,
    )

    # Update episode state with context
    state = EpisodeState(**json.loads(state_path.read_text()))
    state.context = context
    state_path.write_text(state.model_dump_json(indent=2))

    return context.model_dump()
