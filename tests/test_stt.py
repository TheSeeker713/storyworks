"""STT connector status + optional live transcription proof."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from engine.connectors.stt import stt_status, transcribe_file

SAMPLE = Path(__file__).resolve().parents[1] / "tmp" / "stt" / "sample.wav"


def test_stt_status_reports_working_after_voice_env_repair():
    status = stt_status()
    assert status["installed"] is True
    assert status["state"] == "working"
    assert status["ok"] is True


@pytest.mark.skipif(not SAMPLE.is_file(), reason="sample wav missing; generate in 0.5 prove step")
def test_stt_transcribe_sample_locally():
    if os.environ.get("STORYWORKS_SKIP_LIVE_STT") == "1":
        pytest.skip("live stt skipped")
    result = transcribe_file(SAMPLE)
    assert result["ok"] is True
    text = (result.get("text") or "").lower()
    assert "storyworks" in text or "speech" in text or "local" in text
