#!/usr/bin/env python3
"""
scripts/seed_demo.py
Track 3 Demo Seed Script: Generates 10 realistic Kirana transactions with
cryptographically chained SHA-256 audit events across recovery states.

State Distribution:
- 5 RECOVERED (instant UPI intent, 2% discount, Paytm bridge, soundbox, switch instrument)
- 2 PENDING (active promise, live outreach)
- 2 ESCALATED (retry cap stopping rule, policy/risk threshold)
- 1 MONITORING (NPCI quiet hold)
"""

import os
import sys
import uuid
from datetime import datetime, timezone

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import db


def seed_database():
    print("=======================================================")
    print("[SEED] SEEDING DEMO: 10 REALISTIC KIRANA TRANSACTIONS")
    print("=======================================================")

    # 1. Reset demo state to establish Genesis Block #0
    print("[1/3] Establishing clean ledger & Genesis Block #0...")
    reset_res = db.reset_demo_data()
    print(f"      Genesis Block Hash: {reset_res.get('report', {}).get('genesis_hash', '')[:16]}...")

    # 2. Seed 10 Transactions
    print("[2/3] Generating realistic transactions with SHA-256 audit logs...")

    scenarios = [
        {
            "pid": "pay_kirana_001",
            "amt": 285000,
            "code": "qr_fail",
            "desc": "QR scan timed out at Sharma General Store counter",
            "contact": "9876500001",
            "status": "RECOVERED",
            "events": [
                ("DETECTED", "Payment failure captured at Kirana counter.", {"scenario": "qr_fail", "amount": 285000}),
                ("AI_DIAGNOSIS", "AI diagnosed CART_DROP; recommended SEND_UPI_INTENT.", {"diagnosis": "CART_DROP", "action": "SEND_UPI_INTENT"}),
                ("COMPLIANCE_GATE_CHECKED", "Regulatory compliance gate cleared.", {"passed": True, "checks": ["DND_CLEARED", "CONSENT_VERIFIED"]}),
                ("DISCOUNT_APPROVED", "Dynamic 2% margin-protected discount applied.", {"discount_pct": 2, "final_amount": 279300}),
                ("VOICE_SCRIPT_GENERATED", "Hinglish persuasive voice synthesized.", {"voice": "sarvam"}),
                ("MESSAGE_SENT", "Recovery link dispatched via WhatsApp/Voice.", {"channel": "WhatsApp"}),
                ("RECOVERED", "Customer completed payment via dynamic UPI link.", {"recovered_amount": 279300, "source": "razorpay_webhook"}),
            ],
        },
        {
            "pid": "pay_kirana_002",
            "amt": 45000,
            "code": "insufficient_funds",
            "desc": "Customer UPI bank balance insufficient",
            "contact": "9876500002",
            "status": "RECOVERED",
            "events": [
                ("DETECTED", "Debit declined due to low balance.", {"scenario": "insufficient_funds", "amount": 45000}),
                ("AI_DIAGNOSIS", "Diagnosed customer balance drop; recommended retry with secondary instrument.", {"action": "SWITCH_INSTRUMENT"}),
                ("COMPLIANCE_GATE_CHECKED", "Regulatory compliance gate cleared.", {"passed": True}),
                ("MESSAGE_SENT", "Switch-instrument link sent to customer.", {"channel": "SMS"}),
                ("RECOVERED", "Payment completed via RuPay Credit on UPI.", {"source": "razorpay_webhook"}),
            ],
        },
        {
            "pid": "pay_kirana_003",
            "amt": 620000,
            "code": "paytm_dynamic_qr_drop",
            "desc": "Paytm Kirana dynamic QR dropped at checkout (Sharma Kirana)",
            "contact": "9876500003",
            "status": "RECOVERED",
            "events": [
                ("S2S_CALLBACK", "Paytm S2S TXN_FAILURE callback normalized via Bridge.", {"source": "paytm", "adapter": "NORMALIZED"}),
                ("DETECTED", "Payment failure at Sharma Kirana captured via Paytm QR Bridge.", {"adapter": "Paytm Bridge v1.2"}),
                ("COMPLIANCE_GATE_CHECKED", "Regulatory compliance gate cleared.", {"passed": True}),
                ("VOICE_GENERATED", "Indic Hinglish voice reminder dispatched.", {"provider": "Sarvam AI"}),
                ("RECOVERED", "Verified via Paytm S2S TXN_SUCCESS callback.", {"source": "paytm_webhook"}),
            ],
        },
        {
            "pid": "pay_kirana_004",
            "amt": 150000,
            "code": "bank_switch_decline",
            "desc": "Issuer bank declined transaction",
            "contact": "9876500004",
            "status": "RECOVERED",
            "events": [
                ("DETECTED", "Issuer bank declined transaction.", {"amount": 150000}),
                ("AI_DIAGNOSIS", "Diagnosed switch decline.", {"action": "SWITCH_INSTRUMENT"}),
                ("COMPLIANCE_GATE_CHECKED", "Compliance gate passed.", {"passed": True}),
                ("MESSAGE_SENT", "Alternative payment link dispatched.", {"channel": "WhatsApp"}),
                ("RECOVERED", "Customer completed payment successfully.", {"source": "razorpay_webhook"}),
            ],
        },
        {
            "pid": "pay_kirana_005",
            "amt": 98000,
            "code": "session_timeout",
            "desc": "Checkout session timed out",
            "contact": "9876500005",
            "status": "RECOVERED",
            "events": [
                ("DETECTED", "Checkout session timed out.", {"amount": 98000}),
                ("SOUNDBOX_ANNOUNCE", "Whispered alert to merchant soundbox.", {"action": "SOUNDBOX_WHISPER"}),
                ("COMPLIANCE_GATE_CHECKED", "Compliance gate passed.", {"passed": True}),
                ("RECOVERED", "Customer paid via refreshed QR.", {"source": "razorpay_webhook"}),
            ],
        },
        {
            "pid": "pay_kirana_006",
            "amt": 340000,
            "code": "qr_fail",
            "desc": "Customer promised to pay by evening",
            "contact": "9876500006",
            "status": "PENDING",
            "events": [
                ("DETECTED", "QR timeout at checkout.", {"amount": 340000}),
                ("AI_DIAGNOSIS", "Customer requested promise to pay.", {"action": "SCHEDULE_PROMISE"}),
                ("PROMISE_TO_PAY", "Promise recorded with RBI 09:00-21:00 window clamping.", {"promised_at": "19:00 IST", "clamped": False}),
            ],
        },
        {
            "pid": "pay_kirana_007",
            "amt": 1200000,
            "code": "card_network_timeout",
            "desc": "Card network authorization timeout",
            "contact": "9876500007",
            "status": "PENDING",
            "events": [
                ("DETECTED", "Card network authorization timeout.", {"amount": 1200000}),
                ("AI_DIAGNOSIS", "Recovery link generated and awaiting customer tap.", {"action": "SEND_UPI_INTENT"}),
                ("MESSAGE_SENT", "One-click UPI recovery link active.", {"channel": "SMS"}),
            ],
        },
        {
            "pid": "pay_kirana_008",
            "amt": 450000,
            "code": "user_cancelled_repeated",
            "desc": "Customer cancelled checkout 3 times consecutively",
            "contact": "9876500008",
            "status": "ESCALATED",
            "retry_count": 3,
            "events": [
                ("DETECTED", "Repeated failure detected.", {"retry_count": 3}),
                ("STOPPING_RULE_TRIGGERED", "Hard stopping rule enforced: retry cap >= 2 reached. 0 outreach dispatched.", {"rule": "MAX_RETRIES_EXCEEDED"}),
                ("ESCALATE_HUMAN", "Escalated to Kirana manager review. Customer spam prevented.", {"status": "ESCALATED"}),
            ],
        },
        {
            "pid": "pay_kirana_009",
            "amt": 2500000,
            "code": "dnd_opt_out",
            "desc": "Customer registered on National Do Not Call Registry",
            "contact": "9999999999",
            "status": "ESCALATED",
            "events": [
                ("DETECTED", "High-value failure detected.", {"amount": 2500000}),
                ("COMPLIANCE_GATE_CHECKED", "TRAI/TCCCPR Gate: Outbound blocked (National DND Registry match).", {"passed": False, "reason": "DND_REGISTERED"}),
                ("ESCALATE_HUMAN", "Customer outreach blocked by regulatory gate. Escalated to merchant compliance queue.", {"status": "ESCALATED"}),
            ],
        },
        {
            "pid": "pay_kirana_010",
            "amt": 180000,
            "code": "gateway_timeout",
            "desc": "NPCI UPI core banking switch timeout",
            "contact": "9876500010",
            "status": "MONITORING",
            "events": [
                ("DETECTED", "NPCI UPI switch timeout.", {"amount": 180000}),
                ("AI_DIAGNOSIS", "Diagnosed infrastructure outage; customer contact suppressed.", {"action": "WAIT_AND_MONITOR"}),
            ],
        },
    ]

    for item in scenarios:
        pid = item["pid"]
        cid = str(uuid.uuid4())
        retries = item.get("retry_count", 0)

        db.insert_or_ignore_payment(
            payment_id=pid,
            amount=item["amt"],
            currency="INR",
            error_code=item["code"],
            error_description=item["desc"],
            user_contact=item["contact"],
            status=item["status"],
        )

        if retries > 0 or item["status"] != "PENDING":
            with db.get_connection() as conn:
                conn.execute(
                    "UPDATE failed_payments SET status = ?, retry_count = ? WHERE payment_id = ?",
                    (item["status"], retries, pid),
                )
                conn.commit()

        for ev_type, reasoning, payload in item["events"]:
            db.log_event(
                correlation_id=cid,
                payment_id=pid,
                event_type=ev_type,
                payload=payload,
                reasoning=reasoning,
                severity="CRITICAL" if ev_type == "ESCALATE_HUMAN" else ("WARNING" if "GATE" in ev_type and not payload.get("passed") else "INFO"),
            )

    # 3. Verify Ledger
    print("[3/3] Verifying cryptographic SHA-256 hash chain integrity...")
    verify_res = db.verify_audit_hash_chain()
    print(f"      Chain Status: {verify_res['status']}")
    print(f"      Total Blocks Chained: {verify_res['total_blocks']}")
    print(f"      Broken Links: {verify_res['broken_links']}")
    print(f"      Verification: {'VALID (100% GREEN) [PASS]' if verify_res['is_valid'] else 'INVALID [FAIL]'}")

    if not verify_res["is_valid"]:
        raise RuntimeError("Ledger verification failed after seeding!")

    print("\n=======================================================")
    print("[SUCCESS] SEED DEMO COMPLETE: 10 Transactions Ingested & Chained")
    print("=======================================================\n")


if __name__ == "__main__":
    seed_database()
