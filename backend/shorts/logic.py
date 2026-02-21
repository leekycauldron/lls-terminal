import base64
import os
import subprocess
import uuid
from pathlib import Path

from config import SHORTS_CODE_DIR
from services.llm import generate_json
from services.elevenlabs import generate_tts as el_generate_tts, get_audio_duration_ms
from services.openai_images import get_client as get_openai_client
from shorts.models import ShortState, ShortConfig, FlashcardItem

IS_WINDOWS = os.name == "nt"

PROMPTS_DIR = SHORTS_CODE_DIR / "prompts"
FONTS_DIR = SHORTS_CODE_DIR / "fonts"
MUSIC_DIR = SHORTS_CODE_DIR / "music"


def generate_word_list(state: ShortState, count: int = 6) -> list[FlashcardItem]:
    """Use LLM to generate vocabulary items for a topic."""
    prompt_template = (PROMPTS_DIR / "generate_wordlist.txt").read_text()
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
    """Generate TTS for the answer word and example sentence."""
    # Answer TTS (just the word)
    answer_file = f"audio/answer_{item.id}.mp3"
    answer_path = short_dir / answer_file
    duration = el_generate_tts(
        config.voice_id, item.word_zh, answer_path, speed=config.tts_speed
    )
    item.tts_answer_file = answer_file
    item.tts_answer_duration_ms = duration

    # Sentence TTS
    sentence_file = f"audio/sentence_{item.id}.mp3"
    sentence_path = short_dir / sentence_file
    duration = el_generate_tts(
        config.voice_id, item.sentence_zh, sentence_path, speed=config.tts_speed
    )
    item.tts_sentence_file = sentence_file
    item.tts_sentence_duration_ms = duration

    item.tts_generated = True


def generate_question_tts(config: ShortConfig, short_dir: Path) -> tuple[str, int]:
    """Generate the shared '这是什么？' TTS clip. Returns (file, duration_ms)."""
    q_file = "audio/question.mp3"
    q_path = short_dir / q_file
    duration = el_generate_tts(
        config.voice_id, "这是什么？", q_path, speed=config.tts_speed
    )
    return q_file, duration


def _ffmpeg_font_path(path: Path) -> str:
    """Format a font path for FFmpeg drawtext, handling Windows drive letters."""
    # FFmpeg drawtext on all platforms uses forward slashes and needs colons escaped.
    # On Windows, C:\foo\bar.otf -> C\\:/foo/bar.otf  (escape the colon, use /)
    s = str(path).replace("\\", "/")
    # Escape colons (catches Windows drive letter C: and any others)
    s = s.replace(":", "\\:")
    return s


def escape_ffmpeg_text(text: str) -> str:
    """Escape special characters for FFmpeg drawtext filter."""
    # FFmpeg drawtext needs escaping for: \ ' : %
    text = text.replace("\\", "\\\\")
    text = text.replace("'", "'\\''")
    text = text.replace(":", "\\:")
    text = text.replace("%", "%%")
    return text


def build_short_video(state: ShortState, short_dir: Path) -> str:
    """Build the full vertical short video using FFmpeg."""
    output_file = "output.mp4"
    output_path = short_dir / output_file
    fps = 24

    # Find font files
    font_bold = FONTS_DIR / "NotoSansSC-Bold.otf"
    font_regular = FONTS_DIR / "NotoSansSC-Regular.otf"
    if not font_bold.exists():
        font_bold = font_regular
    font_path = _ffmpeg_font_path(font_bold)
    font_regular_path = _ffmpeg_font_path(font_regular)

    # Build per-item video segments
    segment_paths: list[Path] = []

    for i, item in enumerate(sorted(state.items, key=lambda x: x.order)):
        seg_path = short_dir / f"_seg_{i}.mp4"

        # Timing calculations
        q_dur_s = state.tts_question_duration_ms / 1000.0
        pause_after_q = 0.5
        answer_dur_s = item.tts_answer_duration_ms / 1000.0
        pause_after_answer = 0.3
        sentence_dur_s = item.tts_sentence_duration_ms / 1000.0
        end_pause = 0.5

        # Time offsets for events
        t_question = 0.0
        t_answer_reveal = q_dur_s + pause_after_q
        t_sentence = t_answer_reveal + answer_dur_s + pause_after_answer
        t_end = t_sentence + sentence_dur_s + end_pause
        total_duration = t_end

        frames = int(total_duration * fps)
        if frames < 1:
            frames = fps  # minimum 1 second

        img_path = short_dir / item.image_file
        if not img_path.exists():
            raise FileNotFoundError(f"Image not found: {img_path}")

        # Build zoompan for vertical 1080x1920 canvas
        z_start = 1.0
        z_end = 1.08
        # Image occupies top ~60% of frame, text area below
        vf_parts = [
            # Scale up, then zoompan for Ken Burns on top portion
            f"scale=4320:4320,zoompan="
            f"z='({z_start})+({z_end}-{z_start})*(on/{frames})':"
            f"x='trunc(iw/2-(iw/zoom/2))':y='trunc(ih/2-(ih/zoom/2))':"
            f"d={frames}:s=1080x1080:fps={fps}",
            # Pad to 1080x1920 (image at top, black below)
            "pad=1080:1920:0:0:black",
        ]

        # Text overlays
        q_text = escape_ffmpeg_text("这是什么？")
        word_zh = escape_ffmpeg_text(item.word_zh)
        word_pinyin = escape_ffmpeg_text(item.word_pinyin)
        word_en = escape_ffmpeg_text(item.word_en)
        sentence_zh = escape_ffmpeg_text(item.sentence_zh)
        sentence_pinyin = escape_ffmpeg_text(item.sentence_pinyin)
        sentence_en = escape_ffmpeg_text(item.sentence_en)

        # Question text (top area, over image)
        vf_parts.append(
            f"drawtext=text='{q_text}':"
            f"fontfile='{font_path}':"
            f"fontsize=72:fontcolor=white:borderw=3:bordercolor=black:"
            f"x=(w-text_w)/2:y=100:"
            f"enable='between(t,{t_question:.2f},{t_answer_reveal:.2f})'"
        )

        # Answer word (large, center of bottom area)
        vf_parts.append(
            f"drawtext=text='{word_zh}':"
            f"fontfile='{font_path}':"
            f"fontsize=96:fontcolor=white:"
            f"x=(w-text_w)/2:y=1120:"
            f"enable='gte(t,{t_answer_reveal:.2f})'"
        )

        # Pinyin (below word)
        vf_parts.append(
            f"drawtext=text='{word_pinyin}':"
            f"fontfile='{font_regular_path}':"
            f"fontsize=48:fontcolor=#AAAAAA:"
            f"x=(w-text_w)/2:y=1240:"
            f"enable='gte(t,{t_answer_reveal:.2f})'"
        )

        # English (below pinyin)
        vf_parts.append(
            f"drawtext=text='{word_en}':"
            f"fontfile='{font_regular_path}':"
            f"fontsize=40:fontcolor=#888888:"
            f"x=(w-text_w)/2:y=1310:"
            f"enable='gte(t,{t_answer_reveal:.2f})'"
        )

        # Example sentence (bottom third)
        vf_parts.append(
            f"drawtext=text='{sentence_zh}':"
            f"fontfile='{font_path}':"
            f"fontsize=44:fontcolor=white:"
            f"x=(w-text_w)/2:y=1500:"
            f"enable='gte(t,{t_sentence:.2f})'"
        )

        # Sentence pinyin
        vf_parts.append(
            f"drawtext=text='{sentence_pinyin}':"
            f"fontfile='{font_regular_path}':"
            f"fontsize=32:fontcolor=#AAAAAA:"
            f"x=(w-text_w)/2:y=1570:"
            f"enable='gte(t,{t_sentence:.2f})'"
        )

        # Sentence English
        vf_parts.append(
            f"drawtext=text='{sentence_en}':"
            f"fontfile='{font_regular_path}':"
            f"fontsize=28:fontcolor=#888888:"
            f"x=(w-text_w)/2:y=1620:"
            f"enable='gte(t,{t_sentence:.2f})'"
        )

        vf = ",".join(vf_parts)

        # Build audio for this segment: question + answer + sentence at correct offsets
        q_audio_path = short_dir / state.tts_question_file
        answer_audio_path = short_dir / item.tts_answer_file
        sentence_audio_path = short_dir / item.tts_sentence_file

        # Delay values in ms
        q_delay = int(t_question * 1000)
        answer_delay = int(t_answer_reveal * 1000)
        sentence_delay = int(t_sentence * 1000)

        filter_complex = (
            f"[0:v]{vf}[vout];"
            f"[1:a]adelay={q_delay}|{q_delay}[qa];"
            f"[2:a]adelay={answer_delay}|{answer_delay}[aa];"
            f"[3:a]adelay={sentence_delay}|{sentence_delay}[sa];"
            f"[qa][aa][sa]amix=inputs=3:dropout_transition=0:normalize=0[aout]"
        )

        subprocess.run(
            [
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
            ],
            check=True,
            capture_output=True,
        )
        segment_paths.append(seg_path)

    # Concatenate all segments
    concat_list = short_dir / "_concat.txt"
    # FFmpeg concat demuxer: use forward slashes, no single quotes on Windows
    if IS_WINDOWS:
        concat_list.write_text(
            "\n".join(f"file {p.name}" for p in segment_paths)
        )
    else:
        concat_list.write_text(
            "\n".join(f"file '{p.name}'" for p in segment_paths)
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

    # Mix in background music if configured
    music_path = None
    if state.config.music_file:
        music_path = MUSIC_DIR / state.config.music_file
    if not music_path or not music_path.exists():
        # Try default
        default_music = MUSIC_DIR / "default_bgm.mp3"
        if default_music.exists():
            music_path = default_music

    if music_path and music_path.exists():
        vol = state.config.music_volume
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

    # Cleanup temp files
    for p in segment_paths:
        p.unlink(missing_ok=True)
    concat_list.unlink(missing_ok=True)
    if concat_video.exists():
        concat_video.unlink(missing_ok=True)

    return output_file
