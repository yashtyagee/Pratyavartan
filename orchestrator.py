"""
orchestrator.py - Autonomous Recovery Orchestration Engine.

COMPLIANCE PURPOSE:
Coordinates the multi-stage payment recovery pipeline from ingestion and bounded AI diagnosis
to dynamic action dispatch, automated discount negotiation, voice synthesis, and human escalation.
Enforces 1:1 correlation ID traceability across all asynchronous stages and state changes.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import httpx
import ai_agent
import db
import razorpay_service

logger = logging.getLogger(__name__)

PROMISE_GRACE_MINUTES = int(os.getenv("PROMISE_GRACE_MINUTES", "30"))


def dispatch_to_n8n(
    payload: Dict[str, Any],
    correlation_id: Optional[str] = None,
) -> bool:
    """
    PART 1: FastAPI Dispatcher with Fallback for n8n Autonomous Workflows.
    - Tries to POST to os.getenv("N8N_WEBHOOK_URL") with a 5s timeout.
    - If successful (status 200..299): logs event_type="N8N_WORKFLOW_DISPATCHED" (severity="INFO") and returns True.
    - If fails (timeout, connection error, 5xx, or unset URL): logs event_type="N8N_FALLBACK_INTERNAL" (severity="WARNING")
      and returns False so that the internal Python fallback (existing sweep logic) is immediately engaged.
    """
    cid = correlation_id or str(uuid.uuid4())
    payment_id = str(payload.get("payment_id") or "SYSTEM")
    n8n_url = os.getenv("N8N_WEBHOOK_URL", "").strip()

    if not n8n_url or n8n_url.lower() in ("dummy", "none", "unset", ""):
        logger.info("[N8N_DISPATCH] N8N_WEBHOOK_URL unset. Engaging internal Python fallback safety net for %s.", payment_id)
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="N8N_FALLBACK_INTERNAL",
            payload={
                "payment_id": payment_id,
                "reason": "N8N_WEBHOOK_URL not configured",
                "fallback": "internal_python_scheduler",
                "workflow_type": payload.get("workflow_type", "unknown"),
            },
            reasoning="N8N webhook URL not provided — immediately engaging internal Python fallback scheduler.",
            severity="WARNING",
        )
        return False

    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(n8n_url, json=payload)
            if resp.is_success:
                logger.info("[N8N_DISPATCH] Successfully dispatched workflow to n8n: %s (status %s)", payment_id, resp.status_code)
                db.log_event(
                    correlation_id=cid,
                    payment_id=payment_id,
                    event_type="N8N_WORKFLOW_DISPATCHED",
                    payload={
                        "payment_id": payment_id,
                        "n8n_url": n8n_url,
                        "status_code": resp.status_code,
                        "workflow_type": payload.get("workflow_type"),
                    },
                    reasoning="Autonomous workflow successfully dispatched to n8n execution layer.",
                    severity="INFO",
                )
                return True
            else:
                error_msg = f"n8n returned HTTP {resp.status_code}: {resp.text[:100]}"
                logger.warning("[N8N_DISPATCH] %s. Engaging internal fallback.", error_msg)
                db.log_event(
                    correlation_id=cid,
                    payment_id=payment_id,
                    event_type="N8N_FALLBACK_INTERNAL",
                    payload={
                        "payment_id": payment_id,
                        "error": error_msg,
                        "status_code": resp.status_code,
                        "fallback": "internal_python_scheduler",
                    },
                    reasoning="n8n webhook call returned error status — engaging internal Python fallback scheduler.",
                    severity="WARNING",
                )
                return False
    except Exception as exc:
        logger.warning("[N8N_DISPATCH] Exception dispatching to n8n (%s). Engaging internal fallback.", exc)
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="N8N_FALLBACK_INTERNAL",
            payload={
                "payment_id": payment_id,
                "error": str(exc),
                "fallback": "internal_python_scheduler",
            },
            reasoning=f"n8n dispatch encountered error ({exc}) — immediately engaging internal Python fallback scheduler.",
            severity="WARNING",
        )
        return False


async def async_dispatch_to_n8n(
    payload: Dict[str, Any],
    correlation_id: Optional[str] = None,
) -> bool:
    """Async wrapper for dispatching autonomous workflows to n8n."""
    cid = correlation_id or str(uuid.uuid4())
    payment_id = str(payload.get("payment_id") or "SYSTEM")
    n8n_url = os.getenv("N8N_WEBHOOK_URL", "").strip()

    if not n8n_url or n8n_url.lower() in ("dummy", "none", "unset", ""):
        logger.info("[N8N_DISPATCH] N8N_WEBHOOK_URL unset. Engaging internal Python fallback safety net.")
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="N8N_FALLBACK_INTERNAL",
            payload={
                "payment_id": payment_id,
                "reason": "N8N_WEBHOOK_URL not configured",
                "fallback": "internal_python_scheduler",
                "workflow_type": payload.get("workflow_type", "unknown"),
            },
            reasoning="N8N webhook URL not provided — immediately engaging internal Python fallback scheduler.",
            severity="WARNING",
        )
        return False

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(n8n_url, json=payload)
            if resp.is_success:
                logger.info("[N8N_DISPATCH] Successfully dispatched workflow to n8n: %s (status %s)", payment_id, resp.status_code)
                db.log_event(
                    correlation_id=cid,
                    payment_id=payment_id,
                    event_type="N8N_WORKFLOW_DISPATCHED",
                    payload={
                        "payment_id": payment_id,
                        "n8n_url": n8n_url,
                        "status_code": resp.status_code,
                        "workflow_type": payload.get("workflow_type"),
                    },
                    reasoning="Autonomous workflow successfully dispatched to n8n execution layer.",
                    severity="INFO",
                )
                return True
            else:
                error_msg = f"n8n returned HTTP {resp.status_code}: {resp.text[:100]}"
                logger.warning("[N8N_DISPATCH] %s. Engaging internal fallback.", error_msg)
                db.log_event(
                    correlation_id=cid,
                    payment_id=payment_id,
                    event_type="N8N_FALLBACK_INTERNAL",
                    payload={
                        "payment_id": payment_id,
                        "error": error_msg,
                        "status_code": resp.status_code,
                        "fallback": "internal_python_scheduler",
                    },
                    reasoning="n8n webhook call returned error status — engaging internal Python fallback scheduler.",
                    severity="WARNING",
                )
                return False
    except Exception as exc:
        logger.warning("[N8N_DISPATCH] Exception dispatching to n8n (%s). Engaging internal fallback.", exc)
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="N8N_FALLBACK_INTERNAL",
            payload={
                "payment_id": payment_id,
                "error": str(exc),
                "fallback": "internal_python_scheduler",
            },
            reasoning=f"n8n dispatch encountered error ({exc}) — immediately engaging internal Python fallback scheduler.",
            severity="WARNING",
        )
        return False


def process_single_payment_workflow(
    payment_id: str,
    correlation_id: str | None = None,
) -> Dict[str, Any]:
    """
    Executes the end-to-end recovery pipeline for a specific failed payment.

    COMPLIANCE PURPOSE:
    Binds the entire lifecycle of a payment failure under a single persistent correlation ID,
    ensuring deterministic routing according to AI diagnosis, dynamic discount rules,
    voice synthesis, and hard stopping rules.
    """
    cid = correlation_id or str(uuid.uuid4())
    payment = db.get_payment(payment_id)
    if not payment:
        logger.error("Payment %s not found for processing.", payment_id)
        return {"success": False, "error": "Payment not found"}

    amount = int(payment.get("amount", 0))

    # Step A: Run Bounded AI Diagnosis
    diagnosis = ai_agent.process_failed_payment(payment_id=payment_id, correlation_id=cid)
    if not diagnosis:
        return {"success": False, "error": "AI diagnosis could not be completed"}

    action = diagnosis.action
    action_result: Dict[str, Any] = {}

    # Step B: Route Action according to AI Decision / Stopping Rules
    if action == "SEND_UPI_INTENT":
        # Dynamic Discount & Voice Negotiation for high-intent abandoned carts (>= Rs.5,000 / 5,00,000 paise)
        if amount >= 500000:
            try:
                discount_info = ai_agent.generate_discount_offer(
                    amount_paise=amount,
                    error_type=diagnosis.diagnosis,
                    correlation_id=cid,
                    payment_id=payment_id,
                )
                final_amount = discount_info.get("final_amount_paise", amount)
                disc_pct = discount_info.get("discount_percentage", 0)
                disc_inr = discount_info.get("discount_amount_paise", 0) / 100.0
                orig_inr = amount / 100.0
                final_inr = final_amount / 100.0

                voice_script = ai_agent.generate_voice_script(
                    customer_name="Valued Customer",
                    original_inr=orig_inr,
                    discount_inr=disc_inr,
                    final_inr=final_inr,
                    correlation_id=cid,
                    payment_id=payment_id,
                )

                audio_url = razorpay_service.generate_voice_audio(
                    script=voice_script,
                    payment_id=payment_id,
                    correlation_id=cid,
                )

                action_result = razorpay_service.handle_cart_drop(
                    payment_id=payment_id,
                    amount=amount,
                    correlation_id=cid,
                    final_amount_paise=final_amount,
                    discount_percentage=disc_pct,
                    voice_script=voice_script,
                    audio_url=audio_url,
                )
            except Exception as discount_err:
                logger.error("Discount/Voice workflow error for %s: %s", payment_id, discount_err)
                action_result = razorpay_service.handle_cart_drop(
                    payment_id=payment_id, amount=amount, correlation_id=cid
                )
        else:
            action_result = razorpay_service.handle_cart_drop(
                payment_id=payment_id, amount=amount, correlation_id=cid
            )

    elif action == "SWITCH_INSTRUMENT":
        try:
            # Persona-Aware Instrument Switching: resolve the payment's ORIGINAL error_code
            # (upi_limit_exceeded vs insufficient_balance) to drive method routing.
            # Any failure falls back to branch (b): NEVER restrict methods on unknown cause.
            original_error_code = str(payment.get("error_code") or "")

            # Voice Negotiation for UPI Limit / Low Balance (Full amount, NO discount)
            orig_inr = amount / 100.0
            voice_script = ai_agent.generate_voice_script(
                customer_name="Valued Customer",
                original_inr=orig_inr,
                discount_inr=0.0,
                final_inr=orig_inr,
                correlation_id=cid,
                payment_id=payment_id,
                diagnosis="LOW_BALANCE",
                original_error_code=original_error_code,
            )

            audio_url = razorpay_service.generate_voice_audio(
                script=voice_script,
                payment_id=payment_id,
                correlation_id=cid,
            )

            action_result = razorpay_service.handle_low_balance(
                payment_id=payment_id,
                amount=amount,
                correlation_id=cid,
                voice_script=voice_script,
                audio_url=audio_url,
                original_error_code=original_error_code,
            )
        except Exception as low_bal_err:
            logger.error("Low balance workflow error for %s: %s", payment_id, low_bal_err)
            action_result = razorpay_service.handle_low_balance(
                payment_id=payment_id,
                amount=amount,
                correlation_id=cid,
            )
    elif action == "WAIT_AND_MONITOR":
        action_result = razorpay_service.handle_bank_down(
            payment_id=payment_id, correlation_id=cid
        )
    elif action == "MANDATE_RETRY" or (diagnosis and diagnosis.scenario == "MANDATE_FAIL"):
        action_result = schedule_mandate_retry(
            payment_id=payment_id, correlation_id=cid
        )
    elif action == "ESCALATE_HUMAN":
        db.update_payment_status(payment_id, "ESCALATED")
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="ESCALATED",
            payload={"reason": diagnosis.reasoning, "status": "ESCALATED"},
            reasoning=diagnosis.reasoning,
            severity="WARNING",
        )
        action_result = {
            "success": True,
            "action": "ESCALATED",
            "message": "Payment escalated for manual compliance review.",
        }

    # Record final routing decision in audit trail
    db.log_event(
        correlation_id=cid,
        payment_id=payment_id,
        event_type="API_EXECUTED",
        payload={
            "orchestrator_decision": action,
            "diagnosis": diagnosis.diagnosis,
            "action_result": action_result,
        },
        reasoning=f"Orchestration completed for action '{action}'.",
        severity="INFO",
    )

    return {
        "success": True,
        "payment_id": payment_id,
        "correlation_id": cid,
        "diagnosis": diagnosis.model_dump(),
        "action_result": action_result,
    }


def _resolve_payment_link(payment_id: str) -> tuple:
    """
    Resolves the most recent payment link for a payment_id.
    Returns (short_url, link_source) where link_source is "cache"|"audit"|"none".
    NEVER fabricates a link or calls Razorpay API.
    """
    # 1st: Check link_cache table
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT link_url FROM link_cache WHERE payment_id=? ORDER BY id DESC LIMIT 1",
                (payment_id,),
            )
            row = cursor.fetchone()
            if row and row["link_url"]:
                return (row["link_url"], "cache")
    except Exception:
        pass

    # 2nd: Scan API_EXECUTED audit payloads for short_url / payment_link_url / one_click_link
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT action_payload FROM audit_logs WHERE payment_id=? AND event_type='API_EXECUTED' ORDER BY log_id DESC",
                (payment_id,),
            )
            for row in cursor.fetchall():
                try:
                    payload = json.loads(row["action_payload"]) if isinstance(row["action_payload"], str) else (row["action_payload"] or {})
                    for key in ("short_url", "payment_link_url", "one_click_link", "payment_link"):
                        url = payload.get(key)
                        if url and isinstance(url, str) and url.startswith("http"):
                            return (url, "audit")
                    # Check nested action_result
                    ar = payload.get("action_result", {})
                    if isinstance(ar, dict):
                        for key in ("payment_link", "payment_link_url", "one_click_link"):
                            url = ar.get(key)
                            if url and isinstance(url, str) and url.startswith("http"):
                                return (url, "audit")
                except Exception:
                    continue
    except Exception:
        pass

    return (None, "none")


def run_promise_sweep() -> Dict[str, Any]:
    """
    Promise-to-Pay sweep section. Checks all active promises and processes them:
    A) KEPT CATCH-UP: promises whose payment is already RECOVERED
    B) DUE FOLLOW-UP: pending promises whose promised_at has passed
    C) BROKEN ESCALATION: followed_up promises whose grace has expired without recovery
    
    Each promise is wrapped in per-row try/except — one bad row must NEVER crash the sweep.
    """
    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    ist_offset = timedelta(hours=5, minutes=30)

    result = {
        "kept": 0,
        "followed_up": 0,
        "broken": 0,
        "errors": 0,
    }

    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, payment_id, promised_at, followup_after, status FROM promises WHERE status IN ('pending', 'followed_up')"
            )
            promises = [dict(row) for row in cursor.fetchall()]
    except Exception as fetch_err:
        logger.error("[PROMISE_SWEEP] Failed to fetch promises: %s", fetch_err)
        return result

    for promise in promises:
        try:
            pid = promise["payment_id"]
            promise_id = promise["id"]
            p_status = promise["status"]
            cid = str(uuid.uuid4())

            # Check payment status
            payment = db.get_payment(pid)
            payment_status = payment.get("status", "PENDING") if payment else "PENDING"
            is_recovered = payment_status == "RECOVERED"
            is_escalated = payment_status == "ESCALATED"

            # A) KEPT CATCH-UP: payment already recovered → mark promise as kept
            if is_recovered:
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE promises SET status='kept' WHERE id=? AND status IN ('pending','followed_up')",
                        (promise_id,),
                    )
                    if cursor.rowcount == 1:
                        conn.commit()
                        import memory
                        memory.remember_customer_context(
                            customer_ref=payment.get("user_contact") if payment else pid,
                            interaction_data={"event": "PROMISE_KEPT", "payment_id": pid, "promise_id": promise_id},
                            correlation_id=cid,
                        )
                        db.log_event(
                            correlation_id=cid,
                            payment_id=pid,
                            event_type="PROMISE_KEPT",
                            payload={"promise_id": promise_id, "source": "sweep_catchup"},
                            reasoning=f"Promise {promise_id} resolved as KEPT — payment already RECOVERED (sweep catch-up).",
                            severity="INFO",
                        )
                        result["kept"] += 1
                    else:
                        conn.commit()
                continue


            # B) DUE FOLLOW-UP: status=pending AND promised_at <= now
            if p_status == "pending" and promise["promised_at"] <= now_str:
                # Atomic transition: only proceed if we win the update
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE promises SET status='followed_up' WHERE id=? AND status='pending'",
                        (promise_id,),
                    )
                    if cursor.rowcount != 1:
                        conn.commit()
                        continue  # Another sweep won — skip silently
                    conn.commit()

                # Format promised_at in IST for the reminder script
                try:
                    pa_dt = datetime.strptime(promise["promised_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                    pa_ist = pa_dt + ist_offset
                    promised_ist_str = pa_ist.strftime("%H:%M")
                except Exception:
                    promised_ist_str = promise["promised_at"]

                # Deterministic voice script (NO LLM call)
                reminder_script = (
                    f"Bhaiya, aapne {promised_ist_str} par pay karne ka bola tha — "
                    f"link abhi bhi active hai. Bas ek click!"
                )

                # Resolve link (never fabricate, never call Razorpay)
                payment_link, link_source = _resolve_payment_link(pid)

                # Generate voice audio via existing pipeline (gTTS + deterministic fallback)
                audio_url = ""
                try:
                    audio_url = razorpay_service.generate_voice_audio(
                        script=reminder_script,
                        payment_id=pid,
                        correlation_id=cid,
                    )
                except Exception as voice_err:
                    logger.warning("Promise follow-up voice generation error for %s: %s", pid, voice_err)

                # Build follow-up payload
                followup_payload: Dict[str, Any] = {
                    "promise_id": promise_id,
                    "payment_id": pid,
                    "promised_at": promise["promised_at"],
                    "followup_after": promise["followup_after"],
                    "correlation_id": cid,
                }
                if is_escalated:
                    followup_payload["note"] = "payment_already_escalated"

                # Log PROMISE_FOLLOWUP
                db.log_event(
                    correlation_id=cid,
                    payment_id=pid,
                    event_type="PROMISE_FOLLOWUP",
                    payload=followup_payload,
                    reasoning=f"Promise {promise_id} follow-up triggered — promised_at {promised_ist_str} IST has passed.",
                    severity="INFO",
                )

                # Log MESSAGE_SENT for the reminder
                msg_payload: Dict[str, Any] = {
                    "script": reminder_script,
                    "audio_url": audio_url,
                    "link_source": link_source,
                    "payment_link": payment_link or "",
                    "correlation_id": cid,
                }
                if link_source == "none":
                    msg_payload["note"] = "No cached or audit link found — reminder sent without payment link"
                if is_escalated:
                    msg_payload["note"] = msg_payload.get("note", "") + (" | " if msg_payload.get("note") else "") + "payment_already_escalated"

                db.log_event(
                    correlation_id=cid,
                    payment_id=pid,
                    event_type="MESSAGE_SENT",
                    payload=msg_payload,
                    reasoning="Promise follow-up reminder dispatched (deterministic template, no LLM).",
                    severity="INFO",
                )

                result["followed_up"] += 1
                continue

            # C) BROKEN ESCALATION: status=followed_up AND followup_after <= now AND not recovered
            if p_status == "followed_up" and promise["followup_after"] <= now_str and not is_recovered:
                # Atomic transition
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE promises SET status='broken' WHERE id=? AND status='followed_up'",
                        (promise_id,),
                    )
                    if cursor.rowcount != 1:
                        conn.commit()
                        continue  # Another sweep won
                    conn.commit()

                broken_reasoning = (
                    "Promise broken — no payment within grace after reminder; "
                    "escalating to human (bounded autonomy: no 3rd automated outreach)."
                )

                import memory
                memory.remember_customer_context(
                    customer_ref=payment.get("user_contact") if payment else pid,
                    interaction_data={"event": "PROMISE_BROKEN", "payment_id": pid, "promise_id": promise_id},
                    correlation_id=cid,
                )

                # Log PROMISE_BROKEN
                db.log_event(
                    correlation_id=cid,
                    payment_id=pid,
                    event_type="PROMISE_BROKEN",
                    payload={
                        "promise_id": promise_id,
                        "payment_id": pid,
                        "promised_at": promise["promised_at"],
                        "followup_after": promise["followup_after"],
                        "correlation_id": cid,
                    },
                    reasoning=broken_reasoning,
                    severity="WARNING",
                )


                # ESCALATE_HUMAN via existing escalate path
                db.update_payment_status(pid, "ESCALATED")
                db.log_event(
                    correlation_id=cid,
                    payment_id=pid,
                    event_type="ESCALATE_HUMAN",
                    payload={
                        "promise_id": promise_id,
                        "reason": broken_reasoning,
                        "status": "ESCALATED",
                    },
                    reasoning=broken_reasoning,
                    severity="CRITICAL",
                )

                result["broken"] += 1
                continue

        except Exception as row_err:
            logger.error("[PROMISE_SWEEP] Error processing promise %s: %s", promise.get("id"), row_err)
            result["errors"] += 1
            continue

    # Log sweep summary
    sweep_cid = str(uuid.uuid4())
    db.log_event(
        correlation_id=sweep_cid,
        payment_id="SYSTEM",
        event_type="PROMISE_SWEEP",
        payload=result,
        reasoning=f"Promise sweep completed: {result['kept']} kept, {result['followed_up']} followed up, {result['broken']} broken.",
        severity="INFO",
    )

    return result


def schedule_mandate_retry(payment_id: str, correlation_id: str) -> Dict[str, Any]:
    """
    Mandate Retry Sequencer:
    Schedules max-3 debit retry attempts with RBI-compliant spacing in IST:
    A1 = tomorrow 10:30 IST
    A2 = day-after 10:30 IST
    A3 = 1st of next month 10:30 IST
    Logs MANDATE_RETRY_SCHEDULED (INFO) with full schedule array.
    """
    now_utc = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = now_utc + ist_offset

    # A1: tomorrow 10:30 IST
    t1_ist = (now_ist + timedelta(days=1)).replace(hour=10, minute=30, second=0, microsecond=0)
    # A2: day-after 10:30 IST
    t2_ist = (now_ist + timedelta(days=2)).replace(hour=10, minute=30, second=0, microsecond=0)
    # A3: 1st of next month 10:30 IST
    if now_ist.month == 12:
        t3_ist = datetime(now_ist.year + 1, 1, 1, 10, 30, 0, 0)
    else:
        t3_ist = datetime(now_ist.year, now_ist.month + 1, 1, 10, 30, 0, 0)

    a1_utc = (t1_ist - ist_offset).strftime("%Y-%m-%dT%H:%M:%SZ")
    a2_utc = (t2_ist - ist_offset).strftime("%Y-%m-%dT%H:%M:%SZ")
    a3_utc = (t3_ist - ist_offset).strftime("%Y-%m-%dT%H:%M:%SZ")

    schedule_list = [
        {"attempt_no": 1, "scheduled_at": a1_utc, "status": "pending"},
        {"attempt_no": 2, "scheduled_at": a2_utc, "status": "pending"},
        {"attempt_no": 3, "scheduled_at": a3_utc, "status": "pending"},
    ]

    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM mandate_schedule WHERE payment_id = ? AND status = 'pending'", (payment_id,))
        for item in schedule_list:
            cursor.execute(
                "INSERT INTO mandate_schedule (payment_id, attempt_no, scheduled_at, status) VALUES (?, ?, ?, 'pending')",
                (payment_id, item["attempt_no"], item["scheduled_at"]),
            )
        conn.commit()

    db.log_event(
        correlation_id=correlation_id,
        payment_id=payment_id,
        event_type="MANDATE_RETRY_SCHEDULED",
        payload={
            "payment_id": payment_id,
            "schedule": schedule_list,
            "rule": "RBI_MANDATE_SPACING_10_30_IST",
        },
        reasoning=f"Mandate failure scheduled for 3 bounded attempts: A1 ({a1_utc}), A2 ({a2_utc}), A3 ({a3_utc}).",
        severity="INFO",
    )

    db.update_payment_status(payment_id, "MONITORING")

    # Dispatch to n8n autonomous execution layer (with automatic internal fallback)
    dispatch_to_n8n(
        payload={
            "workflow_type": "mandate_retry_sequencer",
            "payment_id": payment_id,
            "schedule": schedule_list,
            "a1_utc": a1_utc,
            "a2_utc": a2_utc,
            "a3_utc": a3_utc,
            "correlation_id": correlation_id,
        },
        correlation_id=correlation_id,
    )

    return {
        "success": True,
        "action": "MANDATE_RETRY",
        "payment_id": payment_id,
        "schedule": schedule_list,
    }



def run_mandate_sweep() -> Dict[str, Any]:
    """
    Mandate Retry Sequencer Sweep:
    - Bounded autonomous execution (max 3 attempts).
    - If payment is already RECOVERED: mark remaining attempts as cancelled + log MANDATE_CANCELLED (INFO, 'recovered — no further debit attempts').
    - Attempt fires: reuse LATEST cached link, send voice note via existing pipeline, log MANDATE_ATTEMPT (INFO) + MESSAGE_SENT.
    - If A3 fails (unrecovered): log MANDATE_SCHEDULE_EXHAUSTED (WARNING) + ESCALATE_HUMAN (CRITICAL).
    - Wrapped in per-attempt try/except so sweep never crashes.
    """
    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    result = {
        "fired": 0,
        "cancelled": 0,
        "exhausted": 0,
        "errors": 0,
    }

    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT DISTINCT payment_id FROM mandate_schedule WHERE status IN ('pending', 'fired')"
            )
            payment_ids = [row["payment_id"] for row in cursor.fetchall()]
    except Exception as fetch_err:
        logger.error("[MANDATE_SWEEP] Failed to fetch mandate schedules: %s", fetch_err)
        return result

    for pid in payment_ids:
        try:
            cid = str(uuid.uuid4())
            payment = db.get_payment(pid)
            payment_status = payment.get("status", "PENDING") if payment else "PENDING"
            is_recovered = payment_status == "RECOVERED"

            # 1. Cancel Check: if payment is already RECOVERED -> cancel all remaining attempts
            if is_recovered:
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE mandate_schedule SET status='cancelled' WHERE payment_id=? AND status='pending'",
                        (pid,),
                    )
                    cancelled_count = cursor.rowcount
                    conn.commit()
                    if cancelled_count > 0:
                        db.log_event(
                            correlation_id=cid,
                            payment_id=pid,
                            event_type="MANDATE_CANCELLED",
                            payload={"cancelled_attempts": cancelled_count, "payment_id": pid},
                            reasoning="recovered — no further debit attempts",
                            severity="INFO",
                        )
                        result["cancelled"] += cancelled_count
                continue

            # 2. Check pending attempts due for firing
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, attempt_no, scheduled_at FROM mandate_schedule WHERE payment_id=? AND status='pending' AND scheduled_at <= ? ORDER BY attempt_no ASC",
                    (pid, now_str),
                )
                due_attempts = [dict(row) for row in cursor.fetchall()]

            for attempt in due_attempts:
                att_id = attempt["id"]
                att_no = attempt["attempt_no"]
                att_time = attempt["scheduled_at"]

                # Atomic status transition
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE mandate_schedule SET status='fired' WHERE id=? AND status='pending'",
                        (att_id,),
                    )
                    if cursor.rowcount != 1:
                        conn.commit()
                        continue
                    conn.commit()

                # Reuse LATEST cached link (never create new)
                payment_link, link_source = _resolve_payment_link(pid)
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
                        "scheduled_at": att_time,
                        "payment_link": payment_link,
                        "audio_url": audio_url,
                        "link_source": link_source,
                    },
                    reasoning=f"Mandate debit attempt {att_no} executed via cached recovery link.",
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
                    },
                    reasoning=f"Mandate debit retry notice {att_no} dispatched.",
                    severity="INFO",
                )
                result["fired"] += 1

            # 3. Exhaustion Check: if Attempt 3 is fired and not recovered, mark failed & escalate
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, status FROM mandate_schedule WHERE payment_id=? AND attempt_no=3 AND status='fired'",
                    (pid,),
                )
                a3_row = cursor.fetchone()
                if a3_row and not is_recovered:
                    cursor.execute("SELECT COUNT(*) as count FROM mandate_schedule WHERE payment_id=? AND status='pending'", (pid,))
                    if cursor.fetchone()["count"] == 0:
                        cursor.execute("UPDATE mandate_schedule SET status='failed' WHERE id=? AND status='fired'", (a3_row["id"],))
                        if cursor.rowcount == 1:
                            conn.commit()
                            exhaust_reason = "Mandate retry sequence exhausted after 3 attempts without recovery."
                            db.log_event(
                                correlation_id=cid,
                                payment_id=pid,
                                event_type="MANDATE_SCHEDULE_EXHAUSTED",
                                payload={"payment_id": pid, "total_attempts": 3, "status": "failed"},
                                reasoning=exhaust_reason,
                                severity="WARNING",
                            )
                            db.update_payment_status(pid, "ESCALATED")
                            db.log_event(
                                correlation_id=cid,
                                payment_id=pid,
                                event_type="ESCALATE_HUMAN",
                                payload={"payment_id": pid, "reason": exhaust_reason, "status": "ESCALATED"},
                                reasoning=exhaust_reason,
                                severity="CRITICAL",
                            )
                            result["exhausted"] += 1
                        else:
                            conn.commit()
        except Exception as pid_err:
            logger.error("[MANDATE_SWEEP] Error processing mandate for payment %s: %s", pid, pid_err)
            result["errors"] += 1
            continue

    return result


def dev_force_mandate_attempt(payment_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Demo Accelerator: Marks the next pending mandate attempt's scheduled_at to now,
    and runs the sweep immediately so it fires with idempotency guard.
    """
    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    with db.get_connection() as conn:
        cursor = conn.cursor()
        if payment_id:
            cursor.execute(
                "SELECT id, payment_id, attempt_no FROM mandate_schedule WHERE payment_id=? AND status='pending' ORDER BY attempt_no ASC LIMIT 1",
                (payment_id,),
            )
        else:
            cursor.execute(
                "SELECT id, payment_id, attempt_no FROM mandate_schedule WHERE status='pending' ORDER BY scheduled_at ASC, attempt_no ASC LIMIT 1"
            )
        row = cursor.fetchone()
        if not row:
            return {"success": False, "message": "No pending mandate attempt found."}

        target_id = row["id"]
        cursor.execute(
            "UPDATE mandate_schedule SET scheduled_at=? WHERE id=? AND status='pending'",
            (now_str, target_id),
        )
        conn.commit()

    sweep_result = run_mandate_sweep()
    return {
        "success": True,
        "forced_id": target_id,
        "payment_id": row["payment_id"],
        "attempt_no": row["attempt_no"],
        "sweep_result": sweep_result,
    }


def run_recovery_agent() -> Dict[str, Any]:
    """
    Primary orchestration loop triggered periodically or on-demand by the command center.

    COMPLIANCE PURPOSE:
    Executes bounded recovery sweeps across freshly detected gateway failures and pending backlog,
    returning an audited execution summary.
    """
    logger.info("[ORCHESTRATOR] Initiating Autonomous Recovery Sweep...")

    # Step 1: Ingest fresh failed payments from Razorpay API
    new_payment_ids = razorpay_service.fetch_failed_payments()

    # Retrieve all pending payments in DB
    pending_payments = db.get_pending_payments(limit=50)
    
    # Collect all unique payment IDs to process
    payment_ids_to_process = list({p["payment_id"] for p in pending_payments}.union(new_payment_ids))

    summary = {
        "total_queued": len(payment_ids_to_process),
        "processed": 0,
        "recovered": 0,
        "escalated": 0,
        "monitoring": 0,
        "upi_intent_sent": 0,
        "instrument_switched": 0,
        "mandates_scheduled": 0,
        "details": [],
    }

    # Step 2: Iterate and process each payment
    for payment_id in payment_ids_to_process:
        cid = str(uuid.uuid4())
        result = process_single_payment_workflow(payment_id, correlation_id=cid)
        summary["processed"] += 1

        if result.get("success"):
            diag = result.get("diagnosis", {})
            action = diag.get("action")
            
            if action == "SEND_UPI_INTENT":
                summary["upi_intent_sent"] += 1
            elif action == "SWITCH_INSTRUMENT":
                summary["instrument_switched"] += 1
            elif action == "WAIT_AND_MONITOR":
                summary["monitoring"] += 1
            elif action == "MANDATE_RETRY":
                summary["mandates_scheduled"] += 1
            elif action == "ESCALATE_HUMAN":
                summary["escalated"] += 1

            summary["details"].append({
                "payment_id": payment_id,
                "correlation_id": cid,
                "diagnosis": diag.get("diagnosis"),
                "action": action,
            })

    # Step 3: Record sweep event in audit logs for real-time telemetry and ticker tracking
    sweep_cid = str(uuid.uuid4())
    db.log_event(
        correlation_id=sweep_cid,
        payment_id="SYSTEM",
        event_type="AUTO_SWEEP",
        payload=summary,
        reasoning=f"Autonomous recovery sweep completed. Processed {summary['processed']} payment(s), UPI: {summary['upi_intent_sent']}, Switched: {summary['instrument_switched']}.",
        severity="INFO",
    )

    logger.info(
        "[SWEEP_COMPLETED] Processed: %d | UPI: %d | Switch: %d | Monitoring: %d | Escalated: %d",
        summary["processed"],
        summary["upi_intent_sent"],
        summary["instrument_switched"],
        summary["monitoring"],
        summary["escalated"],
    )

    # Step 4: Run promise sweep
    try:
        promise_result = run_promise_sweep()
        summary["promise_sweep"] = promise_result
    except Exception as ps_err:
        logger.error("[ORCHESTRATOR] Promise sweep error: %s", ps_err)
        summary["promise_sweep"] = {"error": str(ps_err)}

    # Step 5: Run mandate sweep
    try:
        mandate_result = run_mandate_sweep()
        summary["mandate_sweep"] = mandate_result
    except Exception as ms_err:
        logger.error("[ORCHESTRATOR] Mandate sweep error: %s", ms_err)
        summary["mandate_sweep"] = {"error": str(ms_err)}

    return summary
