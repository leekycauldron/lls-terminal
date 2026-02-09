from fastapi import APIRouter

from stages.base import BaseStage, StageMetadata
from stages.stage_5_thumbnail.routes import router as thumbnail_router
from models import EpisodeState


class Stage(BaseStage):
    def metadata(self) -> StageMetadata:
        return StageMetadata(
            id="stage_5_thumbnail",
            order=5,
            name="Thumbnail",
            requires=["stage_4_stitch"],
        )

    def router(self) -> APIRouter:
        return thumbnail_router

    def validate_entry(self, state: EpisodeState) -> bool:
        return state.timeline.approved

    def validate_exit(self, state: EpisodeState) -> bool:
        return state.thumbnail.approved and bool(state.thumbnail.image_file)
