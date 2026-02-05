import importlib
from pathlib import Path

from fastapi import FastAPI

from stages.base import BaseStage


def discover_stages() -> list[BaseStage]:
    stages_dir = Path(__file__).parent
    stage_modules = sorted(
        d.name for d in stages_dir.iterdir()
        if d.is_dir() and d.name.startswith("stage_")
    )
    instances: list[BaseStage] = []
    for mod_name in stage_modules:
        module = importlib.import_module(f"stages.{mod_name}.stage")
        stage_class = getattr(module, "Stage")
        instances.append(stage_class())
    instances.sort(key=lambda s: s.metadata().order)
    return instances


def mount_stage_routers(app: FastAPI, stages: list[BaseStage]) -> None:
    for stage in stages:
        app.include_router(stage.router())
