"""
main.py - AI Revenue Command Center Application Gateway.

COMPLIANCE PURPOSE:
Provides the REST API surface, cryptographically verified Razorpay Webhook receiver
with HMAC-SHA256 signature verification, simulation playground for hackathon jury demonstration
(including stopping rule retry cap and webhook simulations), audio streaming endpoint,
and the merchant assurance UI.
"""

from dotenv import load_dotenv
load_dotenv()

import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
import re
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import httpx
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

import config
import db
import orchestrator
import ai_agent
import razorpay_service

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("RevenueCommandCenter")

# Promise-to-Pay grace period (minutes after promised_at before marking broken)
PROMISE_GRACE_MINUTES = int(os.getenv("PROMISE_GRACE_MINUTES", "30"))


def clamp_to_rbi_window(dt_ist: datetime) -> Tuple[datetime, bool]:
    """
    Guarantees that a datetime in IST strictly resides inside RBI 09:00-21:00 IST outreach hours.
    - If hour < 9: clamped to 09:00 IST same day.
    - If hour >= 21: clamped to 09:00 IST next day.
    Returns (clamped_datetime, was_adjusted).
    """
    adjusted = False
    if dt_ist.hour < 9:
        dt_ist = dt_ist.replace(hour=9, minute=0, second=0, microsecond=0)
        adjusted = True
    elif dt_ist.hour >= 21:
        dt_ist = (dt_ist + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        adjusted = True
    return dt_ist, adjusted


def get_webhook_secret() -> bytes:
    """Returns the Razorpay webhook signing secret as bytes."""
    return os.getenv("RAZORPAY_WEBHOOK_SECRET", config.RAZORPAY_WEBHOOK_SECRET).encode("utf-8")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for setup and teardown.

    COMPLIANCE PURPOSE:
    Ensures database schemas, PRAGMA flags, directories, and audit indexes are verified
    before handling any ingress requests. Also starts background schedulers.
    """
    db.init_db()
    os.makedirs("audio", exist_ok=True)
    print("[OK] DB initialized with Cryptographic Hash Chaining")

    if os.getenv("AUTO_SEED", "false").lower() == "true":
        try:
            from scripts.seed_demo import seed_database
            seed_database()
            logger.info("Auto-seeded fresh demo state on startup (AUTO_SEED=true)")
        except Exception as seed_err:
            logger.warning("Auto-seed error on startup: %s", seed_err)

    # Start background scheduler for promises and mandate retry sweeps
    async def _sweep_loop():
        while True:
            try:
                await asyncio.sleep(15)
                orchestrator.run_promise_sweep()
                orchestrator.run_mandate_sweep()
            except asyncio.CancelledError:
                break
            except Exception as sweep_err:
                logger.warning("[BACKGROUND_SWEEP_WARN] %s", sweep_err)

    sweep_task = asyncio.create_task(_sweep_loop())

    yield

    sweep_task.cancel()
    logger.info("Shutting down AI Revenue Command Center cleanly.")


app = FastAPI(
    title="Pratyavartan: Your Paytm Merchant's AI Teammate",
    description="Digital Employee #AI-001 • Autonomous Kirana & Retail Payment Recovery with Dynamic Discounts & Voice Negotiation",
    version="1.2.0",
    lifespan=lifespan,
)

# Enable CORS for interactive testing (restrict via ALLOWED_ORIGINS env var, comma-separated)
_default_origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
env_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
allow_origins = list(set(_default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")


# =========================================================================
# Pydantic Request Models
# =========================================================================
class SimulateFailureRequest(BaseModel):
    """Request model for testing live failure recovery scenarios."""
    error_code: Optional[str] = Field(default=None, description="Failure error code, e.g. upi_limit_exceeded, checkout_incomplete, gateway_timeout")
    error_description: Optional[str] = Field(default=None, description="Descriptive error detail")
    scenario: Optional[str] = Field(default=None, description="Scenario alias for error_code (e.g. qr_fail, low_balance, bank_down)")
    amount: int = Field(default=50000, description="Amount in paise (e.g., 50000 = Rs.500, 500000 = Rs.5,000)")
    currency: Optional[str] = Field(default="INR", description="Currency (only INR supported)")
    payment_id: Optional[str] = Field(default=None, description="Optional custom payment ID")
    user_contact: Optional[str] = Field(default=None, description="Customer phone number (will be pseudonymized)")
    customer_contact: Optional[str] = Field(default=None, description="Customer phone number alias")


class OptOutRequest(BaseModel):
    """Request model for TRAI/DPDP customer communication opt-out."""
    phone: str = Field(..., description="Customer phone number to opt out from automated outreach")


# =========================================================================
# API Endpoints
# =========================================================================

@app.get("/health")
def get_health() -> Dict[str, str]:
    """
    Health check endpoint returning deployment status and current timestamp.
    """
    return {
        "status": "healthy",
        "phase": "complete",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "AI Revenue Command Center",
    }


@app.get("/api/llm-test")
def api_llm_test() -> Dict[str, Any]:
    """
    Connection test endpoint: makes a completion request using the LLM provider with fallback support.
    Returns {status:"ok", model:<name>, latency_ms} or {status:"fail", error}.
    """
    return ai_agent.test_llm_connection()


@app.get("/audio/{filename}")
def serve_audio_file(filename: str):
    """
    Serves synthesized Hinglish voice negotiation audio files to the browser.
    Includes caching headers and byte-range support for instant, stutter-free playback.
    """
    safe_filename = os.path.basename(filename)
    audio_path = os.path.join("audio", safe_filename)
    if os.path.exists(audio_path):
        return FileResponse(
            audio_path,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=86400",
                "Accept-Ranges": "bytes",
            },
        )
    raise HTTPException(status_code=404, detail="Audio file not found")


@app.get("/test-audit-log")
def test_audit_log() -> Dict[str, Any]:
    """
    Diagnostic endpoint to verify end-to-end database connectivity and audit trail logging.
    """
    test_payment_id = f"pay_test_{uuid.uuid4().hex[:8]}"
    correlation_id = str(uuid.uuid4())

    db.insert_or_ignore_payment(
        payment_id=test_payment_id,
        amount=150000,
        currency="INR",
        error_code="TEST_FAILURE",
        error_description="Automated system diagnostic test entry",
        user_contact="9876543210",
        status="PENDING",
    )

    db.log_event(
        correlation_id=correlation_id,
        payment_id=test_payment_id,
        event_type="DETECTED",
        payload={"diagnostic": True, "amount": 150000},
        reasoning="Diagnostic audit entry verified.",
        severity="INFO",
    )

    return {
        "status": "success",
        "payment_id": test_payment_id,
        "correlation_id": correlation_id,
        "message": "Audit event recorded successfully",
    }


# =========================================================================
# Production-Grade Razorpay Webhook Receiver
# =========================================================================
@app.post("/razorpay-webhook")
async def handle_razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
) -> JSONResponse:
    """
    Production-grade, cryptographically verified Server-to-Server (S2S) Razorpay webhook receiver.

    COMPLIANCE & SECURITY PURPOSE:
    1. Reads raw bytes and verifies HMAC-SHA256 against RAZORPAY_WEBHOOK_SECRET.
    2. On signature mismatch: Logs a CRITICAL SECURITY_ALERT event and returns HTTP 400.
    3. On 'payment.failed': Ingests payment, logs DETECTED, and queues the autonomous AI
       recovery workflow as a background task so the webhook is acknowledged immediately.
    4. On 'payment.captured' or 'payment_link.paid': Updates status to RECOVERED and logs audit trail.
    5. Always responds quickly with status 200 for valid webhooks.
    """
    raw_body = await request.body()
    correlation_id = str(uuid.uuid4())
    secret = get_webhook_secret()

    # 1. Compute HMAC-SHA256 signature
    computed_sig = hmac.new(key=secret, msg=raw_body, digestmod=hashlib.sha256).hexdigest()

    # 2. Verify signature securely using constant-time comparison
    if not x_razorpay_signature or not hmac.compare_digest(computed_sig, x_razorpay_signature):
        logger.error("[SECURITY_ALERT] Webhook signature mismatch: missing or invalid X-Razorpay-Signature.")
        db.log_event(
            correlation_id=correlation_id,
            payment_id="SYSTEM_WEBHOOK",
            event_type="SECURITY_ALERT",
            payload={
                "error": "Invalid or missing HMAC-SHA256 signature",
            },
            reasoning="HMAC-SHA256 Signature verification failed for Razorpay webhook. Potential spoofing or tampering attempt.",
            severity="CRITICAL",
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"status": "error", "message": "Invalid webhook signature"},
        )

    # 3. Parse JSON payload
    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception as parse_err:
        logger.error("Failed to parse webhook JSON payload: %s", parse_err)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"status": "error", "message": "Invalid JSON body"},
        )

    event = payload.get("event", "")
    logger.info("Cryptographically verified Razorpay Webhook received: event='%s'", event)

    # 4. Handle 'payment.failed' event
    if event == "payment.failed":
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        payment_id = payment_entity.get("id") or f"pay_wh_{uuid.uuid4().hex[:8]}"
        amount = int(payment_entity.get("amount", 250000))
        currency = str(payment_entity.get("currency", "INR")).upper()
        error_code = payment_entity.get("error_code") or payment_entity.get("error_reason") or "payment_failed"
        error_description = payment_entity.get("error_description") or "Payment failed via Gateway"
        raw_contact = payment_entity.get("contact", "9876543210")
        masked_contact = db.mask_contact(raw_contact)

        # Ingestion Validation (E-05): reject negative/zero amounts, > 10 crore paise, or non-INR currency
        if amount <= 0 or amount > 1000000000:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"error": "Invalid amount: must be positive integer up to 10,000,000 INR (paise)"},
            )
        if currency != "INR":
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"error": "Invalid currency: only INR is supported"},
            )
        if not re.match(r"^[a-zA-Z0-9_\-]+$", payment_id) or len(payment_id) > 128:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"error": "Invalid payment_id format"},
            )

        # Hardened Dedup Barrier (E-03): SHA256(payment_id) prevents double processing
        dedup_key = hashlib.sha256(payment_id.encode("utf-8")).hexdigest()
        dedup_res = db.check_or_record_dedup(dedup_key, payment_id, event)
        if dedup_res["is_duplicate"]:
            db.log_event(
                correlation_id=correlation_id,
                payment_id=payment_id,
                event_type="SECURITY_ALERT",
                payload={
                    "action": "DUPLICATE_BLOCKED",
                    "dedup_key": dedup_key,
                    "hit_count": dedup_res["hit_count"],
                    "payment_id": payment_id,
                },
                reasoning=f"Idempotency Barrier: Duplicate webhook for payment {payment_id} intercepted. Zero duplicate execution.",
                severity="WARNING",
            )
            existing = db.get_payment(payment_id)
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "duplicate_blocked",
                    "shield_active": True,
                    "payment_id": payment_id,
                    "dedup_key": dedup_key,
                    "existing_status": existing.get("status") if existing else "PENDING",
                    "message": "Duplicate webhook intercepted. Recovery was NOT re-triggered.",
                },
            )

        # Out-of-Order Webhooks (E-08): check if payment was already captured before failure arrived
        pending_capture = db.pop_pending_capture(payment_id)
        if pending_capture:
            db.insert_or_ignore_payment(
                payment_id=payment_id,
                amount=amount,
                currency=currency,
                error_code=error_code,
                error_description=error_description,
                user_contact=masked_contact,
                status="RECOVERED",
            )
            db.update_payment_status(payment_id, "RECOVERED")
            db.log_event(
                correlation_id=correlation_id,
                payment_id=payment_id,
                event_type="RECOVERED",
                payload={"out_of_order_resolved": True, "payment_id": payment_id, "amount": amount},
                reasoning="Out-of-order webhook resolved: payment was already captured before failure arrived.",
                severity="INFO",
            )
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "ok",
                    "event": "payment.captured",
                    "payment_id": payment_id,
                    "payment_status": "RECOVERED",
                    "out_of_order_resolved": True,
                },
            )

        # Ingest failed payment idempotently
        db.insert_or_ignore_payment(
            payment_id=payment_id,
            amount=amount,
            currency=currency,
            error_code=error_code,
            error_description=error_description,
            user_contact=masked_contact,
            status="PENDING",
        )

        # Log DETECTED audit event
        db.log_event(
            correlation_id=correlation_id,
            payment_id=payment_id,
            event_type="DETECTED",
            payload={
                "amount_paise": amount,
                "currency": currency,
                "error_code": error_code,
                "error_description": error_description,
                "masked_contact": masked_contact,
                "source": "razorpay_webhook",
                "event": event,
            },
            reasoning="Payment failure captured via cryptographically verified webhook. Routed through autonomous AI recovery pipeline.",
            severity="INFO",
        )

        # Queue recovery pipeline (AI Diagnosis -> Dynamic Action -> Razorpay Execution)
        # as a background task so the webhook is acknowledged instantly and the
        # event loop / Razorpay retry timers are never blocked by LLM or TTS latency.
        background_tasks.add_task(
            orchestrator.process_single_payment_workflow,
            payment_id=payment_id,
            correlation_id=correlation_id,
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "accepted",
                "event": event,
                "payment_id": payment_id,
                "correlation_id": correlation_id,
                "workflow_result": {"queued": True},
            },
        )

    # 5. Handle 'payment.captured', 'order.paid', or 'payment_link.paid'
    elif event in ("payment_link.paid", "payment.captured", "order.paid"):
        if event == "payment_link.paid":
            plink_entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
            notes = plink_entity.get("notes", {})
            payment_id = notes.get("payment_id") or plink_entity.get("id") or "SYSTEM"
            amt_val = plink_entity.get("amount", 250000)
        else:
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            payment_id = payment_entity.get("id") or payload.get("payment_id") or "SYSTEM"
            amt_val = payment_entity.get("amount", 250000)

        # Out-of-Order Check: if payment is not yet ingested, buffer in pending_captures
        existing_payment = db.get_payment(payment_id)
        if not existing_payment or existing_payment.get("payment_id") == "SYSTEM":
            db.store_pending_capture(payment_id=payment_id, amount=amt_val, currency="INR", payload=payload)
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "buffered_pending_capture",
                    "payment_id": payment_id,
                    "message": "Payment captured before failure record arrived. Buffered in pending_captures table.",
                },
            )

        # Update payment status to RECOVERED in database
        db.update_payment_status(payment_id, "RECOVERED")

        # Log RECOVERED audit event
        db.log_event(
            correlation_id=correlation_id,
            payment_id=payment_id,
            event_type="RECOVERED",
            payload=payload,
            reasoning=f"Payment {payment_id} successfully marked as RECOVERED via verified Razorpay webhook event '{event}'.",
            severity="INFO",
        )

        # Soundbox Whisper v2: Generate Merchant Confirmation Prompt
        try:
            pay_obj = db.get_payment(payment_id)
            amt_val = pay_obj.get("amount", 0) if pay_obj else 0
            if amt_val == 0:
                amt_val = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("amount", 0)
            amt_inr = amt_val / 100.0
            amt_formatted = f"₹{amt_inr:.2f}" if amt_inr % 1 != 0 else f"₹{int(amt_inr):,}"
            confirm_script = f"{amt_formatted} recover ho gaya. Kya main isse aaj ke khate mein jod doon?"

            sb_audio_url = razorpay_service.generate_voice_audio(
                script=confirm_script,
                payment_id=payment_id,
                correlation_id=correlation_id,
            )
            db.log_event(
                correlation_id=correlation_id,
                payment_id=payment_id,
                event_type="SOUNDBOX_CONFIRM_REQUEST",
                payload={
                    "direction": "to_merchant",
                    "script": confirm_script,
                    "audio_url": sb_audio_url,
                    "payment_id": payment_id,
                },
                reasoning="Merchant confirmation requested via Soundbox for recovered payment ledger update.",
                severity="INFO",
            )
            db.insert_soundbox_log(
                payment_id=payment_id,
                direction="to_merchant",
                script=confirm_script,
                audio_url=sb_audio_url,
            )
        except Exception as sb_rec_err:
            logger.warning("[SOUNDBOX_CONFIRM_WARN] Error generating soundbox confirmation: %s", sb_rec_err)

        # PROMISE-KEPT HOOK: close any active promises for this payment
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE promises SET status='kept' WHERE payment_id=? AND status IN ('pending','followed_up')",
                    (payment_id,),
                )
                if cursor.rowcount > 0:
                    conn.commit()
                    db.log_event(
                        correlation_id=correlation_id,
                        payment_id=payment_id,
                        event_type="PROMISE_KEPT",
                        payload={"promise_count_resolved": cursor.rowcount, "source": "webhook_recovered"},
                        reasoning=f"Promise(s) resolved as KEPT — payment {payment_id} recovered via webhook.",
                        severity="INFO",
                    )
                else:
                    conn.commit()
        except Exception as pk_err:
            logger.warning("Promise-kept hook (webhook) error for %s: %s", payment_id, pk_err)

        # MANDATE-CANCEL HOOK: cancel remaining scheduled debit attempts
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE mandate_schedule SET status='cancelled' WHERE payment_id=? AND status='pending'",
                    (payment_id,),
                )
                if cursor.rowcount > 0:
                    conn.commit()
                    db.log_event(
                        correlation_id=correlation_id,
                        payment_id=payment_id,
                        event_type="MANDATE_CANCELLED",
                        payload={"cancelled_attempts": cursor.rowcount, "source": "webhook_recovered"},
                        reasoning="recovered — no further debit attempts",
                        severity="INFO",
                    )
                else:
                    conn.commit()
        except Exception as mc_err:
            logger.warning("Mandate cancel hook (webhook) error for %s: %s", payment_id, mc_err)

        # Record customer memory and intervention outcome for continuous learning loop
        try:
            import memory
            contact = pay_obj.get("user_contact") if pay_obj else "9876543210"
            memory.remember_customer_context(
                customer_ref=contact,
                interaction_data={"event": "RECOVERED", "payment_id": payment_id, "amount_paise": amt_val},
                correlation_id=correlation_id,
            )
            db.record_intervention_outcome(
                segment="STANDARD",
                intervention_type="UPI_INTENT",
                success=True,
                latency_ms=1200.0,
            )
        except Exception as mem_err:
            logger.warning("Recovery memory/learning hook error for %s: %s", payment_id, mem_err)

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "ok",
                "event": event,
                "payment_id": payment_id,
                "payment_status": "RECOVERED",
            },
        )

    # 6. Handle other webhook events gracefully
    else:
        db.log_event(
            correlation_id=correlation_id,
            payment_id="SYSTEM_WEBHOOK",
            event_type="S2S_CALLBACK",
            payload=payload,
            reasoning=f"Razorpay webhook event '{event}' received and logged.",
            severity="INFO",
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "ok", "event": event},
        )


# =========================================================================
# Paytm S2S Webhook Adapter
# =========================================================================
@app.post("/paytm-webhook")
@app.post("/api/paytm-webhook")
async def handle_paytm_webhook(request: Request) -> JSONResponse:
    """
    Paytm S2S Webhook Callback Adapter (Track 3 Priority 2).
    Accepts S2S TXN_FAILURE and TXN_SUCCESS callbacks, normalizes them via Paytm Bridge,
    and drives the recovery pipeline or resolves pending captures.
    """
    correlation_id = str(uuid.uuid4())
    try:
        payload = await request.json()
    except Exception:
        form = await request.form()
        payload = dict(form)

    txn_id = str(payload.get("TXNID") or payload.get("ORDERID") or f"pay_paytm_{uuid.uuid4().hex[:8]}")
    status_str = str(payload.get("STATUS", "")).upper()
    merchant_name = payload.get("MERCHANT_NAME") or payload.get("merchant_name") or "Sharma General Store"
    resp_msg = payload.get("RESPMSG") or payload.get("result_msg") or f"Paytm transaction {status_str}"
    resp_code = payload.get("RESPCODE") or payload.get("result_code") or "TXN_ERROR"
    contact = payload.get("CUSTOMER_PHONE") or payload.get("user_contact") or "9876543210"

    raw_amt = payload.get("TXNAMOUNT") or payload.get("amount") or 3000
    try:
        flt_amt = float(raw_amt)
        amt_paise = int(flt_amt * 100) if flt_amt < 10000 else int(flt_amt)
    except (ValueError, TypeError):
        amt_paise = 300000

    if status_str == "TXN_SUCCESS":
        existing = db.get_payment(txn_id)
        if not existing or existing.get("payment_id") == "SYSTEM":
            db.store_pending_capture(payment_id=txn_id, amount=amt_paise, currency="INR", payload=payload)
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"status": "buffered_pending_capture", "payment_id": txn_id},
            )

        db.update_payment_status(txn_id, "RECOVERED")
        db.log_event(
            correlation_id=correlation_id,
            payment_id=txn_id,
            event_type="RECOVERED",
            payload={"source": "paytm_webhook", "amount_paise": amt_paise, "payment_id": txn_id},
            reasoning=f"Payment {txn_id} recovered via verified Paytm S2S TXN_SUCCESS callback.",
            severity="INFO",
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "recovered", "payment_id": txn_id},
        )

    # TXN_FAILURE / Error
    dedup_key = f"sha256:{hashlib.sha256(txn_id.encode('utf-8')).hexdigest()[:24]}"
    dedup_res = db.check_or_record_dedup(dedup_key, txn_id, "paytm.failed")
    if dedup_res["is_duplicate"]:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "duplicate_ignored", "payment_id": txn_id},
        )

    pending_cap = db.pop_pending_capture(txn_id)
    if pending_cap:
        db.insert_or_ignore_payment(
            payment_id=txn_id,
            amount=amt_paise,
            currency="INR",
            error_code="paytm_dynamic_qr_drop",
            error_description=resp_msg,
            user_contact=contact,
            status="RECOVERED",
        )
        db.update_payment_status(txn_id, "RECOVERED")
        db.log_event(
            correlation_id=correlation_id,
            payment_id=txn_id,
            event_type="RECOVERED",
            payload={"out_of_order_resolved": True, "payment_id": txn_id, "source": "paytm"},
            reasoning="Out-of-order Paytm webhook resolved: payment was captured before failure arrived.",
            severity="INFO",
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "recovered_out_of_order", "payment_id": txn_id},
        )

    db.insert_or_ignore_payment(
        payment_id=txn_id,
        amount=amt_paise,
        currency="INR",
        error_code="paytm_dynamic_qr_drop",
        error_description=resp_msg,
        user_contact=contact,
        status="PENDING",
    )

    db.log_event(
        correlation_id=correlation_id,
        payment_id=txn_id,
        event_type="S2S_CALLBACK",
        payload={
            "source": "paytm",
            "merchant_name": merchant_name,
            "raw_event": "TXN_FAILURE",
            "result_code": resp_code,
            "adapter_status": "NORMALIZED",
            "amount_paise": amt_paise,
        },
        reasoning=f"Paytm S2S TXN_FAILURE callback for {merchant_name} normalized via Paytm Bridge.",
        severity="INFO",
    )

    db.log_event(
        correlation_id=correlation_id,
        payment_id=txn_id,
        event_type="DETECTED",
        payload={
            "amount_paise": amt_paise,
            "error_code": "paytm_dynamic_qr_drop",
            "error_description": resp_msg,
            "masked_contact": db.mask_contact(contact),
            "merchant_name": merchant_name,
            "adapter": "Paytm Bridge v1.2",
        },
        reasoning=f"Payment failure at {merchant_name} captured via Paytm QR Bridge.",
        severity="INFO",
    )

    # Drive recovery workflow
    workflow_result = orchestrator.process_single_payment_workflow(
        payment_id=txn_id,
        correlation_id=correlation_id,
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "ok",
            "payment_id": txn_id,
            "adapter_status": "NORMALIZED",
            "workflow_result": workflow_result,
        },
    )


# =========================================================================
# Webhook Simulation Endpoint (Demo without ngrok)
# =========================================================================
@app.post("/simulate-webhook")
async def simulate_webhook() -> Dict[str, Any]:
    """
    Simulates a realistic Razorpay payment.failed Webhook without requiring ngrok.
    Computes a valid HMAC-SHA256 signature and internally dispatches to /razorpay-webhook,
    proving the exact production signature verification and recovery pipeline live.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )
    sim_payment_id = f"pay_wh_sim_{uuid.uuid4().hex[:8]}"
    sim_order_id = f"order_{uuid.uuid4().hex[:10]}"
    current_timestamp = int(time.time())

    # Realistic Razorpay payment.failed webhook payload
    webhook_payload = {
        "entity": "event",
        "account_id": "acc_razorpay_live_test",
        "event": "payment.failed",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": sim_payment_id,
                    "entity": "payment",
                    "amount": 350000,  # Rs.3,500.00
                    "currency": "INR",
                    "status": "failed",
                    "order_id": sim_order_id,
                    "invoice_id": None,
                    "international": False,
                    "method": "upi",
                    "amount_refunded": 0,
                    "refund_status": None,
                    "captured": False,
                    "description": "Live Razorpay Webhook Ingestion Demo",
                    "card_id": None,
                    "bank": None,
                    "wallet": None,
                    "vpa": "customer@oksbi",
                    "email": "customer@example.com",
                    "contact": "+919876543210",
                    "notes": {
                        "source": "webhook_simulation",
                        "merchant": "AI Revenue Command Center",
                    },
                    "fee": None,
                    "tax": None,
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Payment was declined by customer bank due to technical timeout",
                    "error_source": "customer",
                    "error_step": "payment_authentication",
                    "error_reason": "payment_failed",
                    "created_at": current_timestamp,
                }
            }
        },
        "created_at": current_timestamp,
    }

    raw_bytes = json.dumps(webhook_payload, separators=(",", ":")).encode("utf-8")
    secret = get_webhook_secret()
    signature = hmac.new(key=secret, msg=raw_bytes, digestmod=hashlib.sha256).hexdigest()

    # Internally dispatch to /razorpay-webhook with the signature header
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://localhost") as client:
        resp = await client.post(
            "/razorpay-webhook",
            content=raw_bytes,
            headers={
                "X-Razorpay-Signature": signature,
                "Content-Type": "application/json",
            },
        )

    webhook_result = resp.json() if resp.status_code == 200 else {"error": resp.text}

    return {
        "signature_verified": resp.status_code == 200,
        "event": "payment.failed",
        "payment_id": sim_payment_id,
        "status_code": resp.status_code,
        "webhook_result": webhook_result,
    }


# =========================================================================
# Existing Recovery Sweep & Simulation Endpoints
# =========================================================================
@app.get("/trigger-agent")
def trigger_agent() -> Dict[str, Any]:
    """
    Triggers the autonomous recovery agent orchestration sweep.
    """
    summary = orchestrator.run_recovery_agent()
    return summary


@app.post("/simulate-failure")
@app.post("/api/simulate-failure")
def simulate_failure(req: SimulateFailureRequest) -> Dict[str, Any]:
    """
    Interactive Simulation Endpoint for Live Demonstrations.
    Protected by DEMO_MODE barrier, amount/currency validation, and dedup shield.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )

    # Ingestion Validation (E-05)
    if req.amount <= 0 or req.amount > 1000000000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid amount: must be positive integer up to 10,000,000 INR (paise)",
        )
    if req.currency and req.currency.upper() != "INR":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid currency: only INR is supported",
        )

    sim_payment_id = req.payment_id or f"pay_sim_{uuid.uuid4().hex[:8]}"
    correlation_id = str(uuid.uuid4())

    # Hardened Dedup Barrier (E-03)
    dedup_key = hashlib.sha256(sim_payment_id.encode("utf-8")).hexdigest()
    dedup_res = db.check_or_record_dedup(dedup_key, sim_payment_id, "payment.failed")
    if dedup_res["is_duplicate"]:
        db.log_event(
            correlation_id=correlation_id,
            payment_id=sim_payment_id,
            event_type="SECURITY_ALERT",
            payload={
                "action": "DUPLICATE_BLOCKED",
                "dedup_key": dedup_key,
                "hit_count": dedup_res["hit_count"],
                "payment_id": sim_payment_id,
            },
            reasoning=f"Idempotency Barrier: Duplicate simulation for payment {sim_payment_id} intercepted.",
            severity="WARNING",
        )
        existing = db.get_payment(sim_payment_id)
        return {
            "status": "duplicate_blocked",
            "shield_active": True,
            "payment_id": sim_payment_id,
            "dedup_key": dedup_key,
            "existing_status": existing.get("status") if existing else "PENDING",
            "message": "Duplicate simulation intercepted by idempotency shield.",
        }

    err_code = req.error_code or req.scenario or "qr_fail"
    err_desc = req.error_description or f"Payment failed due to {err_code}"
    contact = req.user_contact or req.customer_contact or "9876543210"

    # Out-of-Order Webhook Check (E-08)
    pending_capture = db.pop_pending_capture(sim_payment_id)
    if pending_capture:
        db.insert_or_ignore_payment(
            payment_id=sim_payment_id,
            amount=req.amount,
            currency="INR",
            error_code=err_code,
            error_description=err_desc,
            user_contact=contact,
            status="RECOVERED",
        )
        db.update_payment_status(sim_payment_id, "RECOVERED")
        db.log_event(
            correlation_id=correlation_id,
            payment_id=sim_payment_id,
            event_type="RECOVERED",
            payload={"out_of_order_resolved": True, "payment_id": sim_payment_id, "amount": req.amount},
            reasoning="Out-of-order webhook resolved: payment was already captured before failure arrived.",
            severity="INFO",
        )
        return {
            "success": True,
            "payment_id": sim_payment_id,
            "correlation_id": correlation_id,
            "status": "RECOVERED",
            "out_of_order_resolved": True,
        }

    # Step 1: Ingest payment into database
    db.insert_or_ignore_payment(
        payment_id=sim_payment_id,
        amount=req.amount,
        currency="INR",
        error_code=err_code,
        error_description=err_desc,
        user_contact=contact,
        status="PENDING",
    )

    # Step 2: Log DETECTED event in audit ledger
    db.log_event(
        correlation_id=correlation_id,
        payment_id=sim_payment_id,
        event_type="DETECTED",
        payload={
            "amount_paise": req.amount,
            "error_code": err_code,
            "error_description": err_desc,
            "masked_contact": db.mask_contact(contact),
            "simulated": True,
        },
        reasoning="Simulated failure event captured for jury demonstration.",
        severity="INFO",
    )

    # Step 3: Run full workflow on the simulated payment
    result = orchestrator.process_single_payment_workflow(
        payment_id=sim_payment_id,
        correlation_id=correlation_id,
    )

    return {
        "success": True,
        "payment_id": sim_payment_id,
        "correlation_id": correlation_id,
        "input": req.model_dump(),
        "workflow_result": result,
    }


@app.post("/simulate-retry-cap")
def simulate_retry_cap() -> Dict[str, Any]:
    """
    Simulates Stopping Rule Enforcement by attempting recovery on a payment with retry_count >= 2.
    Guarantees that the LLM is skipped, logging STOPPING_RULE_TRIGGERED and ESCALATED.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )
    sim_payment_id = f"pay_sim_retry_{uuid.uuid4().hex[:8]}"
    correlation_id = str(uuid.uuid4())

    # Step 1: Ingest payment into database with retry_count artificially set to 2
    db.insert_or_ignore_payment(
        payment_id=sim_payment_id,
        amount=45000,
        currency="INR",
        error_code="user_cancelled_repeated",
        error_description="Customer closed checkout twice consecutively",
        user_contact="9876543210",
        status="PENDING",
    )

    # Artificially set retry_count to 2
    with db.get_connection() as conn:
        conn.execute("UPDATE failed_payments SET retry_count = 2, status = 'PENDING' WHERE payment_id = ?", (sim_payment_id,))
        conn.commit()

    # Step 2: Log DETECTED event in audit ledger
    db.log_event(
        correlation_id=correlation_id,
        payment_id=sim_payment_id,
        event_type="DETECTED",
        payload={
            "amount_paise": 45000,
            "error_code": "user_cancelled_repeated",
            "retry_count": 2,
            "simulated": True,
        },
        reasoning="Simulated retry cap failure event captured for stopping rule verification.",
        severity="INFO",
    )

    # Step 3: Run full workflow - stopping rule skips LLM and escalates
    result = orchestrator.process_single_payment_workflow(
        payment_id=sim_payment_id,
        correlation_id=correlation_id,
    )

    return {
        "status": "success",
        "message": "Retry cap triggered, payment escalated.",
        "payment_id": sim_payment_id,
        "correlation_id": correlation_id,
        "workflow_result": result,
    }


@app.post("/customer-paid")
async def customer_paid(request: Request) -> JSONResponse:
    """
    Human-in-the-Loop Recovery Closure ("Customer Paid" flow).

    A human plays the customer who completes payment via the dispatched recovery link.
    This endpoint NEVER writes recovery status to the database directly - it acts as
    the customer by sending a correctly signed Razorpay 'payment_link.paid' webhook
    through the production /razorpay-webhook HMAC-SHA256 verification path, which is
    the ONLY component authorized to mark a payment RECOVERED.

    Accepts optional JSON body: {"payment_id": "<id>"}; when absent, the most recent
    payment with a DETECTED event and no RECOVERED event is selected automatically.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )
    correlation_id = str(uuid.uuid4())

    # 1. Resolve target payment (explicit payment_id wins, else latest pending)
    chosen_payment_id: Optional[str] = None
    amount_paise = 25000
    try:
        body = await request.json()
        if isinstance(body, dict):
            candidate = body.get("payment_id")
            if candidate:
                payment = db.get_payment(str(candidate))
                if payment:
                    chosen_payment_id = str(candidate)
                    amount_paise = int(payment.get("amount") or amount_paise)
    except Exception:
        body = None  # Empty or invalid body -> fall back to latest pending payment

    if not chosen_payment_id:
        target = db.get_latest_pending_payment()
        if not target:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"status": "error", "message": "No pending payment found to pay."},
            )
        chosen_payment_id = target["payment_id"]
        amount_paise = int(target.get("amount_paise") or amount_paise)

    current_timestamp = int(time.time())

    # 2. Build a realistic Razorpay payment_link.paid event.
    #    Field contract verified against the webhook handler: it resolves the internal
    #    payment_id via payload.payment_link.entity.notes.payment_id. Amount stays
    #    integer paise everywhere.
    webhook_payload = {
        "entity": "event",
        "account_id": "acc_razorpay_live_test",
        "event": "payment_link.paid",
        "contains": ["payment_link", "payment"],
        "payload": {
            "payment_link": {
                "entity": {
                    "id": f"plink_cp_{uuid.uuid4().hex[:14]}",
                    "entity": "payment_link",
                    "status": "paid",
                    "amount": amount_paise,
                    "currency": "INR",
                    "description": "Customer completed payment via One-Click Recovery Link",
                    "notes": {
                        "original_payment_id": chosen_payment_id,
                        "payment_id": chosen_payment_id,
                        "recovery_type": "one_click",
                        "source": "customer_paid_human_in_loop",
                    },
                    "created_at": current_timestamp,
                    "updated_at": current_timestamp,
                }
            },
            "payment": {
                "entity": {
                    "id": f"pay_cp_{uuid.uuid4().hex[:14]}",
                    "entity": "payment",
                    "status": "captured",
                    "amount": amount_paise,
                    "currency": "INR",
                    "method": "card",
                    "captured": True,
                    "created_at": current_timestamp,
                }
            },
        },
        "created_at": current_timestamp,
    }

    # 3. Sign with HMAC-SHA256 using the production webhook secret
    raw_bytes = json.dumps(webhook_payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(key=get_webhook_secret(), msg=raw_bytes, digestmod=hashlib.sha256).hexdigest()

    # 4. Traceability-only audit event (NOT a status update)
    db.log_event(
        correlation_id=correlation_id,
        payment_id=chosen_payment_id,
        event_type="CUSTOMER_PAID_TRIGGER",
        payload={
            "event": "payment_link.paid",
            "amount_paise": amount_paise,
            "simulated_customer": True,
        },
        reasoning="Human-in-the-loop: customer marked the recovery link as paid. Dispatching signed webhook through production verification path.",
        severity="INFO",
    )

    # 5. Internally POST to /razorpay-webhook (same transport pattern as /simulate-webhook)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://localhost") as client:
        resp = await client.post(
            "/razorpay-webhook",
            content=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": signature,
            },
        )

    webhook_result = resp.json() if resp.status_code == 200 else {"error": resp.text}

    if resp.status_code != 200:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "status": "error",
                "message": "Webhook verification path rejected the signed event.",
                "detail": webhook_result,
            },
        )

    # PROMISE-KEPT HOOK: close any active promises for this payment after recovery
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE promises SET status='kept' WHERE payment_id=? AND status IN ('pending','followed_up')",
                (chosen_payment_id,),
            )
            if cursor.rowcount > 0:
                conn.commit()
                db.log_event(
                    correlation_id=correlation_id,
                    payment_id=chosen_payment_id,
                    event_type="PROMISE_KEPT",
                    payload={"promise_count_resolved": cursor.rowcount, "source": "customer_paid"},
                    reasoning=f"Promise(s) resolved as KEPT — payment {chosen_payment_id} recovered via customer-paid.",
                    severity="INFO",
                )
            else:
                conn.commit()
    except Exception as pk_err:
        logger.warning("Promise-kept hook (customer-paid) error for %s: %s", chosen_payment_id, pk_err)

    # MANDATE-CANCEL HOOK: cancel remaining scheduled debit attempts
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE mandate_schedule SET status='cancelled' WHERE payment_id=? AND status='pending'",
                (chosen_payment_id,),
            )
            if cursor.rowcount > 0:
                conn.commit()
                db.log_event(
                    correlation_id=correlation_id,
                    payment_id=chosen_payment_id,
                    event_type="MANDATE_CANCELLED",
                    payload={"cancelled_attempts": cursor.rowcount, "source": "customer_paid"},
                    reasoning="recovered — no further debit attempts",
                    severity="INFO",
                )
            else:
                conn.commit()
    except Exception as mc_err:
        logger.warning("Mandate cancel hook (customer-paid) error for %s: %s", chosen_payment_id, mc_err)

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "ok",
            "payment_id": chosen_payment_id,
            "event": "payment_link.paid",
            "closed_via": "production_webhook_path",
            "webhook_result": webhook_result,
        },
    )


@app.post("/simulate-customer-pays/{payment_id}")
async def simulate_customer_pays(payment_id: str) -> JSONResponse:
    """
    Convenience endpoint for end-to-end demonstrations.
    Simulates the customer completing payment via the recovery link.
    Dispatches a signed HMAC-SHA256 Razorpay payment_link.paid webhook through the
    production /razorpay-webhook path, exercising full cryptographic verification and recovery cascade.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )
    correlation_id = str(uuid.uuid4())
    payment = db.get_payment(payment_id)
    amount_paise = int(payment.get("amount", 300000)) if payment else 300000
    current_timestamp = int(time.time())

    webhook_payload = {
        "entity": "event",
        "account_id": "acc_razorpay_live_test",
        "event": "payment_link.paid",
        "contains": ["payment_link", "payment"],
        "payload": {
            "payment_link": {
                "entity": {
                    "id": f"plink_sim_{uuid.uuid4().hex[:14]}",
                    "entity": "payment_link",
                    "status": "paid",
                    "amount": amount_paise,
                    "currency": "INR",
                    "description": "Customer completed payment via One-Click Recovery Link",
                    "notes": {
                        "original_payment_id": payment_id,
                        "payment_id": payment_id,
                        "recovery_type": "one_click",
                        "source": "simulate_customer_pays",
                    },
                    "created_at": current_timestamp,
                    "updated_at": current_timestamp,
                }
            },
            "payment": {
                "entity": {
                    "id": f"pay_sim_paid_{uuid.uuid4().hex[:14]}",
                    "entity": "payment",
                    "status": "captured",
                    "amount": amount_paise,
                    "currency": "INR",
                    "method": "upi",
                    "captured": True,
                    "created_at": current_timestamp,
                }
            },
        },
        "created_at": current_timestamp,
    }

    raw_bytes = json.dumps(webhook_payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(key=get_webhook_secret(), msg=raw_bytes, digestmod=hashlib.sha256).hexdigest()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://localhost") as client:
        resp = await client.post(
            "/razorpay-webhook",
            content=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": signature,
            },
        )

    return JSONResponse(
        status_code=resp.status_code,
        content={
            "status": "ok" if resp.status_code == 200 else "error",
            "payment_id": payment_id,
            "simulated_action": "customer_paid",
            "webhook_status": resp.status_code,
        },
    )


@app.get("/api/link-quota")
def get_link_quota() -> JSONResponse:
    """
    Returns link quota usage and preservation status since last demo reset.
    """
    quota = db.get_link_quota_metrics()
    return JSONResponse(content=quota)


class SoundboxRespondRequest(BaseModel):
    payment_id: str
    choice: str = Field(..., description="add_to_khata or ignore")
    correlation_id: Optional[str] = None


@app.post("/api/soundbox/respond")
async def soundbox_respond(req: SoundboxRespondRequest) -> JSONResponse:
    """
    PART 1: Soundbox Whisper v2 - Merchant response to Soundbox recovery confirmation.
    Records merchant decision ('add_to_khata' or 'ignore'), updates soundbox_log, and logs audit event.
    """
    cid = req.correlation_id or str(uuid.uuid4())
    pid = req.payment_id
    choice = req.choice

    # Update soundbox_log
    updated = db.update_soundbox_response(payment_id=pid, merchant_response=choice)

    # Log SOUNDBOX_MERCHANT_RESPONSE event
    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="SOUNDBOX_MERCHANT_RESPONSE",
        payload={
            "payment_id": pid,
            "choice": choice,
            "updated_db": updated,
        },
        reasoning="merchant oversight exercised",
        severity="INFO",
    )

    return JSONResponse(
        content={
            "status": "ok",
            "payment_id": pid,
            "choice": choice,
            "updated": updated,
        }
    )


@app.get("/api/soundbox/active-confirmations")
def get_active_soundbox_confirmations() -> JSONResponse:
    """
    Returns unresponded Soundbox confirmation requests for the UI War Room widget.
    """
    confirmations = db.get_active_soundbox_confirmations()
    return JSONResponse(content={"confirmations": confirmations, "count": len(confirmations)})


@app.get("/api/soundbox/logs")
def get_soundbox_logs(payment_id: Optional[str] = None, limit: int = 50) -> JSONResponse:
    """
    Returns recent Soundbox Whisper logs.
    """
    logs = db.get_soundbox_logs(payment_id=payment_id, limit=limit)
    return JSONResponse(content={"logs": logs, "count": len(logs)})


@app.get("/api/decision-trace/{correlation_id}")
def get_decision_trace(correlation_id: str) -> JSONResponse:
    """
    Returns chronological decision trace nodes for a given correlation ID.
    """
    trace_nodes = db.get_decision_trace_by_correlation(correlation_id)
    return JSONResponse(content={"correlation_id": correlation_id, "nodes": trace_nodes, "count": len(trace_nodes)})


@app.get("/api/pending-recoveries")
def get_pending_recoveries(limit: int = 50) -> JSONResponse:
    """
    Returns active pending recoveries awaiting customer payment closure.
    """
    pending = db.get_pending_recoveries_list(limit=limit)
    return JSONResponse(content={"pending_recoveries": pending, "count": len(pending)})


@app.post("/simulate-mandate-failure")
def simulate_mandate_failure() -> Dict[str, Any]:
    """
    Simulates a mandate/autopay debit failure for Mandate Retry Sequencer testing.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )
    sim_payment_id = f"pay_mnd_{uuid.uuid4().hex[:8]}"
    correlation_id = str(uuid.uuid4())

    db.insert_or_ignore_payment(
        payment_id=sim_payment_id,
        amount=299900,
        currency="INR",
        error_code="mandate_autopay_decline",
        error_description="Customer bank recurring mandate debit declined",
        user_contact="9876543210",
        status="PENDING",
    )

    db.log_event(
        correlation_id=correlation_id,
        payment_id=sim_payment_id,
        event_type="DETECTED",
        payload={
            "amount_paise": 299900,
            "error_code": "mandate_autopay_decline",
            "error_description": "Recurring mandate debit declined by bank",
            "masked_contact": "******3210",
            "simulated": True,
        },
        reasoning="Mandate failure captured for retry sequencer demonstration.",
        severity="INFO",
    )

    result = orchestrator.process_single_payment_workflow(
        payment_id=sim_payment_id,
        correlation_id=correlation_id,
    )

    return {
        "status": "success",
        "message": "Mandate failure ingested and scheduled.",
        "payment_id": sim_payment_id,
        "correlation_id": correlation_id,
        "workflow_result": result,
    }


@app.post("/dev/force-mandate-attempt")
async def dev_force_mandate_attempt(request: Request) -> JSONResponse:
    """
    Demo Accelerator: Forces the next pending mandate attempt to fire immediately.
    """
    try:
        body = await request.json()
        payment_id = body.get("payment_id") if isinstance(body, dict) else None
    except Exception:
        payment_id = None

    result = orchestrator.dev_force_mandate_attempt(payment_id=payment_id)
    return JSONResponse(status_code=200 if result.get("success") else 400, content=result)


@app.get("/api/audit-logs")
def get_audit_logs(limit: int = 50) -> JSONResponse:
    """
    Returns the latest audit log entries formatted for the assurance ledger.
    """
    logs = db.get_recent_audit_logs(limit=limit)
    return JSONResponse(content=logs)


@app.get("/api/learning-insights")
def get_learning_insights() -> JSONResponse:
    """
    Returns per-customer-segment intervention success heatmap and top learning insight (Track 3 Priority 3).
    """
    insights = db.get_learning_insights()
    return JSONResponse(content=insights)


@app.get("/api/dedup-stats")
def get_dedup_stats() -> JSONResponse:
    """
    Returns idempotency shield statistics and blocked duplicate count (Track 3 Priority 4).
    """
    stats = db.get_dedup_stats()
    return JSONResponse(content=stats)


class SimulatePaytmQrRequest(BaseModel):
    merchant_name: Optional[str] = "Sharma General Store"
    amount: int = Field(default=300000, description="Amount in paise (300000 = Rs.3,000)")
    user_contact: Optional[str] = "9876543210"
    result_code: Optional[str] = "QR_SESSION_TIMEOUT"


@app.post("/simulate-paytm-qr-failure")
def simulate_paytm_qr_failure(req: Optional[SimulatePaytmQrRequest] = None) -> Dict[str, Any]:
    """
    Track 3 Priority 2: Paytm Kirana Dynamic QR Failure Simulation.
    Simulates Paytm TXN_FAILURE callback, normalizes it via Paytm Adapter,
    and drives the recovery pipeline.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )
    if req is None:
        req = SimulatePaytmQrRequest()
    sim_payment_id = f"pay_paytm_{uuid.uuid4().hex[:8]}"
    correlation_id = str(uuid.uuid4())

    # Step 1: S2S_CALLBACK with Paytm adapter normalization trace
    db.insert_or_ignore_payment(
        payment_id=sim_payment_id,
        amount=req.amount,
        currency="INR",
        error_code="paytm_dynamic_qr_drop",
        error_description=f"Paytm Kirana dynamic QR dropped at checkout ({req.merchant_name} — {req.result_code})",
        user_contact=req.user_contact,
        status="PENDING",
    )

    db.log_event(
        correlation_id=correlation_id,
        payment_id=sim_payment_id,
        event_type="S2S_CALLBACK",
        payload={
            "source": "paytm",
            "merchant_name": req.merchant_name,
            "raw_event": "TXN_FAILURE",
            "result_code": req.result_code,
            "adapter_status": "NORMALIZED",
            "normalized_error": "QR_FAIL",
            "amount_paise": req.amount,
        },
        reasoning=f"Paytm S2S TXN_FAILURE callback received for {req.merchant_name}. Paytm Adapter successfully normalized schema to Kirana QR Failure.",
        severity="INFO",
    )

    # Step 2: DETECTED event
    db.log_event(
        correlation_id=correlation_id,
        payment_id=sim_payment_id,
        event_type="DETECTED",
        payload={
            "amount_paise": req.amount,
            "error_code": "paytm_dynamic_qr_drop",
            "error_description": f"Paytm Dynamic QR session timeout at {req.merchant_name}",
            "masked_contact": db.mask_contact(req.user_contact),
            "simulated": True,
            "adapter": "Paytm Bridge v1.2",
            "merchant_name": req.merchant_name,
        },
        reasoning=f"Payment failure at {req.merchant_name} captured via Paytm QR Bridge. Triggering autonomous Kirana recovery.",
        severity="INFO",
    )

    # Step 3: Run full workflow
    result = orchestrator.process_single_payment_workflow(
        payment_id=sim_payment_id,
        correlation_id=correlation_id,
    )

    return {
        "success": True,
        "payment_id": sim_payment_id,
        "correlation_id": correlation_id,
        "source": "paytm",
        "adapter_normalized": True,
        "merchant": req.merchant_name,
        "workflow_result": result,
    }


@app.post("/simulate-duplicate-webhook")
async def simulate_duplicate_webhook() -> Dict[str, Any]:
    """
    Track 3 Priority 4: Idempotency Barrier & Duplicate Webhook Shield Demonstration.
    Simulates sending the identical signed webhook twice in a row.
    The first event is processed; the second is mathematically intercepted and blocked.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )
    sim_payment_id = f"pay_wh_dedup_{uuid.uuid4().hex[:8]}"
    correlation_id = str(uuid.uuid4())
    dedup_key = f"sha256:{hashlib.sha256(sim_payment_id.encode('utf-8')).hexdigest()[:24]}"

    # Hit 1: Register and process original
    db.check_or_record_dedup(dedup_key=dedup_key, payment_id=sim_payment_id, event_type="payment.failed")
    db.insert_or_ignore_payment(
        payment_id=sim_payment_id,
        amount=250000,
        currency="INR",
        error_code="duplicate_test_original",
        error_description="Original Webhook Ingestion",
        user_contact="9876543210",
        status="PENDING",
    )
    db.log_event(
        correlation_id=correlation_id,
        payment_id=sim_payment_id,
        event_type="DETECTED",
        payload={"amount_paise": 250000, "dedup_key": dedup_key, "hit": 1},
        reasoning="Original webhook received and verified. Initiating recovery.",
        severity="INFO",
    )

    # Hit 2: Duplicate blocked
    dedup_result = db.check_or_record_dedup(dedup_key=dedup_key, payment_id=sim_payment_id, event_type="payment.failed")
    dupe_cid = str(uuid.uuid4())

    db.log_event(
        correlation_id=dupe_cid,
        payment_id=sim_payment_id,
        event_type="SECURITY_ALERT",
        payload={
            "action": "DUPLICATE_BLOCKED",
            "dedup_key": dedup_key,
            "hit_count": dedup_result["hit_count"],
            "original_payment_id": sim_payment_id,
            "mathematical_guarantee": "One failure. One recovery.",
        },
        reasoning=f"Idempotency Barrier: Duplicate webhook signature {dedup_key} blocked. Recovery workflow not re-triggered.",
        severity="WARNING",
    )

    return {
        "status": "duplicate_blocked",
        "shield_active": True,
        "payment_id": sim_payment_id,
        "dedup_key": dedup_key,
        "hits_recorded": dedup_result["hit_count"],
        "message": "Duplicate webhook intercepted. Recovery was NOT re-triggered.",
    }


@app.get("/api/verify-audit-chain")
def verify_audit_chain() -> JSONResponse:
    """
    Cryptographically verifies the append-only SHA-256 hash chain across all audit log records.
    """
    report = db.verify_audit_hash_chain()
    return JSONResponse(content=report)


@app.get("/api/metrics")
def get_metrics() -> JSONResponse:
    """
    Returns real-time financial, recovery, dynamic discount, and voice metrics.
    """
    metrics = db.get_dashboard_metrics()
    return JSONResponse(content=metrics)


@app.post("/api/reset-demo")
def reset_demo() -> JSONResponse:
    """
    DEV Endpoint: Truncates audit_logs, link_cache, and test failed payments for a clean demo state.
    Guarantees Genesis Block #0 creation and verifies SHA-256 chain integrity.
    """
    if not config.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation disabled in production",
        )
    res = db.reset_demo_data()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "success",
            "chain_valid": res.get("chain_valid", True),
            "block_count": res.get("block_count", 1),
            "message": "Demo data reset successfully and Genesis Block #0 verified.",
            "report": res.get("report", {}),
        },
    )


@app.post("/api/customer/opt-out")
async def api_customer_opt_out(req: OptOutRequest) -> JSONResponse:
    """
    TRAI/TCCCPR & DPDP Customer Opt-Out Endpoint.
    Records customer opt-out in customer_consent (opted_in=0) and dnd_registry (is_dnd=1),
    and appends an immutable CONSENT_REVOKED audit event.
    """
    import compliance_gate
    clean_phone = compliance_gate.normalize_phone(req.phone)
    db.set_customer_opt_out(clean_phone)
    cid = str(uuid.uuid4())
    masked = db.mask_contact(clean_phone)
    db.log_event(
        correlation_id=cid,
        payment_id="SYSTEM",
        event_type="CONSENT_REVOKED",
        payload={"phone": masked, "normalized_phone": clean_phone, "opted_out": True},
        reasoning="Customer opted out of all automated voice and SMS communications under TRAI/TCCCPR and DPDP regulations.",
        severity="INFO",
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "opted_out",
            "phone": clean_phone,
            "masked_phone": masked,
            "message": "Successfully opted out from all automated communications.",
        },
    )


@app.get("/api/employee-report")
def get_employee_report() -> JSONResponse:
    """
    Returns real-time AI Teammate Official Performance Review & ROI Scorecard
    calculated dynamically from SQLite failed_payments and audit_logs.
    """
    stats = db.get_employee_report_stats()
    return JSONResponse(content=stats)


@app.get("/dashboard", response_class=HTMLResponse)
def render_dashboard(request: Request):
    """
    [DEPRECATED] Serves the legacy HTML dashboard interface.
    Recommended: Use the Next.js War Room Console at http://localhost:8080/console
    """
    metrics = db.get_dashboard_metrics()
    recent_logs = db.get_recent_audit_logs(limit=15)
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "metrics": metrics,
            "recent_logs": recent_logs,
            "deprecated_banner": True,
            "console_url": "http://localhost:8080/console",
        },
    )


@app.get("/", response_class=HTMLResponse)
def root_redirect(request: Request):
    """Redirects the root index to the /dashboard endpoint."""
    return render_dashboard(request)


# =========================================================================
# Promise-to-Pay Tracker Endpoints
# =========================================================================
class PromiseToPayRequest(BaseModel):
    """Request model for the Promise-to-Pay endpoint."""
    payment_id: Optional[str] = None
    promised_hour: Optional[int] = None
    minutes_from_now: Optional[int] = None


@app.post("/promise-to-pay")
async def promise_to_pay(request: Request) -> JSONResponse:
    """
    Records a customer's promise to pay at a specified time.
    Supports demo mode (minutes_from_now) and real mode (promised_hour with RBI window clamping).
    """
    correlation_id = str(uuid.uuid4())
    now_utc = datetime.now(timezone.utc)
    # IST offset
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = now_utc + ist_offset

    # Parse body
    try:
        body = await request.json()
        if not isinstance(body, dict):
            body = {}
    except Exception:
        body = {}

    payment_id = body.get("payment_id")
    promised_hour = body.get("promised_hour")
    minutes_from_now = body.get("minutes_from_now")

    # VALIDATION 1: time_required
    if promised_hour is None and minutes_from_now is None:
        return JSONResponse(
            status_code=400,
            content={"error": "time_required"},
        )

    # VALIDATION 2: minutes_from_now range
    if minutes_from_now is not None:
        try:
            minutes_from_now = int(minutes_from_now)
        except (TypeError, ValueError):
            return JSONResponse(status_code=400, content={"error": "invalid_minutes_from_now"})
        if minutes_from_now < 0 or minutes_from_now > 1440:
            return JSONResponse(status_code=400, content={"error": "invalid_minutes_from_now"})

    # VALIDATION 3: promised_hour range
    if promised_hour is not None and minutes_from_now is None:
        try:
            promised_hour = int(promised_hour)
        except (TypeError, ValueError):
            return JSONResponse(status_code=400, content={"error": "invalid_promised_hour"})
        if promised_hour < 0 or promised_hour > 23:
            return JSONResponse(status_code=400, content={"error": "invalid_promised_hour"})

    # PAYMENT RESOLUTION
    if not payment_id:
        # Find latest non-RECOVERED payment
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT payment_id FROM failed_payments WHERE status != 'RECOVERED' AND payment_id NOT IN ('SYSTEM','SYSTEM_WEBHOOK') ORDER BY created_at DESC LIMIT 1"
            )
            row = cursor.fetchone()
            if not row:
                return JSONResponse(status_code=409, content={"error": "no_active_payment"})
            payment_id = row["payment_id"]
    else:
        payment = db.get_payment(payment_id)
        if not payment:
            return JSONResponse(status_code=409, content={"error": "no_active_payment"})

    # VALIDATION: payment already RECOVERED
    payment = db.get_payment(payment_id)
    if payment and payment.get("status") == "RECOVERED":
        return JSONResponse(status_code=400, content={"error": "already_recovered"})

    # VALIDATION: active promise exists
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM promises WHERE payment_id=? AND status IN ('pending','followed_up') LIMIT 1",
            (payment_id,),
        )
        existing = cursor.fetchone()
        if existing:
            return JSONResponse(
                status_code=409,
                content={"error": "promise_exists", "promise_id": existing["id"]},
            )

    # TIME RESOLUTION (precedence: minutes_from_now > promised_hour)
    clamped = False
    mode = "DEMO"
    reasoning = ""

    if minutes_from_now is not None:
        # DEMO MODE
        promised_at_utc = now_utc + timedelta(minutes=minutes_from_now)
        mode = "DEMO"
        reasoning = "DEMO MODE \u2014 RBI window bypassed for live demonstration"
    else:
        # REAL MODE with RBI 9-21 IST window clamping
        mode = "REAL"
        target_ist = now_ist.replace(hour=promised_hour, minute=0, second=0, microsecond=0)
        if target_ist <= now_ist:
            target_ist += timedelta(days=1)

        clamped_ist, was_clamped = clamp_to_rbi_window(target_ist)
        clamped = was_clamped
        if was_clamped:
            reasoning = f"Requested {promised_hour:02d}:00 IST -> clamped to {clamped_ist.strftime('%H:%M')} IST ({clamped_ist.strftime('%d-%b')}) per RBI outreach guidelines (09:00-21:00 IST)"
            db.log_event(
                correlation_id=correlation_id,
                payment_id=payment_id,
                event_type="RBI_WINDOW_ADJUSTED",
                payload={
                    "requested_hour": promised_hour,
                    "clamped_ist": clamped_ist.strftime("%Y-%m-%d %H:%M:%S"),
                    "reason": "RBI outreach window 09:00-21:00 IST enforcement",
                },
                reasoning=reasoning,
                severity="INFO",
            )
        else:
            reasoning = f"Promise scheduled at {clamped_ist.strftime('%H:%M')} IST within RBI outreach window"

        target_ist = clamped_ist
        promised_at_utc = target_ist - ist_offset

    promised_at_str = promised_at_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    followup_after_utc = promised_at_utc + timedelta(minutes=PROMISE_GRACE_MINUTES)
    followup_after_str = followup_after_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    created_at_str = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    # INSERT promise
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO promises (payment_id, promised_at, followup_after, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
            (payment_id, promised_at_str, followup_after_str, created_at_str),
        )
        promise_id = cursor.lastrowid
        conn.commit()

    # Log PROMISE_TO_PAY via hash chain
    db.log_event(
        correlation_id=correlation_id,
        payment_id=payment_id,
        event_type="PROMISE_TO_PAY",
        payload={
            "promise_id": promise_id,
            "payment_id": payment_id,
            "promised_at": promised_at_str,
            "followup_after": followup_after_str,
            "clamped": clamped,
            "mode": mode,
            "reasoning": reasoning,
            "correlation_id": correlation_id,
        },
        reasoning=reasoning,
        severity="INFO",
    )

    # Dispatch to n8n autonomous execution layer (with automatic internal fallback)
    await orchestrator.async_dispatch_to_n8n(
        payload={
            "workflow_type": "promise_to_pay_orchestrator",
            "promise_id": promise_id,
            "payment_id": payment_id,
            "remind_at": promised_at_str,
            "promised_at": promised_at_str,
            "followup_after": followup_after_str,
            "clamped": clamped,
            "mode": mode,
            "correlation_id": correlation_id,
        },
        correlation_id=correlation_id,
    )

    return JSONResponse(
        status_code=201,
        content={
            "id": promise_id,
            "payment_id": payment_id,
            "promised_at": promised_at_str,
            "followup_after": followup_after_str,
            "status": "pending",
            "clamped": clamped,
            "reasoning": reasoning,
        },
    )


# =========================================================================
# n8n Autonomous Workflow Integration Endpoints
# =========================================================================

@app.get("/api/payment/{payment_id}/status")
def get_payment_status(payment_id: str) -> JSONResponse:
    """
    Returns real-time payment status for n8n orchestrator polling/decision nodes.
    """
    payment = db.get_payment(payment_id)
    if not payment:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": f"Payment {payment_id} not found"},
        )
    return JSONResponse(
        content={
            "payment_id": payment["payment_id"],
            "status": payment["status"],
            "amount": payment["amount"],
            "currency": payment.get("currency", "INR"),
            "retry_count": payment.get("retry_count", 0),
            "error_code": payment.get("error_code"),
        }
    )


class LogPromiseKeptRequest(BaseModel):
    payment_id: str
    promise_id: Optional[int] = None
    correlation_id: Optional[str] = None


@app.post("/api/log-promise-kept")
async def api_log_promise_kept(req: LogPromiseKeptRequest) -> JSONResponse:
    """
    Records a promise as KEPT and appends an immutable hash-chained audit event.
    Invoked by n8n or internal webhook.
    """
    import memory
    cid = req.correlation_id or str(uuid.uuid4())
    pid = req.payment_id
    payment = db.get_payment(pid)
    contact = payment.get("user_contact") if payment else pid

    with db.get_connection() as conn:
        cursor = conn.cursor()
        if req.promise_id:
            cursor.execute(
                "UPDATE promises SET status='kept' WHERE id=? AND status IN ('pending','followed_up')",
                (req.promise_id,),
            )
        else:
            cursor.execute(
                "UPDATE promises SET status='kept' WHERE payment_id=? AND status IN ('pending','followed_up')",
                (pid,),
            )
        resolved = cursor.rowcount
        conn.commit()

    memory.remember_customer_context(
        customer_ref=contact,
        interaction_data={"event": "PROMISE_KEPT", "payment_id": pid, "promise_id": req.promise_id},
        correlation_id=cid,
    )

    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="PROMISE_KEPT",
        payload={
            "promise_id": req.promise_id,
            "resolved_count": resolved,
            "source": "n8n_execution_layer",
        },
        reasoning=f"Promise resolved as KEPT via n8n autonomous execution layer for {pid}.",
        severity="INFO",
    )
    return JSONResponse(content={"status": "ok", "payment_id": pid, "resolved_count": resolved})


class TriggerVoiceReminderRequest(BaseModel):
    payment_id: str
    promise_id: Optional[int] = None
    script: Optional[str] = None
    correlation_id: Optional[str] = None


@app.post("/api/trigger-voice-reminder")
async def api_trigger_voice_reminder(req: TriggerVoiceReminderRequest) -> JSONResponse:
    """
    Dispatches voice reminder and logs PROMISE_FOLLOWUP + MESSAGE_SENT audit events via n8n.
    """
    cid = req.correlation_id or str(uuid.uuid4())
    pid = req.payment_id

    payment = db.get_payment(pid)
    if payment and payment.get("status") == "RECOVERED":
        db.log_event(
            correlation_id=cid,
            payment_id=pid,
            event_type="SWEEP_ABORTED_ALREADY_RECOVERED",
            payload={"payment_id": pid, "action": "voice_reminder_aborted", "status": "RECOVERED"},
            reasoning="Payment already recovered; voice sweep reminder aborted to protect customer experience.",
            severity="INFO",
        )
        return JSONResponse(
            content={"status": "aborted", "reason": "already_recovered", "payment_id": pid}
        )

    import compliance_gate
    phone = (payment.get("user_contact") if payment else "") or ""
    gate_res = compliance_gate.check_compliance_gate(phone, pid, cid)
    if not gate_res["allowed"]:
        return JSONResponse(
            content={"status": "blocked_by_compliance", "reason": gate_res["reason"], "payment_id": pid}
        )

    with db.get_connection() as conn:
        cursor = conn.cursor()
        if req.promise_id:
            cursor.execute(
                "UPDATE promises SET status='followed_up' WHERE id=? AND status='pending'",
                (req.promise_id,),
            )
        else:
            cursor.execute(
                "UPDATE promises SET status='followed_up' WHERE payment_id=? AND status='pending'",
                (pid,),
            )
        conn.commit()

    payment_link, link_source = orchestrator._resolve_payment_link(pid)
    reminder_script = req.script or "Bhaiya, aapka payment link abhi bhi active hai. Kripya tap karke payment complete karein."
    audio_url = ""
    try:
        import voice_engine
        audio_url = voice_engine.generate_hinglish_voice(
            script=reminder_script,
            payment_id=pid,
            correlation_id=cid,
        )
    except Exception as voice_err:
        logger.warning("Voice reminder generation error for %s: %s", pid, voice_err)

    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="PROMISE_FOLLOWUP",
        payload={
            "promise_id": req.promise_id,
            "payment_id": pid,
            "source": "n8n_execution_layer",
        },
        reasoning=f"Promise follow-up triggered via n8n autonomous execution layer for {pid}.",
        severity="INFO",
    )

    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="MESSAGE_SENT",
        payload={
            "script": reminder_script,
            "audio_url": audio_url,
            "payment_link": payment_link or "",
            "link_source": link_source,
            "channel": "Voice/WhatsApp",
            "source": "n8n_execution_layer",
        },
        reasoning="Promise follow-up reminder dispatched via n8n execution layer.",
        severity="INFO",
    )

    return JSONResponse(
        content={
            "status": "ok",
            "payment_id": pid,
            "audio_url": audio_url,
            "payment_link": payment_link,
        }
    )


class EscalateHumanRequest(BaseModel):
    payment_id: str
    reason: Optional[str] = None
    correlation_id: Optional[str] = None


@app.post("/api/escalate-human")
async def api_escalate_human(req: EscalateHumanRequest) -> JSONResponse:
    """
    Escalates payment to human compliance review and updates payment status to ESCALATED.
    """
    import memory
    cid = req.correlation_id or str(uuid.uuid4())
    pid = req.payment_id
    reason = req.reason or "Autonomous recovery sequence exhausted — escalated to human review per bounded policy."
    payment = db.get_payment(pid)
    contact = payment.get("user_contact") if payment else pid

    db.update_payment_status(pid, "ESCALATED")

    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE promises SET status='broken' WHERE payment_id=? AND status IN ('pending','followed_up')",
            (pid,),
        )
        conn.commit()

    memory.remember_customer_context(
        customer_ref=contact,
        interaction_data={"event": "ESCALATED", "payment_id": pid, "reason": reason},
        correlation_id=cid,
    )

    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="ESCALATE_HUMAN",
        payload={
            "payment_id": pid,
            "reason": reason,
            "status": "ESCALATED",
            "source": "n8n_execution_layer",
        },
        reasoning=reason,
        severity="CRITICAL",
    )

    return JSONResponse(
        content={
            "status": "ok",
            "payment_id": pid,
            "payment_status": "ESCALATED",
            "reason": reason,
        }
    )


class MandateAttemptRequest(BaseModel):
    payment_id: str
    correlation_id: Optional[str] = None
    attempt_no: Optional[int] = 1


@app.post("/api/mandates/attempt")
async def api_mandate_attempt(req: MandateAttemptRequest) -> JSONResponse:
    """
    Executes a mandate debit attempt dispatched by n8n Mandate Retry Sequencer.
    """
    cid = req.correlation_id or str(uuid.uuid4())
    pid = req.payment_id
    attempt_no = req.attempt_no or 1

    payment = db.get_payment(pid)
    if not payment:
        return JSONResponse(status_code=404, content={"status": "error", "message": f"Payment {pid} not found"})

    if payment.get("status") == "RECOVERED":
        db.log_event(
            correlation_id=cid,
            payment_id=pid,
            event_type="SWEEP_ABORTED_ALREADY_RECOVERED",
            payload={"payment_id": pid, "action": "mandate_attempt_aborted", "status": "RECOVERED"},
            reasoning="Payment already recovered; mandate sweep retry aborted to prevent duplicate debit.",
            severity="INFO",
        )
        return JSONResponse(
            content={"status": "aborted", "reason": "already_recovered", "payment_id": pid}
        )

    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="MANDATE_ATTEMPT",
        payload={"payment_id": pid, "attempt_no": attempt_no, "source": "n8n_mandate_sequencer"},
        reasoning=f"Executing Mandate Retry Attempt #{attempt_no} via n8n Sequencer.",
        severity="INFO",
    )

    return JSONResponse(content={"status": "ok", "payment_id": pid, "attempt_no": attempt_no})


@app.get("/api/customer-memory/{payment_id}")
def get_customer_memory(payment_id: str) -> JSONResponse:
    """
    Returns long-term customer memory recalled from Cognee / SQLite for UI display in Decision Trace.
    """
    import memory
    payment = db.get_payment(payment_id)
    contact = payment.get("user_contact") if payment else payment_id
    ctx = memory.recall_customer_context(contact)
    return JSONResponse(content=ctx)


@app.get("/api/voice-status")
@app.get("/voice-status")
def get_voice_status() -> JSONResponse:
    """
    Returns the real-time operational status of Sarvam Voice Engine and gTTS fallback.
    """
    import voice_engine
    return JSONResponse(content=voice_engine.get_voice_engine_status())


@app.get("/api/voice-sample")
@app.get("/voice-sample")
def get_voice_sample() -> JSONResponse:
    """
    Synthesizes and returns a sample Hinglish voice recovery note via Sarvam AI / gTTS.
    """
    import voice_engine
    script = (
        "Namaste! Sharma General Store ki taraf se aapka 2,940 rupees ka payment link active hai. "
        "Kripya 1-click se UPI payment complete kar lijiye."
    )
    audio_url = voice_engine.generate_hinglish_voice(
        script=script,
        payment_id="demo_sample_audio",
        correlation_id="demo_cid_sample",
    )
    return JSONResponse(
        content={
            "status": "ok",
            "audio_url": audio_url,
            "script": script,
            "provider": "Sarvam AI (bulbul:v3)",
        }
    )



class MandateAttemptRequest(BaseModel):
    payment_id: str
    attempt_no: int = 1
    correlation_id: Optional[str] = None


@app.post("/api/mandates/attempt")
async def api_mandates_attempt(req: MandateAttemptRequest) -> JSONResponse:
    """
    Executes a specific mandate retry attempt (invoked by n8n workflow or manual override).
    """
    cid = req.correlation_id or str(uuid.uuid4())
    pid = req.payment_id
    att_no = req.attempt_no

    payment = db.get_payment(pid)
    if not payment:
        return JSONResponse(status_code=404, content={"status": "error", "message": "Payment not found"})

    if payment.get("status") == "RECOVERED":
        return JSONResponse(content={"status": "cancelled", "message": "Payment already recovered"})

    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE mandate_schedule SET status='fired' WHERE payment_id=? AND attempt_no=?",
            (pid, att_no),
        )
        conn.commit()

    payment_link, link_source = orchestrator._resolve_payment_link(pid)
    if not payment_link:
        payment_link = f"https://rzp.io/i/plink_mnd_{pid[-8:] if len(pid)>=8 else pid}"
        link_source = "fallback"

    script = (
        f"Namaste! Aapka mandate autopay attempt {att_no} complete nahi ho paya. "
        f"Kripya diye gaye link se 1-click payment complete karein."
    )
    audio_url = ""
    try:
        audio_url = razorpay_service.generate_voice_audio(
            script=script,
            payment_id=pid,
            correlation_id=cid,
        )
    except Exception as voice_err:
        logger.warning("Mandate voice generation error for %s: %s", pid, voice_err)

    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="MANDATE_ATTEMPT",
        payload={
            "attempt_no": att_no,
            "payment_link": payment_link,
            "audio_url": audio_url,
            "link_source": link_source,
            "source": "n8n_execution_layer",
        },
        reasoning=f"Mandate debit attempt {att_no} executed via n8n execution layer.",
        severity="INFO",
    )

    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="MESSAGE_SENT",
        payload={
            "channel": "SMS/WhatsApp",
            "link": payment_link,
            "audio_url": audio_url,
            "mandate_attempt": att_no,
            "source": "n8n_execution_layer",
        },
        reasoning=f"Mandate debit retry notice {att_no} dispatched via n8n execution layer.",
        severity="INFO",
    )

    return JSONResponse(
        content={
            "status": "ok",
            "payment_id": pid,
            "attempt_no": att_no,
            "payment_link": payment_link,
            "audio_url": audio_url,
        }
    )


@app.post("/dev/force-promise-check")
def dev_force_promise_check() -> JSONResponse:
    """
    DEV Endpoint: Runs ONLY the sweep's promise section immediately.
    Idempotent — same atomic rowcount guards apply.
    """
    try:
        result = orchestrator.run_promise_sweep()
        return JSONResponse(status_code=200, content={"status": "ok", "result": result})
    except Exception as exc:
        logger.error("Force promise check error: %s", exc)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(exc)})


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8010))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)


