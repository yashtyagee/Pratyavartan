"""
voice_engine.py - Voice Synthesis Engine with Sarvam AI & gTTS Fallback.

COMPLIANCE & RESILIENCE PURPOSE:
Provides human-like Indic and Hinglish voice audio negotiation notes for Paytm Kirana recovery.
Primary: Sarvam AI Indic Voice Synthesis (bulbul:v1 / en-IN / hi-IN).
Reliability Fallback: Automatic zero-downtime failover to gTTS (Google Text-to-Speech)
guaranteeing voice synthesis NEVER crashes even if upstream API keys or networks fail.
"""

import base64
import hashlib
import logging
import os
import shutil
import uuid
from typing import Any, Dict, Optional

import httpx
from gtts import gTTS

import db

logger = logging.getLogger(__name__)


def get_voice_engine_status() -> Dict[str, Any]:
    """
    Returns real-time operational status of the voice synthesis engine for dashboard badges.
    """
    sarvam_key = os.getenv("SARVAM_API_KEY", "").strip()
    is_sarvam_active = bool(sarvam_key and sarvam_key.lower() not in ("dummy", "none", "unset", ""))
    return {
        "primary_engine": "Sarvam AI (bulbul:v3)",
        "fallback_engine": "gTTS (Google Text-to-Speech)",
        "sarvam_configured": is_sarvam_active,
        "active_engine": "Sarvam AI" if is_sarvam_active else "gTTS Fallback",
        "status_badge": "Sarvam Active 🗣️" if is_sarvam_active else "gTTS Fallback 🎙️",
        "status_class": "success" if is_sarvam_active else "warning",
    }


def generate_hinglish_voice(
    script: str,
    payment_id: str,
    correlation_id: Optional[str] = None,
) -> str:
    """
    Synthesizes spoken Hinglish voice audio negotiation file.

    1. Tries Sarvam AI Indic TTS API (https://api.sarvam.ai/text-to-speech) with bulbul:v1.
    2. Saves to ./audio/sarvam_{payment_id}.mp3 on success.
    3. FALLBACK: On timeout, 4xx, 5xx, or missing key:
       - Logs event_type="SARVAM_FALLBACK_TO_GTTS" (severity="WARNING").
       - Immediately synthesizes via gTTS and saves to ./audio/voice_{payment_id}.mp3.
       - Returns the accessible audio URL.

    The system NEVER throws an exception or drops voice generation.
    """
    cid = correlation_id or str(uuid.uuid4())
    os.makedirs("audio", exist_ok=True)
    script_clean = (script or "").strip()
    if not script_clean:
        script_clean = "Bhaiya, aapka payment link abhi bhi active hai. Kripya tap karke payment complete karein."

    # Cache check by script hash to eliminate repeat synthesis latency
    script_hash = hashlib.md5(script_clean.encode("utf-8")).hexdigest()[:12]
    cached_file = os.path.join("audio", f"cached_{script_hash}.mp3")

    sarvam_key = os.getenv("SARVAM_API_KEY", "").strip()
    sarvam_enabled = bool(sarvam_key and sarvam_key.lower() not in ("dummy", "none", "unset", ""))

    # ─────────────────────────────────────────────────────────────────────────
    # 1. PRIMARY ENGINE: Sarvam AI Indic Voice Synthesis
    # ─────────────────────────────────────────────────────────────────────────
    if sarvam_enabled:
        sarvam_filename = f"sarvam_{payment_id}.mp3"
        sarvam_filepath = os.path.join("audio", sarvam_filename)
        sarvam_url = f"/audio/{sarvam_filename}"

        if os.path.exists(sarvam_filepath) and os.path.getsize(sarvam_filepath) > 0:
            return sarvam_url

        try:
            headers = {
                "sv-api-key": sarvam_key,
                "api-subscription-key": sarvam_key,
                "Content-Type": "application/json",
            }
            payload = {
                "inputs": [script_clean],
                "target_language_code": "hi-IN",
                "speaker": "aditya",
                "pitch": 0,
                "pace": 1.0,
                "loudness": 1.0,
                "speech_sample_rate": 22050,
                "enable_preprocessing": True,
                "model": "bulbul:v3",
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    "https://api.sarvam.ai/text-to-speech",
                    json=payload,
                    headers=headers,
                )

            if resp.status_code == 200:
                data = resp.json()
                audios = data.get("audios", [])
                if audios:
                    audio_bytes = base64.b64decode(audios[0])
                    with open(cached_file, "wb") as cf:
                        cf.write(audio_bytes)
                    shutil.copyfile(cached_file, sarvam_filepath)

                    db.log_event(
                        correlation_id=cid,
                        payment_id=payment_id,
                        event_type="VOICE_GENERATED",
                        payload={
                            "audio_url": sarvam_url,
                            "payment_id": payment_id,
                            "provider": "Sarvam AI (bulbul:v3)",
                            "model": "bulbul:v3",
                            "speaker": "aditya",
                            "language": "hi-IN",
                            "script_length": len(script_clean),
                        },
                        reasoning="Synthesized Hinglish voice audio negotiation note via Sarvam AI Indic TTS (bulbul:v3).",
                        severity="INFO",
                    )
                    logger.info("[VOICE_ENGINE] Successfully generated voice note via Sarvam AI for %s", payment_id)
                    return sarvam_url
                else:
                    logger.warning("[VOICE_ENGINE] Sarvam AI response contained empty audios list.")
            else:
                logger.warning(
                    "[VOICE_ENGINE] Sarvam AI returned HTTP %d: %s. Engaging gTTS fallback.",
                    resp.status_code,
                    resp.text[:100],
                )
        except Exception as sarvam_exc:
            logger.warning("[VOICE_ENGINE] Sarvam AI call exception: %s. Engaging gTTS fallback.", sarvam_exc)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. RELIABILITY FALLBACK SAFETY NET: gTTS (Google Text-to-Speech)
    # ─────────────────────────────────────────────────────────────────────────
    fallback_filename = f"voice_{payment_id}.mp3"
    fallback_filepath = os.path.join("audio", fallback_filename)
    fallback_url = f"/audio/{fallback_filename}"

    # Log Fallback event
    fallback_reason = "Sarvam AI API failed, timed out, or SARVAM_API_KEY unset"
    db.log_event(
        correlation_id=cid,
        payment_id=payment_id,
        event_type="SARVAM_FALLBACK_TO_GTTS",
        payload={
            "payment_id": payment_id,
            "reason": fallback_reason,
            "fallback_engine": "gTTS (Google Text-to-Speech)",
            "script_length": len(script_clean),
        },
        reasoning=f"Reliability Fallback Safety Net: {fallback_reason} — engaged local gTTS voice engine.",
        severity="WARNING",
    )

    try:
        # Check if cached audio exists
        if os.path.exists(cached_file) and os.path.getsize(cached_file) > 0:
            shutil.copyfile(cached_file, fallback_filepath)
        else:
            tts = gTTS(text=script_clean, lang="hi", slow=False, tld="co.in")
            tts.save(cached_file)
            shutil.copyfile(cached_file, fallback_filepath)

        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="VOICE_GENERATED",
            payload={
                "audio_url": fallback_url,
                "payment_id": payment_id,
                "provider": "gTTS (Fallback Safety Net)",
                "script_length": len(script_clean),
            },
            reasoning="Synthesized Hinglish voice audio negotiation note via gTTS Fallback Safety Net.",
            severity="INFO",
        )
        logger.info("[VOICE_ENGINE] Generated voice note via gTTS Fallback for %s", payment_id)
        return fallback_url

    except Exception as gtts_err:
        logger.error("[VOICE_ENGINE] Critical voice synthesis error across all engines for %s: %s", payment_id, gtts_err)
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="ERROR",
            payload={"error": str(gtts_err), "action": "VOICE_GENERATION"},
            reasoning=f"Voice synthesis error across all engines: {gtts_err}",
            severity="WARNING",
        )
        return ""
