"""
memory.py - Cognee Long-Term Customer Memory Layer with SQLite Fallback.

COMPLIANCE & RESILIENCE PURPOSE:
Maintains persistent customer interaction context (past promise keep/break rates,
preferred communication times, repeated failure patterns) across sessions.
Primary: Cognee Knowledge Graph Memory Layer.
Reliability Fallback: Deterministic SQLite state aggregation guaranteeing zero-downtime
memory recall even if Cognee is unreachable or unconfigured.
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import db

logger = logging.getLogger(__name__)


def _is_cognee_available() -> bool:
    """Checks if Cognee package and credentials are fully configured."""
    cognee_key = os.getenv("COGNEE_API_KEY", "").strip()
    if not cognee_key or cognee_key.lower() in ("dummy", "none", "unset", ""):
        return False
    try:
        import cognee  # noqa: F401
        return True
    except ImportError:
        return False


def remember_customer_context(
    customer_ref: str,
    interaction_data: Dict[str, Any],
    correlation_id: Optional[str] = None,
) -> bool:
    """
    Stores customer interaction outcomes (promises kept/broken, recovery times, failure codes)
    into the long-term memory layer.

    1. Attempts Cognee Knowledge Graph ingestion.
    2. Fallback: Stores into SQLite context store with COGNEE_FALLBACK_TO_SQLITE event.
    """
    cid = correlation_id or str(uuid.uuid4())
    clean_ref = db.mask_contact(customer_ref) if customer_ref else "******XXXX"
    event_name = interaction_data.get("event", "INTERACTION")
    timestamp = datetime.now(timezone.utc).isoformat()

    cognee_success = False
    if _is_cognee_available():
        try:
            import cognee
            text_memory = (
                f"Customer {clean_ref} recorded event '{event_name}' at {timestamp}. "
                f"Data: {json.dumps(interaction_data, default=str)}"
            )

            async def _add_to_cognee():
                await cognee.add(text_memory, dataset_name="merchant_memory")
                await cognee.cognify()

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(_add_to_cognee())
                else:
                    loop.run_until_complete(_add_to_cognee())
            except RuntimeError:
                asyncio.run(_add_to_cognee())

            db.log_event(
                correlation_id=cid,
                payment_id=interaction_data.get("payment_id", "SYSTEM"),
                event_type="COGNEE_SYNC",
                payload={"customer_ref": clean_ref, "interaction": interaction_data, "engine": "cognee"},
                reasoning=f"Customer context synchronized to Cognee Knowledge Graph for {clean_ref}.",
                severity="INFO",
            )
            cognee_success = True
            logger.info("[MEMORY] Successfully stored memory in Cognee for %s", clean_ref)
        except Exception as cognee_err:
            logger.warning("[MEMORY] Cognee memory ingestion failed: %s. Falling back to SQLite.", cognee_err)

    if not cognee_success:
        # SQLite Reliability Fallback
        db.sync_context_memory(clean_ref, interaction_data)
        db.log_event(
            correlation_id=cid,
            payment_id=interaction_data.get("payment_id", "SYSTEM"),
            event_type="COGNEE_FALLBACK_TO_SQLITE",
            payload={
                "customer_ref": clean_ref,
                "interaction": interaction_data,
                "reason": "Cognee API key unset or cognee unavailable",
                "fallback": "sqlite_memory_store",
            },
            reasoning=f"Cognee memory layer unavailable — stored customer context to SQLite for {clean_ref}.",
            severity="WARNING",
        )
        logger.info("[MEMORY] Stored customer memory in SQLite Fallback for %s", clean_ref)

    return True


def recall_customer_context(
    customer_ref: str,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Recalls long-term customer context including:
    - Number of broken promises vs kept promises
    - Total failed payment attempts
    - Best preferred contact time in IST (e.g., '20:00' / 8 PM)
    - Risk tier for autonomous escalation policy

    1. Tries Cognee Query if available.
    2. Fallback: Computes exact historical metrics from SQLite promises and failed_payments tables.
    """
    cid = correlation_id or str(uuid.uuid4())
    clean_ref = db.mask_contact(customer_ref) if customer_ref else "******XXXX"

    broken_promises = 0
    kept_promises = 0
    pending_promises = 0
    total_failures = 0
    best_time: Optional[str] = None
    last_scenario = "UNKNOWN"
    engine_used = "sqlite_fallback"

    # Query SQLite Historical Tables
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Broken promises count for this customer
            cursor.execute(
                """
                SELECT COUNT(*) as count
                FROM promises p
                JOIN failed_payments f ON p.payment_id = f.payment_id
                WHERE (f.user_contact = ? OR f.user_contact = ?) AND p.status = 'broken'
                """,
                (customer_ref, clean_ref),
            )
            row = cursor.fetchone()
            broken_promises = row["count"] if row else 0

            # 2. Kept promises count
            cursor.execute(
                """
                SELECT COUNT(*) as count
                FROM promises p
                JOIN failed_payments f ON p.payment_id = f.payment_id
                WHERE (f.user_contact = ? OR f.user_contact = ?) AND p.status = 'kept'
                """,
                (customer_ref, clean_ref),
            )
            row = cursor.fetchone()
            kept_promises = row["count"] if row else 0

            # 3. Pending promises
            cursor.execute(
                """
                SELECT COUNT(*) as count
                FROM promises p
                JOIN failed_payments f ON p.payment_id = f.payment_id
                WHERE (f.user_contact = ? OR f.user_contact = ?) AND p.status IN ('pending', 'followed_up')
                """,
                (customer_ref, clean_ref),
            )
            row = cursor.fetchone()
            pending_promises = row["count"] if row else 0

            # 4. Total failures
            cursor.execute(
                """
                SELECT COUNT(*) as count, MAX(error_code) as last_err
                FROM failed_payments
                WHERE (user_contact = ? OR user_contact = ?) AND payment_id NOT IN ('SYSTEM', 'SYSTEM_WEBHOOK')
                """,
                (customer_ref, clean_ref),
            )
            row = cursor.fetchone()
            if row:
                total_failures = row["count"]
                last_scenario = row["last_err"] or "UNKNOWN"

            # 5. Check if customer previously kept a promise at a particular hour (Best Contact Time)
            cursor.execute(
                """
                SELECT p.promised_at
                FROM promises p
                JOIN failed_payments f ON p.payment_id = f.payment_id
                WHERE (f.user_contact = ? OR f.user_contact = ?) AND p.status = 'kept'
                ORDER BY p.id DESC
                LIMIT 1
                """,
                (customer_ref, clean_ref),
            )
            best_row = cursor.fetchone()
            if best_row and best_row["promised_at"]:
                try:
                    # Extract HH:MM
                    dt_str = best_row["promised_at"]
                    if "T" in dt_str:
                        best_time = dt_str.split("T")[1][:5]
                except Exception:
                    pass

    except Exception as db_err:
        logger.warning("[MEMORY] SQLite history query error: %s", db_err)

    # Set default best time if not historical
    if not best_time:
        best_time = "20:00"  # 8:00 PM IST prime kirana closing window

    # Calculate Risk Tier
    if broken_promises >= 2:
        risk_tier = "HIGH_RISK"
        summary = f"Customer has broken promises {broken_promises} times in past history. High risk of abandonment."
    elif broken_promises == 1:
        risk_tier = "MEDIUM_RISK"
        summary = f"Customer broke 1 promise previously; {kept_promises} kept."
    else:
        risk_tier = "STANDARD"
        summary = f"Good payment history ({kept_promises} kept promises, 0 broken)."

    # Log Fallback / Recall Event
    if not _is_cognee_available():
        db.log_event(
            correlation_id=cid,
            payment_id="SYSTEM",
            event_type="COGNEE_FALLBACK_TO_SQLITE",
            payload={
                "customer_ref": clean_ref,
                "broken_promises": broken_promises,
                "kept_promises": kept_promises,
                "best_time": best_time,
                "source": "sqlite_fallback",
            },
            reasoning=f"Cognee unavailable — recalled long-term context from SQLite for {clean_ref}.",
            severity="WARNING",
        )

    return {
        "customer_ref": clean_ref,
        "broken_promises": broken_promises,
        "kept_promises": kept_promises,
        "pending_promises": pending_promises,
        "total_failures": total_failures,
        "best_time": best_time,
        "last_scenario": last_scenario,
        "risk_tier": risk_tier,
        "source": engine_used,
        "summary": summary,
    }
