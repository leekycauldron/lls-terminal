from __future__ import annotations

from pydantic import BaseModel, Field


class TextStyle(BaseModel):
    font_size: int = 48
    font_color: str = "#FFFFFF"
    font_weight: str = "bold"  # "bold" | "regular"
    border_width: int = 0
    border_color: str = "#000000"
    shadow_x: int = 0
    shadow_y: int = 0
    shadow_color: str = "#000000"
    y_position: int = 960
    alignment: str = "center"  # "left" | "center" | "right"
    opacity: float = 1.0
    background_color: str = ""  # empty = off
    background_padding: int = 0


class CaptionConfig(BaseModel):
    preset_name: str = "default"
    question: TextStyle = Field(default_factory=lambda: TextStyle(
        font_size=72, font_color="#FFFFFF", font_weight="bold",
        border_width=3, border_color="#000000",
        y_position=100,
    ))
    answer_word: TextStyle = Field(default_factory=lambda: TextStyle(
        font_size=96, font_color="#FFFFFF", font_weight="bold",
        y_position=1120,
    ))
    answer_pinyin: TextStyle = Field(default_factory=lambda: TextStyle(
        font_size=48, font_color="#AAAAAA", font_weight="regular",
        y_position=1240,
    ))
    answer_english: TextStyle = Field(default_factory=lambda: TextStyle(
        font_size=40, font_color="#888888", font_weight="regular",
        y_position=1310,
    ))
    sentence_zh: TextStyle = Field(default_factory=lambda: TextStyle(
        font_size=44, font_color="#FFFFFF", font_weight="bold",
        y_position=1500,
    ))
    sentence_pinyin: TextStyle = Field(default_factory=lambda: TextStyle(
        font_size=32, font_color="#AAAAAA", font_weight="regular",
        y_position=1570,
    ))
    sentence_en: TextStyle = Field(default_factory=lambda: TextStyle(
        font_size=28, font_color="#888888", font_weight="regular",
        y_position=1620,
    ))
