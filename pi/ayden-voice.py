#!/usr/bin/env python3
"""Ayden Voice Pipeline — Pi 5
Wake word → Record → Deepgram STT → Ayden /api/chat → ElevenLabs TTS → Speaker
"""

import os
import sys
import wave
import json
import struct
import tempfile
import numpy as np
import pyaudio
import requests
from pathlib import Path
from dotenv import load_dotenv
from scipy.signal import resample

# Load env from .env file in same directory
load_dotenv(Path(__file__).parent / ".env")

DEEPGRAM_API_KEY = os.environ["DEEPGRAM_API_KEY"]
ELEVENLABS_API_KEY = os.environ["ELEVENLABS_API_KEY"]
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "AKU6kambSI3cFIhXQffc")
AYDEN_API_URL = os.environ.get("AYDEN_API_URL", "https://www.exitframe.org/api/chat")
VOICE_API_SECRET = os.environ["VOICE_API_SECRET"]

# Audio config
MIC_SAMPLE_RATE = 44100  # Blue Yeti native rate
STT_SAMPLE_RATE = 16000  # Deepgram expects 16kHz
CHANNELS = 1
CHUNK = 1024
FORMAT = pyaudio.paInt16

# Wake word — openwakeword expects 16kHz, so we record at 44100 and downsample
WAKE_WORD_MODEL = "hey_jarvis"  # Placeholder until "Hey Ayden" custom model
OWW_CHUNK = 1280  # openWakeWord expects 80ms frames at 16kHz = 1280 samples

# Silence detection for end-of-speech
SILENCE_THRESHOLD = 100  # RMS amplitude (Blue Yeti at 44100Hz)
SILENCE_DURATION = 1.5  # seconds of silence before stopping
MAX_RECORD_SECONDS = 15  # safety cap


def find_device(pa, keyword, input_device=True):
    """Find audio device by name keyword."""
    for i in range(pa.get_device_count()):
        info = pa.get_device_info_by_index(i)
        name = info.get("name", "").lower()
        if keyword.lower() in name:
            if input_device and info["maxInputChannels"] > 0:
                return i
            if not input_device and info["maxOutputChannels"] > 0:
                return i
    return None


def rms(data):
    """Calculate RMS of audio data."""
    shorts = struct.unpack(f"<{len(data)//2}h", data)
    return (sum(s * s for s in shorts) / len(shorts)) ** 0.5


def downsample(audio_int16, from_rate, to_rate):
    """Downsample audio from from_rate to to_rate."""
    num_samples = int(len(audio_int16) * to_rate / from_rate)
    return resample(audio_int16.astype(np.float32), num_samples).astype(np.int16)


def listen_for_wake_word(pa, mic_index):
    """Block until wake word is detected."""
    from openwakeword import Model, get_pretrained_model_paths

    print("[wake] Loading wake word model...")
    model_paths = [p for p in get_pretrained_model_paths() if WAKE_WORD_MODEL in p]
    if not model_paths:
        print(f"[error] Wake word model '{WAKE_WORD_MODEL}' not found.")
        sys.exit(1)
    model = Model(wakeword_model_paths=model_paths)

    # Record at mic's native rate, downsample for wake word detection
    mic_chunk = int(CHUNK * MIC_SAMPLE_RATE / STT_SAMPLE_RATE)  # ~2822 samples at 44100
    stream = pa.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=MIC_SAMPLE_RATE,
        input=True,
        input_device_index=mic_index,
        frames_per_buffer=mic_chunk,
    )

    print(f'[wake] Listening for "Hey Jarvis"...')

    try:
        while True:
            audio = stream.read(mic_chunk, exception_on_overflow=False)
            audio_44k = np.frombuffer(audio, dtype=np.int16)
            # Downsample to 16kHz for wake word model
            audio_16k = downsample(audio_44k, MIC_SAMPLE_RATE, STT_SAMPLE_RATE)
            prediction = model.predict(audio_16k)

            for key, score in prediction.items():
                if score > 0.5:
                    print(f"[wake] Detected! ({key}: {score:.2f})")
                    stream.stop_stream()
                    stream.close()
                    return True
    except KeyboardInterrupt:
        stream.stop_stream()
        stream.close()
        raise


def record_speech(pa, mic_index):
    """Record at mic native rate until silence. Returns WAV bytes at 16kHz for STT."""
    stream = pa.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=MIC_SAMPLE_RATE,
        input=True,
        input_device_index=mic_index,
        frames_per_buffer=CHUNK,
    )

    print("[record] Listening... (speak now)")
    frames = []
    silent_chunks = 0
    chunks_per_second = MIC_SAMPLE_RATE / CHUNK
    silence_limit = int(SILENCE_DURATION * chunks_per_second)
    max_chunks = int(MAX_RECORD_SECONDS * chunks_per_second)
    started = False

    for _ in range(max_chunks):
        data = stream.read(CHUNK, exception_on_overflow=False)
        frames.append(data)
        level = rms(data)

        if level > SILENCE_THRESHOLD:
            started = True
            silent_chunks = 0
        elif started:
            silent_chunks += 1
            if silent_chunks >= silence_limit:
                print("[record] Silence detected, stopping.")
                break

    stream.stop_stream()
    stream.close()

    # Combine all frames and downsample to 16kHz
    raw = b"".join(frames)
    audio_44k = np.frombuffer(raw, dtype=np.int16)
    audio_16k = downsample(audio_44k, MIC_SAMPLE_RATE, STT_SAMPLE_RATE)

    # Write 16kHz WAV
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    with wave.open(tmp.name, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(STT_SAMPLE_RATE)
        wf.writeframes(audio_16k.tobytes())

    with open(tmp.name, "rb") as f:
        wav_bytes = f.read()
    os.unlink(tmp.name)

    duration = len(audio_44k) / MIC_SAMPLE_RATE
    print(f"[record] Captured {duration:.1f}s")
    return wav_bytes


def transcribe(wav_bytes):
    """Send audio to Deepgram, return transcript text."""
    print("[stt] Sending to Deepgram...")
    resp = requests.post(
        "https://api.deepgram.com/v1/listen",
        headers={
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "audio/wav",
        },
        params={
            "model": "nova-2",
            "language": "en",
            "smart_format": "true",
        },
        data=wav_bytes,
    )
    resp.raise_for_status()
    result = resp.json()
    transcript = result["results"]["channels"][0]["alternatives"][0]["transcript"]
    print(f"[stt] Transcript: {transcript}")
    return transcript


def chat_with_ayden(text):
    """Send text to Ayden's /api/chat endpoint, return her response text."""
    print(f"[chat] Sending to Ayden: {text}")

    resp = requests.post(
        AYDEN_API_URL,
        headers={
            "Content-Type": "application/json",
            "x-voice-secret": VOICE_API_SECRET,
        },
        json={
            "messages": [{"role": "user", "content": text}],
            "context": {"page": "chat"},
        },
        stream=True,
    )
    resp.raise_for_status()

    # Parse SSE stream to extract the full response
    full_text = ""
    for line in resp.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        data = line[6:]  # strip "data: "
        if data == "[DONE]":
            break
        try:
            parsed = json.loads(data)
            if parsed.get("type") == "text":
                full_text += parsed.get("content", "")
        except json.JSONDecodeError:
            continue

    print(f"[chat] Ayden: {full_text[:100]}...")
    return full_text


def speak(text, pa, speaker_index):
    """Convert text to speech via ElevenLabs and play through speakers."""
    print("[tts] Generating speech...")

    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
        headers={
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model_id": "eleven_flash_v2_5",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        },
    )
    resp.raise_for_status()

    # ElevenLabs returns MP3 — convert to WAV for ALSA playback
    mp3_tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    mp3_tmp.write(resp.content)
    mp3_tmp.close()

    wav_tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    wav_tmp.close()

    os.system(f"ffmpeg -y -i {mp3_tmp.name} -ar 44100 -ac 2 {wav_tmp.name} 2>/dev/null")
    os.unlink(mp3_tmp.name)

    print("[tts] Playing response...")
    os.system(f"aplay -D plughw:2,0 {wav_tmp.name} 2>/dev/null")
    os.unlink(wav_tmp.name)
    print("[tts] Done.")


def main():
    print("=" * 50)
    print("  Ayden Voice Pipeline")
    print("  Wake word: Hey Jarvis (temporary)")
    print("=" * 50)

    pa = pyaudio.PyAudio()

    # Find devices
    mic_index = find_device(pa, "yeti", input_device=True)
    speaker_index = find_device(pa, "ab13x", input_device=False)

    if mic_index is None:
        print("[error] Blue Yeti not found. Available input devices:")
        for i in range(pa.get_device_count()):
            info = pa.get_device_info_by_index(i)
            if info["maxInputChannels"] > 0:
                print(f"  [{i}] {info['name']}")
        sys.exit(1)

    if speaker_index is None:
        print("[warn] AB13X speakers not found, using default output.")

    print(f"[init] Mic: device {mic_index}")
    print(f"[init] Speaker: device {speaker_index}")
    print()

    while True:
        try:
            listen_for_wake_word(pa, mic_index)
            wav_bytes = record_speech(pa, mic_index)
            transcript = transcribe(wav_bytes)

            if not transcript.strip():
                print("[skip] Empty transcript, going back to listening.")
                continue

            response = chat_with_ayden(transcript)

            if response.strip():
                speak(response, pa, speaker_index)

            print()  # blank line before next cycle

        except KeyboardInterrupt:
            print("\n[exit] Shutting down.")
            break
        except Exception as e:
            print(f"[error] {e}")
            continue

    pa.terminate()


if __name__ == "__main__":
    main()
