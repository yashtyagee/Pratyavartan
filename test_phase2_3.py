import asyncio
import os
import sys
import uuid
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from main import app
import db
import voice_engine
import memory
import ai_agent


async def run_phase2_3_tests():
    print("=================================================================")
    print("STARTING PHASE 2 & 3 SELF-TEST SUITE: SARVAM & COGNEE RESILIENCE")
    print("=================================================================")
    
    db.init_db()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # TEST 1: Voice Engine & Fallback Verification
        print("\n--- [TEST 1] Voice Engine & Sarvam -> gTTS Fallback ---")
        v_status = voice_engine.get_voice_engine_status()
        print(f"Voice Engine Status: {v_status}")
        assert "primary_engine" in v_status
        assert "fallback_engine" in v_status

        test_pid = f"pay_voice_{uuid.uuid4().hex[:8]}"
        db.insert_or_ignore_payment(test_pid, amount=50000, user_contact="9876543210")

        audio_url = voice_engine.generate_hinglish_voice(
            script="Namaste! Aapka payment recover ho gaya hai. Dhanyawad.",
            payment_id=test_pid,
        )
        print(f"Generated Audio URL: {audio_url}")
        assert audio_url.startswith("/audio/")
        # Verify file exists on disk
        local_audio_path = os.path.join("audio", os.path.basename(audio_url))
        assert os.path.exists(local_audio_path) and os.path.getsize(local_audio_path) > 0, "Audio file was not created or is empty!"
        print(f"[PASS] Audio file verified on disk: {local_audio_path} ({os.path.getsize(local_audio_path)} bytes)")

        # Verify SARVAM_FALLBACK_TO_GTTS event in audit logs if SARVAM_API_KEY is not set
        sarvam_key = os.getenv("SARVAM_API_KEY", "")
        with db.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT event_type, ai_reasoning FROM audit_logs WHERE payment_id=? ORDER BY log_id DESC", (test_pid,))
            events = [dict(r) for r in c.fetchall()]
            event_types = [e["event_type"] for e in events]
            print(f"Audit log event types for {test_pid}: {event_types}")
            assert "VOICE_GENERATED" in event_types
            if not sarvam_key:
                assert "SARVAM_FALLBACK_TO_GTTS" in event_types
                print("[PASS] SARVAM_FALLBACK_TO_GTTS audit event confirmed in ledger")


        # TEST 2: Cognee Memory Layer & SQLite Fallback Verification
        print("\n--- [TEST 2] Cognee Memory Layer & SQLite Fallback ---")
        test_contact = "9876543210"
        memory.remember_customer_context(
            customer_ref=test_contact,
            interaction_data={"event": "PROMISE_BROKEN", "amount": 50000},
        )
        recalled = memory.recall_customer_context(test_contact)
        print(f"Recalled Customer Context: {recalled}")
        assert recalled["customer_ref"] == db.mask_contact(test_contact)
        assert "broken_promises" in recalled
        assert "risk_tier" in recalled
        print("[PASS] Customer Memory context recall verified")

        # TEST 3: AI Brain Memory Guard (Early Escalation on >= 2 Broken Promises)
        print("\n--- [TEST 3] AI Brain Memory Guard (Early Escalation) ---")
        repeat_defaulter_contact = "9111122222"
        # Seed 2 broken promises for this contact
        p1 = f"pay_def_{uuid.uuid4().hex[:6]}"
        p2 = f"pay_def_{uuid.uuid4().hex[:6]}"
        db.insert_or_ignore_payment(p1, amount=50000, user_contact=repeat_defaulter_contact)
        db.insert_or_ignore_payment(p2, amount=50000, user_contact=repeat_defaulter_contact)
        with db.get_connection() as conn:
            conn.execute("INSERT INTO promises (payment_id, promised_at, followup_after, status, created_at) VALUES (?, '2026-01-01T10:00:00Z', '2026-01-01T10:30:00Z', 'broken', '2026-01-01T09:00:00Z')", (p1,))
            conn.execute("INSERT INTO promises (payment_id, promised_at, followup_after, status, created_at) VALUES (?, '2026-01-02T10:00:00Z', '2026-01-02T10:30:00Z', 'broken', '2026-01-02T09:00:00Z')", (p2,))
            conn.commit()

        # Run diagnosis on fresh failure for this customer
        fresh_pid = f"pay_def_fresh_{uuid.uuid4().hex[:6]}"
        db.insert_or_ignore_payment(fresh_pid, amount=50000, user_contact=repeat_defaulter_contact)
        diag = ai_agent.process_failed_payment(fresh_pid)
        print(f"AI Diagnosis result for repeat defaulter: {diag.action} | Scenario: {diag.scenario} | Reason: {diag.reasoning}")
        assert diag.action == "ESCALATE_HUMAN", f"Expected ESCALATE_HUMAN, got {diag.action}"
        assert "Customer Memory Guard" in diag.reasoning or "broken_promises" in diag.reasoning
        print("[PASS] AI Agent successfully escalated early due to injected customer memory guard!")

        # TEST 4: Endpoints Verification
        print("\n--- [TEST 4] REST Endpoints for Memory and Voice Status ---")
        r = await client.get("/api/voice-status")
        assert r.status_code == 200
        print(f"/api/voice-status -> {r.json()}")

        r = await client.get(f"/api/customer-memory/{fresh_pid}")
        assert r.status_code == 200
        mem_json = r.json()
        print(f"/api/customer-memory/{fresh_pid} -> {mem_json}")
        assert mem_json["broken_promises"] >= 2
        assert mem_json["risk_tier"] == "HIGH_RISK"
        print("[PASS] Memory API returned HIGH_RISK profile as expected")

        # TEST 5: SHA-256 Hash Chain Integrity
        print("\n--- [TEST 5] SHA-256 Hash Chain Verification ---")
        r = await client.get("/api/verify-audit-chain")
        assert r.status_code == 200
        chain_res = r.json()
        assert chain_res.get("verified") is True, f"Hash chain verification failed: {chain_res}"
        print(f"[PASS] Audit chain 100% verified across {chain_res['total_records']} records!")

    print("\n=================================================================")
    print("ALL PHASE 2 & 3 TESTS PASSED SUCCESSFULLY! 🚀")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(run_phase2_3_tests())
