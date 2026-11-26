"""Offline English transcription. stdout is a private JSON-lines pipe, never a log."""
import errno
import json
import os
import sys

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

FORMATS = {
    "wav": "wav", "mp3": "mp3", "aac": "aac", "flac": "flac", "ogg": "ogg",
    "opus": "ogg", "m4a": "mov", "mp4": "mov", "mkv": "matroska", "webm": "matroska",
}
RATE = 16000
MAX_SECONDS = 7200


def emit(kind, **fields):
    print(json.dumps({"type": kind, **fields}, allow_nan=False), flush=True)


class ASRError(Exception):
    pass


def decode(file, av, np):
    pieces, count = [], 0
    try:
        # Explicit demuxers exclude playlist/network formats. The file object supplies
        # the sole input; FFmpeg protocols (including nested file/HTTP) are disabled.
        with open(file, "rb") as media, av.open(
            media, format=FORMATS[file.rsplit(".", 1)[-1]],
            options={"protocol_whitelist": "none"},
        ) as container:
            if not container.streams.audio:
                raise ASRError("asr_media")
            resampler = av.AudioResampler(format="fltp", layout="mono", rate=RATE)

            def append(frames):
                nonlocal count
                for frame in frames:
                    samples = frame.to_ndarray().reshape(-1)
                    count += len(samples)
                    if count > MAX_SECONDS * RATE:
                        raise ASRError("asr_duration")
                    pieces.append(samples)

            for frame in container.decode(audio=0):
                append(resampler.resample(frame))
            append(resampler.resample(None))
    except (av.FFmpegError, ValueError) as exc:
        raise ASRError("asr_media") from exc
    if not pieces:
        raise ASRError("asr_media")
    return np.concatenate(pieces)


def transcribe(file, model_path, *, device=None):
    try:
        import av
        import ctranslate2
        import numpy as np
        from faster_whisper import WhisperModel
    except (ImportError, OSError) as exc:
        raise ASRError("asr_setup") from exc

    emit("progress", stage="decoding")
    audio = decode(file, av, np)
    if np.max(np.abs(audio)) < 0.0001:
        raise ASRError("asr_silence")
    emit("progress", stage="loading")
    if device is None:
        try:
            device = "cuda" if ctranslate2.get_cuda_device_count() else "cpu"
        except RuntimeError:
            device = "cpu"
    for candidate in (["cuda", "cpu"] if device == "cuda" else ["cpu"]):
        try:
            model = WhisperModel(
                model_path, device=candidate, compute_type="float16" if candidate == "cuda" else "int8",
                cpu_threads=min(8, os.cpu_count() or 1), local_files_only=True,
            )
            emit("progress", stage="transcribing", percent=0)
            segments, info = model.transcribe(
                audio, language="en", beam_size=5, vad_filter=True,
                condition_on_previous_text=False,
            )
            cues, last = [], -1
            for segment in segments:
                if segment.text.strip() and segment.end > segment.start:
                    cues.append({"start": segment.start, "end": segment.end, "en": segment.text.strip()})
                percent = int(100 * segment.end / info.duration)
                if percent > last:
                    emit("progress", stage="transcribing", percent=percent)
                    last = percent
            if not cues:
                raise ASRError("asr_silence")
            return cues, candidate
        except RuntimeError:
            if candidate != "cuda":
                raise


if __name__ == "__main__":
    try:
        dlls = []
        if os.name == "nt":
            for directory in os.environ.get("PATH", "").split(os.pathsep):
                if os.path.isabs(directory) and any(os.path.isfile(os.path.join(directory, dll)) for dll in ("cublas64_12.dll", "cudnn64_9.dll")):
                    try:
                        dlls.append(os.add_dll_directory(directory))
                    except OSError:
                        pass
        cues, _ = transcribe(*sys.argv[1:])
        emit("result", cues=cues)
    except ASRError as exc:
        emit("error", code=str(exc))
        sys.exit(1)
    except OSError as exc:
        emit("error", code="asr_disk" if exc.errno in (errno.ENOSPC, errno.EDQUOT) else "asr_engine")
        sys.exit(1)
    except Exception:
        emit("error", code="asr_engine")
        sys.exit(1)
