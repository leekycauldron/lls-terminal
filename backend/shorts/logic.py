import base64
import json
import math
import os
import random
import subprocess
import uuid
from pathlib import Path

from config import CHARACTERS_DIR, SHORTS_CODE_DIR, SHORTS_DIR
from services.llm import generate_json
from services.elevenlabs import generate_tts as el_generate_tts, get_audio_duration_ms
from services.openai_images import get_client as get_openai_client
from shorts.models import ShortState, ShortConfig, FlashcardItem
from shorts.caption_models import CaptionConfig, TextStyle

IS_WINDOWS = os.name == "nt"

PROMPTS_DIR = SHORTS_CODE_DIR / "prompts"
FONTS_DIR = SHORTS_CODE_DIR / "fonts"
MUSIC_DIR = SHORTS_CODE_DIR / "music"

# Bright color palette for repeat mode labels
REPEAT_COLORS = [
    "#FF4444", "#44FF44", "#4488FF", "#FFFF44", "#FF44FF",
    "#44FFFF", "#FF8844", "#8844FF", "#FF6699", "#66FF99",
]


def _load_all_voice_ids() -> list[str]:
    """Load all voice IDs from characters/registry.json."""
    reg_path = CHARACTERS_DIR / "registry.json"
    if not reg_path.exists():
        return []
    data = json.loads(reg_path.read_text(encoding="utf-8"))
    return [char["voice_id"] for char in data.values() if char.get("voice_id")]


def generate_word_list(state: ShortState, count: int = 6) -> list[FlashcardItem]:
    """Use LLM to generate vocabulary items for a topic."""
    if state.theme == "which_one":
        prompt_file = "generate_which_one.txt"
    else:
        prompt_file = "generate_wordlist.txt"

    prompt_template = (PROMPTS_DIR / prompt_file).read_text(encoding="utf-8")
    prompt = prompt_template.format(topic=state.topic, count=count)

    result = generate_json(
        system="You are a Chinese language teaching expert creating flashcard content. Return only valid JSON.",
        user=prompt,
        max_tokens=4096,
    )

    items = []
    for i, item_data in enumerate(result):
        items.append(FlashcardItem(
            id=str(uuid.uuid4())[:8],
            order=i,
            word_zh=item_data.get("word_zh", ""),
            word_pinyin=item_data.get("word_pinyin", ""),
            word_en=item_data.get("word_en", ""),
            sentence_zh=item_data.get("sentence_zh", ""),
            sentence_pinyin=item_data.get("sentence_pinyin", ""),
            sentence_en=item_data.get("sentence_en", ""),
            image_prompt=item_data.get("image_prompt", ""),
            wrong_sentence_zh=item_data.get("wrong_sentence_zh", ""),
            wrong_sentence_pinyin=item_data.get("wrong_sentence_pinyin", ""),
            wrong_sentence_en=item_data.get("wrong_sentence_en", ""),
        ))
    return items


def generate_item_image(item: FlashcardItem, config: ShortConfig, short_dir: Path) -> str:
    """Generate an image for a flashcard item. Returns relative file path."""
    image_file = f"images/item_{item.id}.png"
    output_path = short_dir / image_file

    prompt = item.image_prompt
    if not prompt:
        prompt = f"Clean isolated {item.word_en} on a solid white background. No text, no labels. Photorealistic studio lighting."
    if config.art_style:
        prompt = f"{prompt}\n\nArt style: {config.art_style}"

    # Generate square image (1024x1024) for vertical video top half
    output_path.parent.mkdir(parents=True, exist_ok=True)
    client = get_openai_client()
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        n=1,
        size="1024x1024",
    )
    image_b64 = response.data[0].b64_json
    output_path.write_bytes(base64.standard_b64decode(image_b64))
    return image_file


def generate_item_tts(item: FlashcardItem, config: ShortConfig, short_dir: Path) -> None:
    """Generate TTS for the answer word and example sentence (or repeats)."""
    # Answer TTS (just the word)
    answer_file = f"audio/answer_{item.id}.mp3"
    answer_path = short_dir / answer_file
    duration = el_generate_tts(
        config.voice_id, item.word_zh, answer_path, speed=config.tts_speed
    )
    item.tts_answer_file = answer_file
    item.tts_answer_duration_ms = duration

    if config.sentence_mode == "repeat":
        # Generate word repeats with cycling voices instead of sentence
        generate_item_repeats(item, config, short_dir)
    else:
        # Sentence TTS (default)
        sentence_file = f"audio/sentence_{item.id}.mp3"
        sentence_path = short_dir / sentence_file
        duration = el_generate_tts(
            config.voice_id, item.sentence_zh, sentence_path, speed=config.tts_speed
        )
        item.tts_sentence_file = sentence_file
        item.tts_sentence_duration_ms = duration

    item.tts_generated = True


def generate_item_repeats(item: FlashcardItem, config: ShortConfig, short_dir: Path) -> None:
    """Generate TTS repeats of the word using cycling voices."""
    voice_ids = _load_all_voice_ids()
    if not voice_ids:
        voice_ids = [config.voice_id]

    (short_dir / "audio").mkdir(parents=True, exist_ok=True)

    files = []
    durations = []
    for n in range(config.repeat_count):
        voice = voice_ids[n % len(voice_ids)]
        repeat_file = f"audio/repeat_{item.id}_{n}.mp3"
        repeat_path = short_dir / repeat_file
        dur = el_generate_tts(voice, item.word_zh, repeat_path, speed=config.tts_speed)
        files.append(repeat_file)
        durations.append(dur)

    item.tts_repeat_files = files
    item.tts_repeat_durations_ms = durations


def generate_question_tts(config: ShortConfig, short_dir: Path, theme: str = "whats_this") -> tuple[str, int]:
    """Generate the shared question TTS clip. Returns (file, duration_ms)."""
    if theme == "which_one":
        question_text = "哪个对？"
    else:
        question_text = "这是什么？"

    q_file = "audio/question.mp3"
    q_path = short_dir / q_file
    duration = el_generate_tts(
        config.voice_id, question_text, q_path, speed=config.tts_speed
    )
    return q_file, duration


def _ffmpeg_font_path(path: Path) -> str:
    """Format a font path for FFmpeg drawtext, handling Windows drive letters."""
    s = str(path).replace("\\", "/")
    s = s.replace(":", "\\:")
    return s


def escape_ffmpeg_text(text: str) -> str:
    """Escape special characters for FFmpeg drawtext filter."""
    text = text.replace("\\", "\\\\")
    text = text.replace("'", "'\\''")
    text = text.replace(":", "\\:")
    text = text.replace("%", "%%")
    return text


def _load_caption_config() -> CaptionConfig:
    """Load caption config from disk, or return defaults."""
    config_path = SHORTS_DIR / "captions_config.json"
    if config_path.exists():
        data = json.loads(config_path.read_text(encoding="utf-8"))
        return CaptionConfig(**data)
    return CaptionConfig()


def _build_drawtext(
    text: str,
    style: TextStyle,
    font_bold: str,
    font_regular: str,
    enable_expr: str,
) -> str:
    """Convert a TextStyle into an FFmpeg drawtext filter string."""
    font = font_bold if style.font_weight == "bold" else font_regular

    if style.alignment == "left":
        x_expr = "20"
    elif style.alignment == "right":
        x_expr = "(w-text_w-20)"
    else:
        x_expr = "(w-text_w)/2"

    parts = [
        f"drawtext=text='{text}'",
        f"fontfile='{font}'",
        f"fontsize={style.font_size}",
        f"fontcolor={style.font_color}",
        f"x={x_expr}",
        f"y={style.y_position}",
    ]

    if style.border_width > 0:
        parts.append(f"borderw={style.border_width}")
        parts.append(f"bordercolor={style.border_color}")

    if style.shadow_x != 0 or style.shadow_y != 0:
        parts.append(f"shadowx={style.shadow_x}")
        parts.append(f"shadowy={style.shadow_y}")
        parts.append(f"shadowcolor={style.shadow_color}")

    if style.opacity < 1.0:
        parts.append(f"alpha={style.opacity:.2f}")

    if style.background_color:
        parts.append(f"box=1")
        parts.append(f"boxcolor={style.background_color}")
        parts.append(f"boxborderw={style.background_padding}")

    parts.append(f"enable='{enable_expr}'")

    return ":".join(parts)


def _build_drawtext_raw(
    text: str,
    font: str,
    fontsize: int,
    fontcolor: str,
    x_expr: str,
    y_expr: str,
    enable_expr: str,
    borderw: int = 0,
    bordercolor: str = "#000000",
) -> str:
    """Build a raw drawtext filter string (no TextStyle dependency)."""
    parts = [
        f"drawtext=text='{text}'",
        f"fontfile='{font}'",
        f"fontsize={fontsize}",
        f"fontcolor={fontcolor}",
        f"x={x_expr}",
        f"y={y_expr}",
    ]
    if borderw > 0:
        parts.append(f"borderw={borderw}")
        parts.append(f"bordercolor={bordercolor}")
    parts.append(f"enable='{enable_expr}'")
    return ":".join(parts)


# ---------------------------------------------------------------------------
# Concat + BGM helpers (shared by both themes)
# ---------------------------------------------------------------------------

def _concat_segments(segment_paths: list[Path], short_dir: Path) -> Path:
    """Concatenate video segments. Returns path to concatenated file."""
    concat_list = short_dir / "_concat.txt"
    if IS_WINDOWS:
        concat_list.write_text(
            "\n".join(f"file {p.name}" for p in segment_paths),
            encoding="utf-8",
        )
    else:
        concat_list.write_text(
            "\n".join(f"file '{p.name}'" for p in segment_paths),
            encoding="utf-8",
        )
    concat_video = short_dir / "_concat.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            str(concat_video),
        ],
        check=True,
        capture_output=True,
    )
    return concat_video


def _mix_bgm(concat_video: Path, output_path: Path, config: ShortConfig) -> None:
    """Mix in background music if available, otherwise just rename."""
    music_path = None
    if config.music_file:
        music_path = MUSIC_DIR / config.music_file
    if not music_path or not music_path.exists():
        default_music = MUSIC_DIR / "default_bgm.mp3"
        if default_music.exists():
            music_path = default_music

    if music_path and music_path.exists():
        vol = config.music_volume
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", str(concat_video),
                "-i", str(music_path),
                "-filter_complex",
                f"[1:a]volume={vol},aloop=loop=-1:size=2e+09[bgm];"
                f"[0:a][bgm]amix=inputs=2:dropout_transition=0:normalize=0[aout]",
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                str(output_path),
            ],
            check=True,
            capture_output=True,
        )
    else:
        concat_video.rename(output_path)


def _cleanup_temp(segment_paths: list[Path], short_dir: Path) -> None:
    """Remove temp segment and concat files."""
    for p in segment_paths:
        p.unlink(missing_ok=True)
    concat_list = short_dir / "_concat.txt"
    concat_list.unlink(missing_ok=True)
    concat_video = short_dir / "_concat.mp4"
    if concat_video.exists():
        concat_video.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# "What is this?" theme — sentence mode + repeat mode
# ---------------------------------------------------------------------------

def _build_whats_this_video(state: ShortState, short_dir: Path) -> str:
    """Build the "What is this?" short video."""
    output_file = "output.mp4"
    output_path = short_dir / output_file
    fps = 24

    cap_cfg = _load_caption_config()

    font_bold = FONTS_DIR / "NotoSansSC-Bold.otf"
    font_regular = FONTS_DIR / "NotoSansSC-Regular.otf"
    if not font_bold.exists():
        font_bold = font_regular
    font_path = _ffmpeg_font_path(font_bold)
    font_regular_path = _ffmpeg_font_path(font_regular)

    segment_paths: list[Path] = []

    for i, item in enumerate(sorted(state.items, key=lambda x: x.order)):
        seg_path = short_dir / f"_seg_{i}.mp4"

        # Timing — use configurable pauses
        q_dur_s = state.tts_question_duration_ms / 1000.0
        pause_after_q = state.config.pause_after_question
        answer_dur_s = item.tts_answer_duration_ms / 1000.0
        pause_after_answer = 0.3
        end_pause = state.config.pause_between_items

        t_question = 0.0
        t_answer_reveal = q_dur_s + pause_after_q

        is_repeat = state.config.sentence_mode == "repeat"

        if is_repeat:
            # Repeat mode: after answer, show word repeats with random labels
            repeat_gap = 0.15
            repeat_durs = [d / 1000.0 for d in item.tts_repeat_durations_ms]
            t_repeats_start = t_answer_reveal + answer_dur_s + pause_after_answer

            # Calculate repeat offsets
            repeat_offsets = []
            t_acc = t_repeats_start
            for rd in repeat_durs:
                repeat_offsets.append(t_acc)
                t_acc += rd + repeat_gap

            total_duration = t_acc - repeat_gap + end_pause  # remove last gap, add end pause
            t_sentence = None  # not used in repeat mode
        else:
            # Sentence mode (default)
            sentence_dur_s = item.tts_sentence_duration_ms / 1000.0
            t_sentence = t_answer_reveal + answer_dur_s + pause_after_answer
            total_duration = t_sentence + sentence_dur_s + end_pause

        frames = int(total_duration * fps)
        if frames < 1:
            frames = fps

        img_path = short_dir / item.image_file
        if not img_path.exists():
            raise FileNotFoundError(f"Image not found: {img_path}")

        # Zoompan for image
        z_start = 1.0
        z_end = 1.08
        vf_parts = [
            f"scale=4320:4320,zoompan="
            f"z='({z_start})+({z_end}-{z_start})*(on/{frames})':"
            f"x='trunc(iw/2-(iw/zoom/2))':y='trunc(ih/2-(ih/zoom/2))':"
            f"d={frames}:s=1080x1080:fps={fps}",
            "pad=1080:1920:0:0:black",
        ]

        # Text overlays
        q_text = escape_ffmpeg_text("这是什么？")
        word_zh = escape_ffmpeg_text(item.word_zh)
        word_pinyin = escape_ffmpeg_text(item.word_pinyin)
        word_en = escape_ffmpeg_text(item.word_en)

        vf_parts.append(_build_drawtext(
            q_text, cap_cfg.question, font_path, font_regular_path,
            f"between(t,{t_question:.2f},{t_answer_reveal:.2f})",
        ))
        vf_parts.append(_build_drawtext(
            word_zh, cap_cfg.answer_word, font_path, font_regular_path,
            f"gte(t,{t_answer_reveal:.2f})",
        ))
        vf_parts.append(_build_drawtext(
            word_pinyin, cap_cfg.answer_pinyin, font_path, font_regular_path,
            f"gte(t,{t_answer_reveal:.2f})",
        ))
        vf_parts.append(_build_drawtext(
            word_en, cap_cfg.answer_english, font_path, font_regular_path,
            f"gte(t,{t_answer_reveal:.2f})",
        ))

        if is_repeat:
            # Add repeat word labels at random positions
            rng = random.Random(item.id)  # seed per item for reproducibility
            for n, t_rep in enumerate(repeat_offsets):
                rx = rng.randint(60, 1020)
                ry = rng.randint(1400, 1820)
                rsize = rng.randint(48, 80)
                rcolor = rng.choice(REPEAT_COLORS)

                vf_parts.append(_build_drawtext_raw(
                    word_zh, font_path, rsize, rcolor,
                    str(rx), str(ry),
                    f"gte(t,{t_rep:.2f})",
                    borderw=2, bordercolor="#000000",
                ))
        else:
            # Sentence overlays
            sentence_zh = escape_ffmpeg_text(item.sentence_zh)
            sentence_pinyin = escape_ffmpeg_text(item.sentence_pinyin)
            sentence_en = escape_ffmpeg_text(item.sentence_en)
            vf_parts.append(_build_drawtext(
                sentence_zh, cap_cfg.sentence_zh, font_path, font_regular_path,
                f"gte(t,{t_sentence:.2f})",
            ))
            vf_parts.append(_build_drawtext(
                sentence_pinyin, cap_cfg.sentence_pinyin, font_path, font_regular_path,
                f"gte(t,{t_sentence:.2f})",
            ))
            vf_parts.append(_build_drawtext(
                sentence_en, cap_cfg.sentence_en, font_path, font_regular_path,
                f"gte(t,{t_sentence:.2f})",
            ))

        vf = ",".join(vf_parts)

        # Audio inputs
        q_audio_path = short_dir / state.tts_question_file
        answer_audio_path = short_dir / item.tts_answer_file

        q_delay = int(t_question * 1000)
        answer_delay = int(t_answer_reveal * 1000)

        if is_repeat:
            # Build audio: question + answer + each repeat clip
            audio_inputs = [
                "-i", str(q_audio_path),
                "-i", str(answer_audio_path),
            ]
            filter_parts = [
                f"[0:v]{vf}[vout]",
                f"[1:a]adelay={q_delay}|{q_delay}[qa]",
                f"[2:a]adelay={answer_delay}|{answer_delay}[aa]",
            ]
            mix_labels = ["[qa]", "[aa]"]
            input_idx = 3

            for n, t_rep in enumerate(repeat_offsets):
                rep_path = short_dir / item.tts_repeat_files[n]
                audio_inputs.extend(["-i", str(rep_path)])
                delay_ms = int(t_rep * 1000)
                label = f"[r{n}]"
                filter_parts.append(f"[{input_idx}:a]adelay={delay_ms}|{delay_ms}{label}")
                mix_labels.append(label)
                input_idx += 1

            n_inputs = len(mix_labels)
            filter_parts.append(
                f"{''.join(mix_labels)}amix=inputs={n_inputs}:dropout_transition=0:normalize=0[aout]"
            )
            filter_complex = ";".join(filter_parts)

            cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(img_path),
                *audio_inputs,
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-t", f"{total_duration:.3f}",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-shortest",
                str(seg_path),
            ]
        else:
            # Sentence mode audio
            sentence_audio_path = short_dir / item.tts_sentence_file
            sentence_delay = int(t_sentence * 1000)

            filter_complex = (
                f"[0:v]{vf}[vout];"
                f"[1:a]adelay={q_delay}|{q_delay}[qa];"
                f"[2:a]adelay={answer_delay}|{answer_delay}[aa];"
                f"[3:a]adelay={sentence_delay}|{sentence_delay}[sa];"
                f"[qa][aa][sa]amix=inputs=3:dropout_transition=0:normalize=0[aout]"
            )

            cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(img_path),
                "-i", str(q_audio_path),
                "-i", str(answer_audio_path),
                "-i", str(sentence_audio_path),
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-t", f"{total_duration:.3f}",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-shortest",
                str(seg_path),
            ]

        subprocess.run(cmd, check=True, capture_output=True)
        segment_paths.append(seg_path)

    # Concatenate + BGM + cleanup
    concat_video = _concat_segments(segment_paths, short_dir)
    _mix_bgm(concat_video, output_path, state.config)
    _cleanup_temp(segment_paths, short_dir)

    return output_file


# ---------------------------------------------------------------------------
# Timer circle generation (Pillow)
# ---------------------------------------------------------------------------

def _generate_timer_video(duration_s: float, fps: int, short_dir: Path) -> Path:
    """Generate a transparent-bg timer countdown video (150px circle, centered on 1080x1920)."""
    from PIL import Image, ImageDraw, ImageFont

    frames_dir = short_dir / "_timer_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    total_frames = int(duration_s * fps)
    size = 150  # circle diameter
    cx, cy = 540, 960  # center of 1080x1920 canvas
    r = size // 2

    # Try to use a system font for the countdown number
    try:
        font_path = FONTS_DIR / "NotoSansSC-Bold.otf"
        num_font = ImageFont.truetype(str(font_path), 60)
    except Exception:
        num_font = ImageFont.load_default()

    for f_idx in range(total_frames):
        progress = f_idx / max(total_frames - 1, 1)  # 0.0 -> 1.0
        seconds_left = max(1, math.ceil(duration_s * (1.0 - progress)))

        img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Draw circle outline (full ring as background, dim)
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            outline=(255, 255, 255, 60), width=6,
        )

        # Draw depleting arc (white, clockwise from top)
        start_angle = -90  # top
        sweep = 360 * (1.0 - progress)
        if sweep > 0:
            draw.arc(
                [cx - r, cy - r, cx + r, cy + r],
                start=start_angle,
                end=start_angle + sweep,
                fill=(255, 255, 255, 220),
                width=6,
            )

        # Draw countdown number
        num_text = str(seconds_left)
        bbox = draw.textbbox((0, 0), num_text, font=num_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(
            (cx - tw // 2, cy - th // 2 - bbox[1]),
            num_text, fill=(255, 255, 255, 200), font=num_font,
        )

        img.save(frames_dir / f"frame_{f_idx:04d}.png")

    # Assemble frames into a transparent video with FFmpeg
    timer_video = short_dir / "_timer.mov"
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", str(frames_dir / "frame_%04d.png"),
            "-c:v", "png",  # lossless with alpha
            "-pix_fmt", "rgba",
            str(timer_video),
        ],
        check=True,
        capture_output=True,
    )

    # Cleanup frames
    import shutil
    shutil.rmtree(frames_dir, ignore_errors=True)

    return timer_video


# ---------------------------------------------------------------------------
# "Which One Is Right?" theme
# ---------------------------------------------------------------------------

def _build_which_one_video(state: ShortState, short_dir: Path) -> str:
    """Build the "Which one is right?" short video (text-only, no images)."""
    output_file = "output.mp4"
    output_path = short_dir / output_file
    fps = 24

    font_bold = FONTS_DIR / "NotoSansSC-Bold.otf"
    font_regular = FONTS_DIR / "NotoSansSC-Regular.otf"
    if not font_bold.exists():
        font_bold = font_regular
    font_path = _ffmpeg_font_path(font_bold)
    font_regular_path = _ffmpeg_font_path(font_regular)

    timer_duration = state.config.timer_duration
    reveal_hold = state.config.reveal_hold
    end_pause = state.config.pause_between_items

    # Generate timer video once (reused across segments)
    timer_video = _generate_timer_video(timer_duration, fps, short_dir)

    segment_paths: list[Path] = []

    for i, item in enumerate(sorted(state.items, key=lambda x: x.order)):
        seg_path = short_dir / f"_seg_{i}.mp4"

        q_dur_s = state.tts_question_duration_ms / 1000.0
        pause_after_q = 0.5  # short pause before timer starts

        # Randomly decide which position (A or B) gets the correct sentence
        rng = random.Random(item.id)
        correct_is_a = rng.choice([True, False])

        if correct_is_a:
            sentence_a_zh = item.sentence_zh
            sentence_a_pinyin = item.sentence_pinyin
            sentence_b_zh = item.wrong_sentence_zh
            sentence_b_pinyin = item.wrong_sentence_pinyin
        else:
            sentence_a_zh = item.wrong_sentence_zh
            sentence_a_pinyin = item.wrong_sentence_pinyin
            sentence_b_zh = item.sentence_zh
            sentence_b_pinyin = item.sentence_pinyin

        # Timing
        t_question = 0.0
        t_show_sentences = q_dur_s + pause_after_q
        t_timer_start = t_show_sentences
        t_reveal = t_timer_start + timer_duration
        t_end = t_reveal + reveal_hold + end_pause
        total_duration = t_end

        frames = int(total_duration * fps)
        if frames < 1:
            frames = fps

        # Video filter: black background + text overlays
        vf_parts = [
            f"color=c=black:s=1080x1920:d={total_duration:.3f}:r={fps}",
        ]

        # Word display at top
        word_zh = escape_ffmpeg_text(item.word_zh)
        word_pinyin = escape_ffmpeg_text(item.word_pinyin)
        word_en = escape_ffmpeg_text(item.word_en)

        vf_parts.append(_build_drawtext_raw(
            word_zh, font_path, 100, "#FFFFFF",
            "(w-text_w)/2", "180",
            f"gte(t,{t_question:.2f})",
            borderw=3, bordercolor="#000000",
        ))
        vf_parts.append(_build_drawtext_raw(
            word_pinyin, font_regular_path, 36, "#AAAAAA",
            "(w-text_w)/2", "300",
            f"gte(t,{t_question:.2f})",
        ))
        vf_parts.append(_build_drawtext_raw(
            word_en, font_regular_path, 32, "#888888",
            "(w-text_w)/2", "350",
            f"gte(t,{t_question:.2f})",
        ))

        # Question text "哪个对？"
        q_text = escape_ffmpeg_text("哪个对？")
        vf_parts.append(_build_drawtext_raw(
            q_text, font_path, 64, "#FFFFFF",
            "(w-text_w)/2", "440",
            f"between(t,{t_question:.2f},{t_show_sentences:.2f})",
            borderw=2, bordercolor="#000000",
        ))

        # Sentence A label
        a_label = escape_ffmpeg_text("A.")
        vf_parts.append(_build_drawtext_raw(
            a_label, font_path, 48, "#FFFFFF",
            "60", "580",
            f"gte(t,{t_show_sentences:.2f})",
            borderw=2, bordercolor="#000000",
        ))

        # Sentence A text — before reveal: white, after reveal: green if correct, red if wrong
        a_zh = escape_ffmpeg_text(sentence_a_zh)
        a_color_before = "#FFFFFF"
        a_color_after = "#44FF88" if correct_is_a else "#FF4444"

        vf_parts.append(_build_drawtext_raw(
            a_zh, font_path, 42, a_color_before,
            "(w-text_w)/2", "650",
            f"between(t,{t_show_sentences:.2f},{t_reveal:.2f})",
            borderw=2, bordercolor="#000000",
        ))
        vf_parts.append(_build_drawtext_raw(
            a_zh, font_path, 42, a_color_after,
            "(w-text_w)/2", "650",
            f"gte(t,{t_reveal:.2f})",
            borderw=2, bordercolor="#000000",
        ))

        # Sentence A pinyin (after reveal only)
        a_pinyin = escape_ffmpeg_text(sentence_a_pinyin)
        vf_parts.append(_build_drawtext_raw(
            a_pinyin, font_regular_path, 28, "#AAAAAA",
            "(w-text_w)/2", "710",
            f"gte(t,{t_reveal:.2f})",
        ))

        # Sentence B label
        b_label = escape_ffmpeg_text("B.")
        vf_parts.append(_build_drawtext_raw(
            b_label, font_path, 48, "#FFFFFF",
            "60", "800",
            f"gte(t,{t_show_sentences:.2f})",
            borderw=2, bordercolor="#000000",
        ))

        # Sentence B text — same color logic but inverted
        b_zh = escape_ffmpeg_text(sentence_b_zh)
        b_color_before = "#FFFFFF"
        b_color_after = "#44FF88" if not correct_is_a else "#FF4444"

        vf_parts.append(_build_drawtext_raw(
            b_zh, font_path, 42, b_color_before,
            "(w-text_w)/2", "870",
            f"between(t,{t_show_sentences:.2f},{t_reveal:.2f})",
            borderw=2, bordercolor="#000000",
        ))
        vf_parts.append(_build_drawtext_raw(
            b_zh, font_path, 42, b_color_after,
            "(w-text_w)/2", "870",
            f"gte(t,{t_reveal:.2f})",
            borderw=2, bordercolor="#000000",
        ))

        # Sentence B pinyin (after reveal)
        b_pinyin = escape_ffmpeg_text(sentence_b_pinyin)
        vf_parts.append(_build_drawtext_raw(
            b_pinyin, font_regular_path, 28, "#AAAAAA",
            "(w-text_w)/2", "930",
            f"gte(t,{t_reveal:.2f})",
        ))

        # Correct/wrong markers after reveal
        correct_marker = escape_ffmpeg_text("✓")
        wrong_marker = escape_ffmpeg_text("✗")
        if correct_is_a:
            vf_parts.append(_build_drawtext_raw(
                correct_marker, font_path, 48, "#44FF88", "960", "580",
                f"gte(t,{t_reveal:.2f})",
            ))
            vf_parts.append(_build_drawtext_raw(
                wrong_marker, font_path, 48, "#FF4444", "960", "800",
                f"gte(t,{t_reveal:.2f})",
            ))
        else:
            vf_parts.append(_build_drawtext_raw(
                wrong_marker, font_path, 48, "#FF4444", "960", "580",
                f"gte(t,{t_reveal:.2f})",
            ))
            vf_parts.append(_build_drawtext_raw(
                correct_marker, font_path, 48, "#44FF88", "960", "800",
                f"gte(t,{t_reveal:.2f})",
            ))

        # Error explanation after reveal
        explanation = escape_ffmpeg_text(item.image_prompt)  # repurposed field
        if explanation:
            vf_parts.append(_build_drawtext_raw(
                explanation, font_regular_path, 24, "#FFFF44",
                "(w-text_w)/2", "1050",
                f"gte(t,{t_reveal:.2f})",
                borderw=1, bordercolor="#000000",
            ))

        # Build the video filter: first part is color source, rest are drawtext
        # color source is input [0] for this approach; we use it as a virtual input
        # Since we use color= as the video source, the filter chain works differently
        vf_chain = vf_parts[0]  # color=...
        for dt in vf_parts[1:]:
            vf_chain += "," + dt

        # Overlay timer video during countdown phase
        # Input [0] = timer video (.mov with alpha)
        # Input [1] = question audio (.mp3)
        # color= source is generated inline in the filter graph
        q_audio_path = short_dir / state.tts_question_file
        q_delay = int(t_question * 1000)

        filter_complex = (
            f"{vf_chain}[base];"
            f"[0:v]setpts=PTS+{t_timer_start:.3f}/TB[timer];"
            f"[base][timer]overlay=0:0:enable='between(t,{t_timer_start:.2f},{t_reveal:.2f})'[vout];"
            f"[1:a]adelay={q_delay}|{q_delay},apad=whole_dur={total_duration:.3f}[aout]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", str(timer_video),
            "-i", str(q_audio_path),
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "[aout]",
            "-c:v", "libx264",
            "-t", f"{total_duration:.3f}",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            str(seg_path),
        ]

        subprocess.run(cmd, check=True, capture_output=True)
        segment_paths.append(seg_path)

    # Concatenate + BGM + cleanup
    concat_video = _concat_segments(segment_paths, short_dir)
    _mix_bgm(concat_video, output_path, state.config)
    _cleanup_temp(segment_paths, short_dir)

    # Cleanup timer video
    if timer_video.exists():
        timer_video.unlink(missing_ok=True)

    return output_file


# ---------------------------------------------------------------------------
# Top-level dispatcher
# ---------------------------------------------------------------------------

def build_short_video(state: ShortState, short_dir: Path) -> str:
    """Build the full vertical short video, dispatching by theme."""
    if state.theme == "which_one":
        return _build_which_one_video(state, short_dir)
    else:
        return _build_whats_this_video(state, short_dir)
