import json
import traceback
from datetime import datetime
from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from config import EPISODES_DIR, CHARACTERS_DIR, SETTINGS_DIR
from models import EpisodeState, EpisodeSummary
from stages.registry import discover_stages, mount_stage_routers


class CatchAllExceptionMiddleware(BaseHTTPMiddleware):
    """Catch unhandled exceptions and return JSON so CORS headers are preserved."""

    async def dispatch(self, request: StarletteRequest, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            traceback.print_exc()
            return JSONResponse(
                status_code=500,
                content={"detail": str(exc)},
            )


app = FastAPI(title="LLS Terminal")

# Order matters: CORS wraps the exception middleware, so CORS headers
# are added even when the inner middleware catches a 500.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CatchAllExceptionMiddleware)

stages = discover_stages()
mount_stage_routers(app, stages)

# Static file serving for episode assets, character refs, setting refs
app.mount("/static/episodes", StaticFiles(directory=str(EPISODES_DIR)), name="episodes_static")
app.mount("/static/characters", StaticFiles(directory=str(CHARACTERS_DIR)), name="characters_static")
app.mount("/static/settings", StaticFiles(directory=str(SETTINGS_DIR)), name="settings_static")


# --- Global routes ---

@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/stages")
async def list_stages():
    return [s.metadata().model_dump() for s in stages]


@app.get("/api/episodes", response_model=list[EpisodeSummary])
async def list_episodes():
    registry_path = EPISODES_DIR / "registry.json"
    if not registry_path.exists():
        return []
    return json.loads(registry_path.read_text())


class CreateEpisodeRequest(BaseModel):
    title: str = ""


@app.post("/api/episodes", response_model=EpisodeSummary)
async def create_episode(req: CreateEpisodeRequest):
    registry_path = EPISODES_DIR / "registry.json"
    registry: list[dict] = json.loads(registry_path.read_text()) if registry_path.exists() else []

    ep_num = len(registry) + 1
    ep_id = f"ep_{ep_num:03d}"
    ep_dir = EPISODES_DIR / ep_id
    ep_dir.mkdir(parents=True, exist_ok=True)

    state = EpisodeState(id=ep_id, current_stage="stage_0_context")
    (ep_dir / "state.json").write_text(state.model_dump_json(indent=2))

    summary = EpisodeSummary(
        id=ep_id,
        title=req.title or f"Episode {ep_num}",
        summary="",
        date=datetime.now().isoformat(),
    )
    registry.append(summary.model_dump())
    registry_path.write_text(json.dumps(registry, indent=2))

    return summary


@app.get("/api/episodes/{ep_id}")
async def get_episode(ep_id: str):
    state_path = EPISODES_DIR / ep_id / "state.json"
    if not state_path.exists():
        raise HTTPException(404, f"Episode {ep_id} not found")
    return json.loads(state_path.read_text())
