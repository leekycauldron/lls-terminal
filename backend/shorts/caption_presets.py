from shorts.caption_models import CaptionConfig, TextStyle


def default() -> CaptionConfig:
    """Matches the original hardcoded values."""
    return CaptionConfig(preset_name="default")


def clean_minimal() -> CaptionConfig:
    return CaptionConfig(
        preset_name="clean_minimal",
        question=TextStyle(
            font_size=64, font_color="#FFFFFF", font_weight="regular",
            y_position=100,
        ),
        answer_word=TextStyle(
            font_size=88, font_color="#FFFFFF", font_weight="bold",
            y_position=1120,
        ),
        answer_pinyin=TextStyle(
            font_size=42, font_color="#CCCCCC", font_weight="regular",
            y_position=1230,
        ),
        answer_english=TextStyle(
            font_size=36, font_color="#999999", font_weight="regular",
            y_position=1290,
        ),
        sentence_zh=TextStyle(
            font_size=40, font_color="#FFFFFF", font_weight="regular",
            y_position=1490,
        ),
        sentence_pinyin=TextStyle(
            font_size=28, font_color="#CCCCCC", font_weight="regular",
            y_position=1550,
        ),
        sentence_en=TextStyle(
            font_size=24, font_color="#999999", font_weight="regular",
            y_position=1595,
        ),
    )


def bold_contrast() -> CaptionConfig:
    return CaptionConfig(
        preset_name="bold_contrast",
        question=TextStyle(
            font_size=80, font_color="#FFFF00", font_weight="bold",
            border_width=4, border_color="#000000",
            y_position=100,
        ),
        answer_word=TextStyle(
            font_size=110, font_color="#FFFFFF", font_weight="bold",
            border_width=5, border_color="#000000",
            shadow_x=3, shadow_y=3, shadow_color="#000000",
            y_position=1100,
        ),
        answer_pinyin=TextStyle(
            font_size=52, font_color="#FFD700", font_weight="bold",
            border_width=2, border_color="#000000",
            y_position=1230,
        ),
        answer_english=TextStyle(
            font_size=44, font_color="#FFFFFF", font_weight="bold",
            border_width=2, border_color="#000000",
            y_position=1305,
        ),
        sentence_zh=TextStyle(
            font_size=48, font_color="#FFFFFF", font_weight="bold",
            border_width=3, border_color="#000000",
            y_position=1490,
        ),
        sentence_pinyin=TextStyle(
            font_size=36, font_color="#FFD700", font_weight="bold",
            border_width=2, border_color="#000000",
            y_position=1560,
        ),
        sentence_en=TextStyle(
            font_size=32, font_color="#FFFFFF", font_weight="bold",
            border_width=2, border_color="#000000",
            y_position=1615,
        ),
    )


def warm_tones() -> CaptionConfig:
    return CaptionConfig(
        preset_name="warm_tones",
        question=TextStyle(
            font_size=72, font_color="#FFF3E0", font_weight="bold",
            border_width=2, border_color="#4E342E",
            y_position=100,
        ),
        answer_word=TextStyle(
            font_size=96, font_color="#FFCCBC", font_weight="bold",
            border_width=2, border_color="#3E2723",
            y_position=1120,
        ),
        answer_pinyin=TextStyle(
            font_size=48, font_color="#FFAB91", font_weight="regular",
            y_position=1240,
        ),
        answer_english=TextStyle(
            font_size=40, font_color="#BCAAA4", font_weight="regular",
            y_position=1310,
        ),
        sentence_zh=TextStyle(
            font_size=44, font_color="#FFF3E0", font_weight="bold",
            border_width=2, border_color="#4E342E",
            y_position=1500,
        ),
        sentence_pinyin=TextStyle(
            font_size=32, font_color="#FFAB91", font_weight="regular",
            y_position=1570,
        ),
        sentence_en=TextStyle(
            font_size=28, font_color="#BCAAA4", font_weight="regular",
            y_position=1620,
        ),
    )


def neon_glow() -> CaptionConfig:
    return CaptionConfig(
        preset_name="neon_glow",
        question=TextStyle(
            font_size=72, font_color="#00FFFF", font_weight="bold",
            border_width=2, border_color="#004D4D",
            shadow_x=0, shadow_y=0, shadow_color="#00FFFF",
            y_position=100,
        ),
        answer_word=TextStyle(
            font_size=96, font_color="#FF00FF", font_weight="bold",
            border_width=3, border_color="#4D004D",
            shadow_x=0, shadow_y=0, shadow_color="#FF00FF",
            y_position=1120,
        ),
        answer_pinyin=TextStyle(
            font_size=48, font_color="#00FF88", font_weight="regular",
            shadow_x=0, shadow_y=0, shadow_color="#00FF88",
            y_position=1240,
        ),
        answer_english=TextStyle(
            font_size=40, font_color="#88CCFF", font_weight="regular",
            y_position=1310,
        ),
        sentence_zh=TextStyle(
            font_size=44, font_color="#00FFFF", font_weight="bold",
            border_width=2, border_color="#004D4D",
            shadow_x=0, shadow_y=0, shadow_color="#00FFFF",
            y_position=1500,
        ),
        sentence_pinyin=TextStyle(
            font_size=32, font_color="#00FF88", font_weight="regular",
            y_position=1570,
        ),
        sentence_en=TextStyle(
            font_size=28, font_color="#88CCFF", font_weight="regular",
            y_position=1620,
        ),
    )


def pastel_soft() -> CaptionConfig:
    return CaptionConfig(
        preset_name="pastel_soft",
        question=TextStyle(
            font_size=68, font_color="#E8D5F5", font_weight="regular",
            y_position=100,
        ),
        answer_word=TextStyle(
            font_size=92, font_color="#F8BBD0", font_weight="bold",
            y_position=1120,
        ),
        answer_pinyin=TextStyle(
            font_size=46, font_color="#B3E5FC", font_weight="regular",
            y_position=1240,
        ),
        answer_english=TextStyle(
            font_size=38, font_color="#C8E6C9", font_weight="regular",
            y_position=1310,
        ),
        sentence_zh=TextStyle(
            font_size=42, font_color="#E8D5F5", font_weight="regular",
            y_position=1500,
        ),
        sentence_pinyin=TextStyle(
            font_size=30, font_color="#B3E5FC", font_weight="regular",
            y_position=1570,
        ),
        sentence_en=TextStyle(
            font_size=26, font_color="#C8E6C9", font_weight="regular",
            y_position=1620,
        ),
    )


PRESETS = {
    "default": default,
    "clean_minimal": clean_minimal,
    "bold_contrast": bold_contrast,
    "warm_tones": warm_tones,
    "neon_glow": neon_glow,
    "pastel_soft": pastel_soft,
}
