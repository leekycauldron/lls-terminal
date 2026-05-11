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
    pause_after_question: float = 1.0
    pause_between_items: float = 0.8
    sentence_mode: str = "sentence"  # "sentence" | "repeat"
    repeat_count: int = 5
    timer_duration: float = 5.0
    reveal_hold: float = 1.5
    sfx_timer: str = ""        # SFX filename for timer countdown
    sfx_reveal: str = ""       # SFX filename for answer reveal
    sfx_correct: str = ""      # SFX filename for correct answer
    sfx_wrong: str = ""        # SFX filename for wrong answer
    sfx_transition: str = ""   # SFX filename for item transitions


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
    tts_repeat_files: list[str] = []
    tts_repeat_durations_ms: list[int] = []
    tts_generated: bool = False
    wrong_sentence_zh: str = ""
    wrong_sentence_pinyin: str = ""
    wrong_sentence_en: str = ""


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
