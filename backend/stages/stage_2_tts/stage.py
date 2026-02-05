from fastapi import APIRouter

from stages.base import BaseStage, StageMetadata
from stages.stage_2_tts.routes import router as tts_router
from models import EpisodeState


class Stage(BaseStage):
    def metadata(self) -> StageMetadata:
        return StageMetadata(
            id="stage_2_tts",
            order=2,
            name="TTS",
            requires=["stage_1_script"],
        )

    def router(self) -> APIRouter:
        return tts_router

    def validate_entry(self, state: EpisodeState) -> bool:
        return state.script.approved and len(state.script.lines) > 0

    def validate_exit(self, state: EpisodeState) -> bool:
        return state.tts.approved and all(
            ls.generated for ls in state.tts.line_statuses
        )
