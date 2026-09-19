"""
compliance_gate.py - TRAI / TCCCPR + DPDP Regulatory Compliance Gate.

COMPLIANCE & LEGAL PURPOSE:
Under Telecom Commercial Communications Customer Preference Regulations (TCCCPR, 2018)
and Digital Personal Data Protection (DPDP) Act, 2023, automated customer outreach
(voice, SMS, WhatsApp) without verified consent or to DND-registered subscribers
is illegal and subject to severe penalties.

This module enforces a strict, tamper-evident 3-point compliance check before
ANY outbound communication is dispatched:
1. Consent Verification: Checks customer_consent table (opted_in=1).
2. DND Registry Check: Checks dnd_registry table (is_dnd=0).
3. 24-Hour Frequency Cap: Max 2 outbound contacts per payment per 24 hours (RBI stopping rule).

Every evaluation appends a cryptographically chained COMPLIANCE_GATE_CHECKED audit event.
"""

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import db

logger = logging.getLogger("ComplianceGate")


def normalize_phone(phone: Optional[str]) -> str:
    """Normalizes phone number to standard 10-digit Indian mobile format or suffix."""
    if not phone:
        return "9876543210"
    digits = re.sub(r"\D", "", str(phone))
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    if len(digits) >= 10:
        return digits[-10:]
    return digits if digits else "9876543210"


def check_compliance_gate(
    payment_id: str,
    user_contact: Optional[str] = None,
    correlation_id: Optional[str] = None,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes TRAI / TCCCPR & DPDP regulatory compliance verification.
    
    Returns:
        {"passed": bool, "reason": Optional[str], "phone": str, "payment_id": str}
    """
    cid = correlation_id or f"corr_comp_{payment_id}"
    phone = normalize_phone(user_contact)
    masked = db.mask_contact(phone)

    # 1. Check DND Registry
    if db.is_dnd_registered(phone, db_path=db_path):
        reason = "DND_REGISTERED"
        logger.warning("[COMPLIANCE_GATE] Outbound blocked for %s: Number is registered on DND.", masked)
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="COMPLIANCE_GATE_CHECKED",
            payload={"passed": False, "reason": reason, "phone": masked, "payment_id": payment_id},
            reasoning=f"Outbound blocked by TRAI/TCCCPR compliance gate: {reason} (National Do Not Call Registry match).",
            severity="WARNING",
            db_path=db_path,
        )
        return {"passed": False, "reason": reason, "phone": phone, "payment_id": payment_id}

    # 2. Check Customer Consent
    if not db.has_customer_consent(phone, db_path=db_path):
        reason = "CONSENT_MISSING"
        logger.warning("[COMPLIANCE_GATE] Outbound blocked for %s: Customer has not provided DPDP consent.", masked)
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="COMPLIANCE_GATE_CHECKED",
            payload={"passed": False, "reason": reason, "phone": masked, "payment_id": payment_id},
            reasoning=f"Outbound blocked by TRAI/TCCCPR compliance gate: {reason} (No explicit opt-in recorded under DPDP Act).",
            severity="WARNING",
            db_path=db_path,
        )
        return {"passed": False, "reason": reason, "phone": phone, "payment_id": payment_id}

    # 3. Check 24-Hour Frequency Cap (Max 2 contacts per 24 hours per payment)
    outbound_count = db.get_outbound_contact_count_24h(payment_id, db_path=db_path)
    if outbound_count >= 2:
        reason = "FREQUENCY_CAPPED"
        logger.warning("[COMPLIANCE_GATE] Outbound blocked for %s: Frequency cap reached (%d contacts in 24h).", masked, outbound_count)
        db.log_event(
            correlation_id=cid,
            payment_id=payment_id,
            event_type="COMPLIANCE_GATE_CHECKED",
            payload={"passed": False, "reason": reason, "contact_count_24h": outbound_count, "phone": masked, "payment_id": payment_id},
            reasoning=f"Outbound blocked by TRAI/TCCCPR compliance gate: {reason} (Exceeded maximum 2 contacts per 24 hours).",
            severity="WARNING",
            db_path=db_path,
        )
        return {"passed": False, "reason": reason, "phone": phone, "payment_id": payment_id}

    # ALL CHECKS PASSED
    db.log_event(
        correlation_id=cid,
        payment_id=payment_id,
        event_type="COMPLIANCE_GATE_CHECKED",
        payload={"passed": True, "phone": masked, "payment_id": payment_id, "checks": ["DND_CLEARED", "CONSENT_VERIFIED", "FREQUENCY_WITHIN_LIMITS"]},
        reasoning="Customer consent and DND verification passed per TRAI/TCCCPR and DPDP compliance standards.",
        severity="INFO",
        db_path=db_path,
    )
    return {"passed": True, "reason": None, "phone": phone, "payment_id": payment_id}
