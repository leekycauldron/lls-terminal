from __future__ import annotations

from pydantic import BaseModel, Field


class ShortSummary(BaseModel):
    id: str
    theme: str = ""
    topic: str = ""
    title: str = ""
    date: str = ""
    completed: bool = False


class ShortConfig(BaseModel):
    voice_id: str = ""
    tts_speed: float = 1.0
    music_file: str = ""
    music_volume: float = 0.15
    art_style: str = ""


class FlashcardItem(BaseModel):
    id: str
    order: int
    word_zh: str = ""
    word_pinyin: str = ""
    word_en: str = ""
    sentence_zh: str = ""
    sentence_pinyin: str = ""
    sentence_en: str = ""
    image_prompt: str = ""
    image_file: str = ""
    image_generated: bool = False
    tts_answer_file: str = ""
    tts_sentence_file: str = ""
    tts_answer_duration_ms: int = 0
    tts_sentence_duration_ms: int = 0
    tts_generated: bool = False


class ShortState(BaseModel):
    id: str
    theme: str = "whats_this"
    topic: str = ""
    title: str = ""
    current_step: str = "setup"  # setup | content | assets | export
    config: ShortConfig = Field(default_factory=ShortConfig)
    items: list[FlashcardItem] = []
    content_approved: bool = False
    assets_approved: bool = False
    tts_question_file: str = ""
    tts_question_duration_ms: int = 0
    output_file: str = ""
    completed: bool = False
