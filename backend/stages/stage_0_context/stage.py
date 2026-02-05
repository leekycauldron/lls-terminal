from fastapi import APIRouter

from stages.base import BaseStage, StageMetadata
from stages.stage_0_context.routes import router as context_router
from models import EpisodeState


class Stage(BaseStage):
    def metadata(self) -> StageMetadata:
        return StageMetadata(
            id="stage_0_context",
            order=0,
            name="Context",
            requires=[],
        )

    def router(self) -> APIRouter:
        return context_router

    def validate_entry(self, state: EpisodeState) -> bool:
        return True

    def validate_exit(self, state: EpisodeState) -> bool:
        return bool(state.context.characters and state.context.settings)
