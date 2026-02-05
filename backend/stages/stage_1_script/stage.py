from fastapi import APIRouter

from stages.base import BaseStage, StageMetadata
from stages.stage_1_script.routes import router as script_router
from models import EpisodeState


class Stage(BaseStage):
    def metadata(self) -> StageMetadata:
        return StageMetadata(
            id="stage_1_script",
            order=1,
            name="Script",
            requires=["stage_0_context"],
        )

    def router(self) -> APIRouter:
        return script_router

    def validate_entry(self, state: EpisodeState) -> bool:
        return bool(state.context.characters and state.context.settings)

    def validate_exit(self, state: EpisodeState) -> bool:
        return state.script.approved and len(state.script.lines) > 0
