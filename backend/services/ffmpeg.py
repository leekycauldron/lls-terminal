import json
import os
import subprocess
from pathlib import Path

IS_WINDOWS = os.name == "nt"


def get_audio_duration_ms(path: Path) -> int:
    """Get audio duration in milliseconds using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    info = json.loads(result.stdout)
    duration_s = float(info["format"]["duration"])
    return int(duration_s * 1000)


def build_video(clips: list[dict], episode_dir: Path) -> Path:
    """
    Build video from scene images and audio clips.

    clips: list of dicts with keys:
        type: "scene" | "audio"
        source_file: relative path from episode_dir
        start_ms: start time in ms
        duration_ms: duration in ms
        track: "scenes" | "audio"

    Returns path to output MP4.
    """
    output_path = episode_dir / "output.mp4"

    # Separate scene and audio clips
    scene_clips = sorted(
        [c for c in clips if c["track"] == "scenes"],
        key=lambda c: c["start_ms"],
    )
    audio_clips = sorted(
        [c for c in clips if c["track"] == "audio"],
        key=lambda c: c["start_ms"],
    )

    if not scene_clips:
        raise ValueError("No scene clips to render")

    VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}

    # Step 1: Create video segments from each scene image or video
    segment_paths = []
    for i, sc in enumerate(scene_clips):
        src_path = episode_dir / sc["source_file"]
        if not src_path.exists():
            raise FileNotFoundError(f"Scene source not found: {src_path}")

        seg_path = episode_dir / f"_seg_{i}.mp4"
        duration_s = sc["duration_ms"] / 1000.0
        fps = 24

        if src_path.suffix.lower() in VIDEO_EXTENSIONS:
            # Video input: scale to exact 1920x1080, strip audio
            vf = "scale=1920:1080"
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", str(src_path),
                    "-vf", vf,
                    "-r", str(fps),
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-an",
                    str(seg_path),
                ],
                check=True,
                capture_output=True,
            )
        else:
            # Image input: zoompan Ken Burns effect
            frames = int(duration_s * fps)
            z_start = sc.get("zoom_start", 1.0)
            z_end = sc.get("zoom_end", 1.1)

            vf = (
                f"scale=7680:4320,zoompan="
                f"z='({z_start})+({z_end}-{z_start})*(on/{frames})':"
                f"x='trunc(iw/2-(iw/zoom/2))':y='trunc(ih/2-(ih/zoom/2))':"
                f"d={frames}:s=1920x1080:fps={fps}"
            )

            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-loop", "1",
                    "-i", str(src_path),
                    "-c:v", "libx264",
                    "-t", f"{duration_s:.3f}",
                    "-pix_fmt", "yuv420p",
                    "-vf", vf,
                    str(seg_path),
                ],
                check=True,
                capture_output=True,
            )
        segment_paths.append(seg_path)

    # Step 2: Concatenate scene segments
    concat_list = episode_dir / "_concat.txt"
    if IS_WINDOWS:
        concat_list.write_text(
            "\n".join(f"file {p.name}" for p in segment_paths)
        )
    else:
        concat_list.write_text(
            "\n".join(f"file '{p.name}'" for p in segment_paths)
        )
    concat_video = episode_dir / "_concat.mp4"
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

    # Step 3: Mix in audio clips
    if audio_clips:
        audio_inputs = []
        filter_parts = []
        input_idx = 1  # 0 is video

        for ac in audio_clips:
            audio_path = episode_dir / ac["source_file"]
            if not audio_path.exists():
                continue
            audio_inputs.extend(["-i", str(audio_path)])
            delay_ms = ac["start_ms"]
            filter_parts.append(
                f"[{input_idx}:a]adelay={delay_ms}|{delay_ms}[a{input_idx}]"
            )
            input_idx += 1

        if filter_parts:
            # Mix all audio tracks
            mix_inputs = "".join(f"[a{i}]" for i in range(1, input_idx))
            filter_complex = ";".join(filter_parts) + f";{mix_inputs}amix=inputs={input_idx - 1}:dropout_transition=0:normalize=0[aout]"

            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", str(concat_video),
                    *audio_inputs,
                    "-filter_complex", filter_complex,
                    "-map", "0:v",
                    "-map", "[aout]",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    str(output_path),
                ],
                check=True,
                capture_output=True,
            )
        else:
            # No valid audio, just copy
            concat_video.rename(output_path)
    else:
        concat_video.rename(output_path)

    # Cleanup temp files
    for p in segment_paths:
        p.unlink(missing_ok=True)
    concat_list.unlink(missing_ok=True)
    if concat_video.exists():
        concat_video.unlink(missing_ok=True)

    return output_path
