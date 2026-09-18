import asyncio
import os
import uuid
import httpx
from main import app
import db

async def run_tests():
    db.init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health
        r = await client.get("/health")
        assert r.status_code == 200, f"Health failed: {r.text}"
        print("[PASS] /health ->", r.json()["status"])

        # 2. Simulate failure
        r = await client.post("/simulate-failure", json={
            "error_code": "checkout_incomplete",
            "error_description": "Customer dropped out during QR checkout",
            "amount": 50000,
            "user_contact": "9876543210"
        })
        assert r.status_code == 200, f"Simulate failure failed: {r.text}"
        pay_data = r.json()
        pid = pay_data["payment_id"]
        cid = pay_data["correlation_id"]
        print(f"[PASS] /simulate-failure -> {pid}")

        # 3. GET /api/payment/{pid}/status
        r = await client.get(f"/api/payment/{pid}/status")
        assert r.status_code == 200, f"Get status failed: {r.text}"
        st = r.json()
        assert st["payment_id"] == pid
        print(f"[PASS] /api/payment/{pid}/status -> {st['status']}")

        # 4. POST /promise-to-pay
        r = await client.post("/promise-to-pay", json={
            "payment_id": pid,
            "minutes_from_now": 10
        })
        assert r.status_code == 201, f"Promise to pay failed: {r.text}"
        promise_data = r.json()
        promise_id = promise_data["id"]
        print(f"[PASS] /promise-to-pay -> Promise ID {promise_id}")

        # 5. POST /api/trigger-voice-reminder
        r = await client.post("/api/trigger-voice-reminder", json={
            "payment_id": pid,
            "promise_id": promise_id,
            "script": "Bhaiya, reminder test."
        })
        assert r.status_code == 200, f"Trigger voice reminder failed: {r.text}"
        print("[PASS] /api/trigger-voice-reminder")

        # 6. POST /api/log-promise-kept
        r = await client.post("/api/log-promise-kept", json={
            "payment_id": pid,
            "promise_id": promise_id
        })
        assert r.status_code == 200, f"Log promise kept failed: {r.text}"
        print("[PASS] /api/log-promise-kept")

        # 7. POST /api/mandates/attempt
        r = await client.post("/api/mandates/attempt", json={
            "payment_id": pid,
            "attempt_no": 1
        })
        assert r.status_code == 200, f"Mandates attempt failed: {r.text}"
        print("[PASS] /api/mandates/attempt")

        # 8. POST /api/escalate-human
        r = await client.post("/api/escalate-human", json={
            "payment_id": pid,
            "reason": "Test escalation for compliance verification"
        })
        assert r.status_code == 200, f"Escalate human failed: {r.text}"
        print("[PASS] /api/escalate-human")

        # 9. Test Mandate Failure Simulation
        r = await client.post("/simulate-mandate-failure")
        assert r.status_code == 200, f"Simulate mandate failure failed: {r.text}"
        mnd_data = r.json()
        mnd_pid = mnd_data["payment_id"]
        print(f"[PASS] /simulate-mandate-failure -> {mnd_pid}")

        # 10. Verify Audit Hash Chain
        r = await client.get("/api/verify-audit-chain")
        assert r.status_code == 200, f"Audit chain verification failed: {r.text}"
        chain_res = r.json()
        assert chain_res.get("verified") is True, f"Audit chain broke: {chain_res}"
        print(f"[PASS] Audit Chain Cryptographically Verified: {chain_res['total_records']} records (100% Valid)")

if __name__ == "__main__":
    asyncio.run(run_tests())
