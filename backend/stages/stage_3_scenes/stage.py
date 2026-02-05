from fastapi import APIRouter

from stages.base import BaseStage, StageMetadata
from stages.stage_3_scenes.routes import router as scenes_router
from models import EpisodeState


class Stage(BaseStage):
    def metadata(self) -> StageMetadata:
        return StageMetadata(
            id="stage_3_scenes",
            order=3,
            name="Scenes",
            requires=["stage_2_tts"],
        )

    def router(self) -> APIRouter:
        return scenes_router

    def validate_entry(self, state: EpisodeState) -> bool:
        return state.tts.approved

    def validate_exit(self, state: EpisodeState) -> bool:
        return state.scenes.approved and all(
            s.generated for s in state.scenes.scenes
        )
