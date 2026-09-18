# 🤝 n8n Autonomous Workflow Execution Layer

This directory contains production-ready n8n workflows that serve as the **Autonomous Execution Layer** for **Pratyavartan: Your Paytm Merchant's AI Teammate (Digital Employee #AI-001)**.

---

## 🏛 Architecture: FastAPI as Brain, n8n as Execution Layer

- **FastAPI Brain**: Handles AI diagnosis, RBI compliance window clamping, HMAC-SHA256 signature verification, hard stopping rules (`retry_count >= 2`), dynamic discount negotiation, and immutable cryptographic SHA-256 hash-chain audit logging.
- **n8n Execution Layer**: Handles asynchronous, multi-step time waits (Promise-to-Pay delays, Mandate spacing) and triggers verified webhooks back to FastAPI.
- **Fail-Safe Fallback**: If n8n is offline, unreachable, or `N8N_WEBHOOK_URL` is unset, FastAPI logs `N8N_FALLBACK_INTERNAL` and seamlessly switches to the internal Python background scheduler so payment recovery **NEVER stops**.

---

## 📦 Workflows Included

### 1. `promise_to_pay_workflow.json`
- **Trigger**: Dispatched by FastAPI when customer promises to pay (`POST /promise-to-pay`).
- **Flow**:
  1. `Webhook Trigger` from FastAPI
  2. `Wait Node` until `remind_at` timestamp
  3. `HTTP GET` `/api/payment/{id}/status`
  4. `IF Node`: Is payment already `RECOVERED`?
     - **YES** $\to$ `HTTP POST` `/api/log-promise-kept` $\to$ End
     - **NO** $\to$ `HTTP POST` `/api/trigger-voice-reminder` $\to$ `Wait Node` (30 min grace) $\to$ `HTTP GET` `/api/payment/{id}/status`
       - **YES** $\to$ `HTTP POST` `/api/log-promise-kept` $\to$ End
       - **NO** $\to$ `HTTP POST` `/api/escalate-human` $\to$ End

### 2. `mandate_retry_sequencer.json`
- **Trigger**: Dispatched by FastAPI when a recurring mandate or subscription debit fails (`MANDATE_FAIL`).
- **Flow**:
  1. `Webhook Trigger` from FastAPI
  2. `Wait Node`: Tomorrow 10:30 AM IST (`a1_utc`)
  3. `HTTP POST`: `/api/mandates/attempt` (Attempt 1) $\to$ Check Status
     - Recovered $\to$ End
     - Failed $\to$ `Wait Node`: Day-after 10:30 AM IST (`a2_utc`)
  4. `HTTP POST`: `/api/mandates/attempt` (Attempt 2) $\to$ Check Status
     - Recovered $\to$ End
     - Failed $\to$ `Wait Node`: 1st of next month 10:30 AM IST (`a3_utc`)
  5. `HTTP POST`: `/api/mandates/attempt` (Attempt 3) $\to$ Check Status
     - Recovered $\to$ End
     - Failed $\to$ `HTTP POST`: `/api/escalate-human` (Exhausted after 3 attempts) $\to$ End

---

## 🚀 Setup & Deployment

1. **Import Workflows into n8n**:
   - In n8n UI, click **Workflows** > **Import from File**.
   - Select `promise_to_pay_workflow.json` and `mandate_retry_sequencer.json`.
2. **Set Environment Variable in `.env`**:
   ```env
   N8N_WEBHOOK_URL=http://localhost:5678/webhook/promise-to-pay-trigger
   FASTAPI_BASE_URL=http://localhost:8010
   ```
3. **Activate Workflows** in n8n.
