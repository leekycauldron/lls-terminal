from fastapi import APIRouter

from stages.base import BaseStage, StageMetadata
from stages.stage_4_stitch.routes import router as stitch_router
from models import EpisodeState


class Stage(BaseStage):
    def metadata(self) -> StageMetadata:
        return StageMetadata(
            id="stage_4_stitch",
            order=4,
            name="Stitch",
            requires=["stage_3_scenes"],
        )

    def router(self) -> APIRouter:
        return stitch_router

    def validate_entry(self, state: EpisodeState) -> bool:
        return state.scenes.approved

    def validate_exit(self, state: EpisodeState) -> bool:
        return state.timeline.approved and bool(state.timeline.output_file)
