from abc import ABC, abstractmethod

from fastapi import APIRouter
from pydantic import BaseModel

from models import EpisodeState


class StageMetadata(BaseModel):
    id: str
    order: int
    name: str
    requires: list[str] = []


class BaseStage(ABC):
    @abstractmethod
    def metadata(self) -> StageMetadata:
        ...

    @abstractmethod
    def router(self) -> APIRouter:
        ...

    @abstractmethod
    def validate_entry(self, state: EpisodeState) -> bool:
        ...

    @abstractmethod
    def validate_exit(self, state: EpisodeState) -> bool:
        ...
