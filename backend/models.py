from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class EpisodeSummary(BaseModel):
    id: str
    title: str
    summary: str = ""
    date: str = ""


class ScriptLine(BaseModel):
    id: str
    order: int
    character_id: str
    text_zh: str
    text_en: str
    text_pinyin: str
    direction: Optional[str] = None


class ContextData(BaseModel):
    characters: dict[str, Any] = {}
    settings: dict[str, Any] = {}
    episode_history: list[EpisodeSummary] = []


class ScriptData(BaseModel):
    seed: str = ""
    idea: str = ""
    lines: list[ScriptLine] = []
    approved: bool = False


class TTSLineStatus(BaseModel):
    line_id: str
    audio_file: str = ""
    duration_ms: int = 0
    generated: bool = False


class TTSData(BaseModel):
    line_statuses: list[TTSLineStatus] = []
    mode: str = "manual"
    approved: bool = False


class Scene(BaseModel):
    id: str
    order: int
    prompt: str
    setting_id: str
    character_ids: list[str]
    line_ids: list[str]
    image_file: str = ""
    generated: bool = False


class ScenesData(BaseModel):
    scenes: list[Scene] = []
    mode: str = "manual"
    approved: bool = False


class TimelineClip(BaseModel):
    id: str
    type: str
    source_id: str
    source_file: str
    track: str
    start_ms: int = 0
    duration_ms: int = 0
    order: int = 0


class TimelineData(BaseModel):
    clips: list[TimelineClip] = []
    total_duration_ms: int = 0
    output_file: str = ""
    approved: bool = False


class EpisodeState(BaseModel):
    id: str
    current_stage: str = "stage_0_context"
    context: ContextData = Field(default_factory=ContextData)
    script: ScriptData = Field(default_factory=ScriptData)
    tts: TTSData = Field(default_factory=TTSData)
    scenes: ScenesData = Field(default_factory=ScenesData)
    timeline: TimelineData = Field(default_factory=TimelineData)
