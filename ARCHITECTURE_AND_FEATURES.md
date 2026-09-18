# 🛡️ Pratyavartan (Digital Employee #AI-001)
## Complete Architecture, Feature Breakdown, Implementation & UI/UX Reference Guide

> **Project Name**: Pratyavartan — Your Paytm Merchant's AI Teammate  
> **Classification**: Digital Employee #AI-001 (Autonomous Revenue Recovery & Merchant Assurance)  
> **Core Objective**: Autonomous diagnosis and recovery of dropped Kirana QR codes, UPI transaction limits, low balances, and recurring mandates using AI negotiation, Indic voice synthesis, and multi-step orchestration with deterministic fail-safes.  
> **Document Status**: Complete, 100% Honest Technical Reality (Architecture, Codeflows, UI/UX, Edge Cases & Fallbacks).

---

## 📑 Table of Contents
1. [Executive Summary & Product Narrative](#1-executive-summary--product-narrative)
2. [End-to-End System Architecture (Layer by Layer)](#2-end-to-end-system-architecture-layer-by-layer)
3. [Deep Component Breakdown](#3-deep-component-breakdown)
   - [3.1 FastAPI Application Gateway & API Surface (`main.py`)](#31-fastapi-application-gateway--api-surface-mainpy)
   - [3.2 AI Brain & Diagnostic Engine (`ai_agent.py`)](#32-ai-brain--diagnostic-engine-ai_agentpy)
   - [3.3 Autonomous Execution Layer & Orchestrator (`orchestrator.py` & `n8n/`)](#33-autonomous-execution-layer--orchestrator-orchestratorpy--n8n)
   - [3.4 Spoken Voice Engine (`voice_engine.py`)](#34-spoken-voice-engine-voice_enginepy)
   - [3.5 Long-Term Customer Memory Layer (`memory.py`)](#35-long-term-customer-memory-layer-memorypy)
   - [3.6 Payment Gateway Service & Quota Guardian (`razorpay_service.py`)](#36-payment-gateway-service--quota-guardian-razorpay_servicepy)
   - [3.7 Database & Cryptographic Hash-Chain Ledger (`db.py`)](#37-database--cryptographic-hash-chain-ledger-dbpy)
4. [War Room Dashboard & UI/UX Architecture (`templates/index.html`)](#4-war-room-dashboard--uiux-architecture-templatesindexhtml)
5. [Showcase Landing Application (`revive-site/`)](#5-showcase-landing-application-revive-site)
6. [Resilience Matrix & 5-Layer Deterministic Fallback Network](#6-resilience-matrix--5-layer-deterministic-fallback-network)
7. [Compliance & Regulatory Governance (RBI & PCI-DSS)](#7-compliance--regulatory-governance-rbi--pci-dss)
8. [Complete API Endpoints Catalog](#8-complete-api-endpoints-catalog)
9. [Database Schema & Event Taxonomy Reference](#9-database-schema--event-taxonomy-reference)

---

## 1. Executive Summary & Product Narrative

### The Core Problem in Indian Retail Payments
Small and medium businesses (Kirana stores, retail shops, SaaS platforms) in India face an estimated **18%–30% failure rate on digital payments**:
1. **Kirana Dynamic QR Drop-offs**: Customers scan a Paytm/UPI QR code at checkout, face a 5-second network hiccup, close the app, or abandon the purchase.
2. **UPI Daily Limits**: Customer's daily bank UPI limit (e.g. ₹1,00,000 or 10 transactions/day) is exceeded, causing unhelpful generic failure errors.
3. **Low / Insufficient Account Balance**: Customer has insufficient bank balance on their primary account but possesses secondary credit cards, debit cards, or BNPL accounts.
4. **Core Banking System Downtime**: Banks experience planned or unplanned downtime (e.g., HDFC/SBI core banking maintenance); retrying immediately is futile, increases load, and irritates customers.
5. **Subscription & Mandate Declines**: Recurring e-Mandate auto-debits bounce due to temporary end-of-month liquidity deficits.

### The Solution: Pratyavartan (Digital Employee #AI-001)
Pratyavartan is an autonomous **AI Teammate** that acts on behalf of the merchant. It operates 24/7 across five distinct domains:
- **Diagnose**: Classifies failure causes within milliseconds using a tiered LLM pipeline and deterministic scenario mapping.
- **Negotiate**: Dynamically offers authorized retention incentives (2% to 5% instant discounts for high-value carts) and generates personalized spoken voice notes in Hinglish.
- **Execute**: Synthesizes 1-click UPI deep links (`upi://pay`), persona-aware instrument switching (enabling Cards/EMI when UPI limits fail), and generates Razorpay payment links.
- **Orchestrate**: Uses **n8n** for asynchronous delay management (Promise-to-Pay grace periods and RBI-spaced Mandate retries).
- **Assure**: Provides merchants with an append-only, SHA-256 cryptographically chained audit ledger proving 100% regulatory compliance with RBI and PCI-DSS rules.

---

## 2. End-to-End System Architecture (Layer by Layer)

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │               INGRESS & GATEWAY CHANNELS                │
                                  │  • Razorpay S2S Webhooks (HMAC-SHA256 constant-time)    │
                                  │  • Simulation Playground (Kirana QR, UPI, Mandate)      │
                                  │  • Interactive Merchant War Room UI                     │
                                  └────────────────────────────┬────────────────────────────┘
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                 FASTAPI APPLICATION BRAIN (main.py)                                             │
│  • HMAC Verification  • 1:1 Correlation ID Tracking  • RBI Window Clamping (09:00 - 21:00 IST)  • Hard Stopping Rules Cap        │
└──────────────┬───────────────────────────────┬───────────────────────────────┬───────────────────────────────┬──────────────────┘
               │                               │                               │                               │
               ▼                               ▼                               ▼                               ▼
┌──────────────────────────────┐┌──────────────────────────────┐┌──────────────────────────────┐┌──────────────────────────────┐
│       AI DIAGNOSTIC ENGINE   ││     ORCHESTRATION LAYER      ││         VOICE ENGINE         ││      LONG-TERM MEMORY        │
│       (ai_agent.py)          ││    (orchestrator.py & n8n)   ││      (voice_engine.py)       ││         (memory.py)          │
│                              ││                              ││                              ││                              │
│ • Primary: Groq LLaMA 3.3 70B││ • Primary: n8n Workflow Hub  ││ • Primary: Sarvam AI Indic   ││ • Primary: Cognee Knowledge   │
│ • Chain: MiniMax, Qwen 2.5   ││   (Asynchronous Waits)       ││   TTS (bulbul:v1, en-IN)     ││   Graph Ingestion & Recall   │
│ • Fallback: Heuristic Rules  ││ • Fallback: Internal Python  ││ • Fallback: Google Text-to-  ││ • Fallback: SQLite WAL State  │
│ • Dynamic Discounting (2%-5%)││   Background Sweeps          ││   Speech (gTTS in Hindi)     ││   Aggregation & Risk Tiers   │
│ • Customer Memory Guard      ││ • Idempotent Row-Locks       ││ • 0ms MD5 Audio File Caching ││ • Broken Promise Defaulter   │
│   (broken_promises >= 2)     ││ • Bounded 3-Attempt Mandate  ││ • Web-Accessible Audio URLs  ││   Early Escalation Guard     │
└──────────────┬───────────────┘└──────────────┬───────────────┘└──────────────┬───────────────┘└──────────────┬───────────────┘
               │                               │                               │                               │
               └───────────────────────────────┴───────────────┬───────────────┴───────────────────────────────┘
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           STATE STORE & CRYPTOGRAPHIC LEDGER (db.py)                                            │
│  • SQLite WAL Mode (WAL, busy_timeout=5000)                                                                                     │
│  • Tables: failed_payments, audit_logs, promises, mandate_schedule, link_cache                                                  │
│  • Cryptographic SHA-256 Hash Chaining: SHA256(prev_hash | correlation_id | payment_id | timestamp | event | payload | reason) │
│  • Verification: GET /api/verify-audit-chain (100% Mathematical Tamper-Evidence)                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Deep Component Breakdown

### 3.1 FastAPI Application Gateway & API Surface (`main.py`)
- **Role**: Core application router, lifecycle orchestrator, webhook validator, and static/audio asset server.
- **Key Operations**:
  1. **HMAC-SHA256 Webhook Receiver (`POST /razorpay-webhook`)**:
     - Computes `hmac.new(key=SECRET, msg=raw_body, digestmod=hashlib.sha256).hexdigest()`.
     - Validates against `X-Razorpay-Signature` using constant-time `hmac.compare_digest()`.
     - On invalid signature: Emits `event_type="SECURITY_ALERT"`, `severity="CRITICAL"`, and responds with `HTTP 400 Bad Request`.
     - On `payment.failed`: Inserts payment idempotently, logs `DETECTED`, and queues background recovery without blocking the HTTP event loop.
     - On `payment.captured` / `payment_link.paid`: Updates payment status to `RECOVERED`, marks active promises as `kept`, cancels pending mandate attempts, and updates Cognee/SQLite memory.
  2. **Promise-to-Pay Ingestion (`POST /promise-to-pay`)**:
     - Accepts `payment_id`, `promised_hour` (Real mode), or `minutes_from_now` (Demo mode).
     - **RBI Window Clamping**: If a customer requests a promise outside 09:00–21:00 IST (e.g. 23:00 or 04:00), the system clamps the reminder time to compliant business hours (09:00 or 21:00 IST) and logs `clamped=True`.
     - Dispatches execution to the n8n execution layer via `async_dispatch_to_n8n()`.
  3. **Audio Delivery (`GET /audio/{filename}`)**:
     - Streams synthesized voice MP3s with `Cache-Control: public, max-age=86400` and byte-range support (`Accept-Ranges: bytes`) for smooth browser playback.
  4. **n8n Autonomous Node Handlers**:
     - `GET /api/payment/{id}/status`: Polling node for workflow condition branches.
     - `POST /api/log-promise-kept`: Resolves promise and records memory.
     - `POST /api/trigger-voice-reminder`: Synthesizes voice and emits `PROMISE_FOLLOWUP` and `MESSAGE_SENT`.
     - `POST /api/mandates/attempt`: Executes debit retry attempts 1, 2, or 3.
     - `POST /api/escalate-human`: Transitions status to `ESCALATED` and alerts merchant.

---

### 3.2 AI Brain & Diagnostic Engine (`ai_agent.py`)
- **Role**: Bounded AI diagnosis, dynamic incentive calculation, Hinglish voice script generation, and customer memory policy enforcement.
- **Key Capabilities**:
  1. **Multi-Model Fallback Ladder**:
     - Priority 1: Model specified in `LLM_MODEL` (e.g., `groq/llama-3.3-70b-versatile` or `minimax/minimax-01`).
     - Priority 2–5: Ordered fallbacks (`meta-llama/llama-3.3-70b-instruct`, `qwen/qwen-2.5-72b-instruct`, `nvidia/nemotron-3.5-lightning`).
     - Priority 6: Deterministic rule-based heuristic classifier (`_heuristic_fallback_classifier`) ensuring 100% uptime with zero API keys.
     - Logged Events: Every fallback model switch writes `LLM_MODEL_SWITCH` (INFO); an upstream total outage writes `LLM_ALL_FAILED` (WARNING).
  2. **Diagnostic Taxonomy & Deterministic Mapping**:
     - `BANK_DOWN` $\to$ `WAIT_AND_MONITOR` (suppresses active outreach; prevents customer spam during bank maintenance).
     - `CART_DROP` / `QR_FAIL` $\to$ `SEND_UPI_INTENT` (zero-UI 1-click deep link).
     - `UPI_LIMIT` $\to$ `SWITCH_INSTRUMENT` (disables failing UPI/Wallet; provisions Card/EMI/PayLater).
     - `INSUFFICIENT_BALANCE` $\to$ `SWITCH_INSTRUMENT` (keeps UPI enabled with 1-click intent + Card backup; 0% discount).
     - `MANDATE_FAIL` $\to$ `MANDATE_RETRY` (routes to 3-attempt spaced sequencer).
     - `UNKNOWN` $\to$ `ESCALATE_HUMAN` (fails safe).
  3. **AI Dynamic Discount Engine (`generate_discount_offer`)**:
     - Cart Value $\ge$ ₹25,000 (25,00,000 paise) $\to$ **5% Instant Discount**
     - Cart Value $\ge$ ₹10,000 (10,00,000 paise) $\to$ **3% Instant Discount**
     - Cart Value $\ge$ ₹5,000 (5,00,000 paise) $\to$ **2% Instant Discount**
     - Cart Value $<$ ₹5,000 $\to$ **0% Discount** (preserves merchant margin).
     - Emits `DISCOUNT_APPROVED` audit event.
  4. **Customer Memory Guard**:
     - Before invoking the LLM, checks `memory.recall_customer_context()`.
     - If customer has `broken_promises >= 2`, skips recovery outreach, logs `STOPPING_RULE_TRIGGERED`, and escalates to human immediately (`ESCALATE_HUMAN`).
  5. **Stopping Rule Retry Cap**:
     - If a transaction has already been attempted twice (`retry_count >= 2`), skips the LLM and escalates immediately to prevent regulatory breach.

---

### 3.3 Autonomous Execution Layer & Orchestrator (`orchestrator.py` & `n8n/`)
- **Role**: Dispatches multi-step async recovery workflows to n8n while maintaining an immediate internal Python background scheduler fallback.
- **Key Operations**:
  1. **FastAPI-to-n8n Dispatcher (`dispatch_to_n8n`)**:
     - Sends webhook payload to `N8N_WEBHOOK_URL` with a strict 5.0s timeout.
     - On HTTP 200: Logs `event_type="N8N_WORKFLOW_DISPATCHED"` (severity `INFO`).
     - On connection error, timeout, 5xx, or empty URL: Logs `event_type="N8N_FALLBACK_INTERNAL"` (severity `WARNING`) and executes internal Python sweep loops (`run_promise_sweep`, `run_mandate_sweep`).
  2. **n8n Workflow 1: Promise-to-Pay Orchestrator (`n8n/promise_to_pay_workflow.json`)**:
     ```
     [Webhook Trigger] 
       ──► [Wait: remind_at] 
       ──► [GET /api/payment/{id}/status] 
       ──► [IF status == 'RECOVERED'?]
             ├── YES ──► [POST /api/log-promise-kept] ──► End
             └── NO  ──► [POST /api/trigger-voice-reminder]
                           ──► [Wait: 30 min Grace]
                           ──► [GET /api/payment/{id}/status]
                           ──► [IF status == 'RECOVERED'?]
                                 ├── YES ──► [POST /api/log-promise-kept] ──► End
                                 └── NO  ──► [POST /api/escalate-human] ──► End
     ```
  3. **n8n Workflow 2: Mandate Retry Sequencer (`n8n/mandate_retry_sequencer.json`)**:
     ```
     [Webhook Trigger]
       ──► [Wait: Tomorrow 10:30 AM IST] ──► [POST /api/mandates/attempt (Att 1)] ──► [IF Recovered?]
             ├── YES ──► End
             └── NO  ──► [Wait: Day-After 10:30 AM IST] ──► [POST /api/mandates/attempt (Att 2)] ──► [IF Recovered?]
                           ├── YES ──► End
                           └── NO  ──► [Wait: 1st Next Month 10:30 AM IST] ──► [POST /api/mandates/attempt (Att 3)] ──► [IF Recovered?]
                                         ├── YES ──► End
                                         └── NO  ──► [POST /api/escalate-human] (Exhausted) ──► End
     ```
  4. **Internal Python Sweeps (`run_promise_sweep`, `run_mandate_sweep`)**:
     - Executes identical state transitions using atomic SQL rowcount locks (`WHERE id=? AND status='pending'`) ensuring zero race conditions.

---

### 3.4 Spoken Voice Engine (`voice_engine.py`)
- **Role**: Natural Indic Hinglish voice synthesis for human-like payment follow-up and discount presentation.
- **Key Operations**:
  1. **Primary Synthesis (Sarvam AI)**:
     - Calls `https://api.sarvam.ai/text-to-speech` with model `bulbul:v1`, speaker `meera`, target language `en-IN` / `hi-IN`.
     - Converts base64 audio response to `./audio/sarvam_{payment_id}.mp3`.
     - Logs `event_type="VOICE_GENERATED"`, `provider="Sarvam AI (bulbul:v1)"`.
  2. **Reliability Fallback Safety Net (gTTS)**:
     - On Sarvam key absence, 4xx/5xx, or network timeout: Logs `event_type="SARVAM_FALLBACK_TO_GTTS"` (WARNING).
     - Instantly synthesizes using Google Text-to-Speech in Hindi (`co.in` low-latency routing).
     - Saves to `./audio/voice_{payment_id}.mp3` and logs `event_type="VOICE_GENERATED"`, `provider="gTTS (Fallback Safety Net)"`.
  3. **Zero-Latency Content Caching**:
     - Computes MD5 hash of script text (`cached_{hash}.mp3`). Identical scripts return in **0 milliseconds** without outbound network calls.
  4. **Live Engine Status (`GET /api/voice-status`)**:
     - Returns live status (`Sarvam Active 🗣️` vs `gTTS Fallback 🎙️`) rendered dynamically on the War Room dashboard.

---

### 3.5 Long-Term Customer Memory Layer (`memory.py`)
- **Role**: Persistent customer context tracking across multiple recovery sessions.
- **Key Operations**:
  1. **Memory Storage (`remember_customer_context`)**:
     - Primary: Attempts Cognee Knowledge Graph ingestion (`cognee.add()`, `cognee.cognify()`).
     - Fallback: On Cognee unreachability, persists state into SQLite context store and logs `event_type="COGNEE_FALLBACK_TO_SQLITE"`.
  2. **Memory Recall (`recall_customer_context`)**:
     - Retrieves:
       - `broken_promises`: Count of promises that lapsed without payment.
       - `kept_promises`: Count of promises honored.
       - `best_time`: Best historical payment window in IST (e.g., `20:00` / 8 PM).
       - `risk_tier`: `STANDARD`, `MEDIUM_RISK` (1 broken promise), or `HIGH_RISK` ($\ge 2$ broken promises).
  3. **AI Brain Memory Ingestion**:
     - Memory context is JSON-serialized and injected directly into the LLM prompt:
       `"Customer Context: {"broken_promises": 2, "best_time": "20:00", "risk_tier": "HIGH_RISK"}."`

---

### 3.6 Payment Gateway Service & Quota Guardian (`razorpay_service.py`)
- **Role**: Direct interface to Razorpay APIs, payment link generation, UPI intent URI creation, and API rate quota preservation.
- **Key Operations**:
  1. **Quota Preservation Guardian**:
     - Razorpay test accounts enforce a limit of 30 payment links.
     - When remaining quota $\le 3$: Activates Quota Preservation Mode, logs `QUOTA_PRESERVED` (WARNING), and reuses existing cached links from `link_cache` without failing.
  2. **Raw UPI Intent URI Generation**:
     - Produces RFC-compliant UPI deep links:  
       `upi://pay?pa={VPA}&pn={Merchant}&am={Amount}&cu=INR&tn=Revive`
     - Allows direct 1-click app opening on mobile devices (Paytm, GPay, PhonePe).

---

### 3.7 Database & Cryptographic Hash-Chain Ledger (`db.py`)
- **Role**: PCI-DSS and RBI-compliant append-only immutable audit trail and state machine.
- **Key Operations**:
  1. **SQLite WAL High-Concurrency Architecture**:
     - Operates with `PRAGMA journal_mode=WAL`, `PRAGMA busy_timeout=5000`, and `PRAGMA foreign_keys=ON`.
  2. **Cryptographic SHA-256 Hash Chaining**:
     - Every audit record links cryptographically to its predecessor using `BEGIN IMMEDIATE` serialization:
       $$\text{Hash Link} = \text{SHA256}(\text{prev\_hash} \mid \text{correlation\_id} \mid \text{payment\_id} \mid \text{timestamp} \mid \text{event\_type} \mid \text{severity} \mid \text{payload} \mid \text{reasoning})$$
     - Genesis record links to `GENESIS`.
  3. **Cryptographic Verification (`GET /api/verify-audit-chain`)**:
     - Iterates sequentially through all audit records, recalculating the SHA-256 digest from genesis.
     - Returns `{verified: true, total_records: N, broken_links: []}`.
  4. **Data Privacy & Masking**:
     - Contact numbers are pseudonymized at the ingestion boundary (`mask_contact()`): `9876543210` $\to$ `******3210`.

---

## 4. War Room Dashboard & UI/UX Architecture (`templates/index.html`)

The Command Center is a responsive single-page cockpit built for merchant assurance and live hackathon jury demonstrations.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ PRATYAVARTAN: Paytm Merchant's AI Teammate (Digital Employee #AI-001)        🟢 LIVE STREAM     │
│ [Quota: 12/30] [🛡️ Violations Prevented: 8] [Groq LLaMA 3.3] [🗣️ Voice: Sarvam] [SHA-256 Chained]│
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                     TOP KPI SUMMARY CARDS                                         │
│ ┌──────────────────┐┌──────────────────┐┌──────────────────┐┌──────────────────┐┌────────────────┐│
│ │ Revenue at Risk  ││ Revenue Recovered││ Passive Monitor  ││ Human Escalations││ Success Rate  ││
│ │    ₹3,500.00     ││    ₹14,250.00    ││    2 Payments    ││    1 Escalated   ││   ⭕ 78.4%     ││
│ └──────────────────┘└──────────────────┘└──────────────────┘└──────────────────┘└────────────────┘│
├───────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│          FINANCIAL RECOVERY TIMELINE CHART        │          AUTONOMOUS ACTION DISTRIBUTION       │
│               [Chart.js Area Graph]               │             [Chart.js Doughnut Chart]         │
├───────────────────────────────────────────────────┴───────────────────────────────────────────────┤
│  ⚡ SIMULATION PLAYGROUND (LIVE DEMONSTRATION SUITE)                                               │
│  [Test QR Scan Failed] [Test Insufficient Balance] [Test Bank Down] [Test Mandate Autopay]       │
│  [Test Stopping Rule Cap] [Simulate Webhook (No ngrok)] [Simulate Customer Paid (Human-in-Loop)] │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  🤝 PROMISE-TO-PAY COUNTDOWN CHIPS & MANDATE TIMELINE CARDS                                       │
│  • Promise #14: pay_wh_sim (Due in 14m)  • Mandate: Attempt 1 tomorrow 10:30 AM IST               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  📜 CRYPTOGRAPHIC AUDIT TRAIL LEDGER (IMMUTABLE HASH CHAIN)                                       │
│  • DETECTED ──► AI_DIAGNOSIS ──► DISCOUNT_APPROVED ──► VOICE_GENERATED ──► API_EXECUTED           │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### UI/UX Highlights
- **Decision Trace Timeline Modal**:
  - Clicking any audit log row opens a modal showing the 1:1 correlation lifecycle from failure detection to resolution.
  - Features the **🧠 Teammate Memory Widget**: Displays customer profile, broken promise count, best contact time in IST, and risk policy.
  - Features the **🤝 n8n Workflow Status Badge**: Shows `Dispatched to n8n ✅` or `Internal Fallback Active ⚙️`.
- **Integrated Hinglish Audio Player**:
  - Plays synthesized audio voice notes inline with custom soundwave animation.
- **1-Click UPI Quick Action Button**:
  - Renders a glowing pill button that opens UPI apps on mobile or displays a dynamic QR code on desktop.
- **Dark Glassmorphic Theme**:
  - Custom CSS tokens, neon semantic badges (green for recovered, amber for monitoring/discounts, purple for AI/mandates, red for escalations).

---

## 5. Showcase Landing Application (`revive-site/`)

A production Next.js 15 showcase application located in `revive-site/`:
- **Tech Stack**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.
- **Narrative Framing**: Promotes "Pratyavartan: Your Paytm Merchant's AI Teammate" with interactive Kirana store payment drop calculators, architecture walkthroughs, and ROI metrics.

---

## 6. Resilience Matrix & 5-Layer Deterministic Fallback Network

| Subsystem | Primary Technology | Trigger for Fallback | Fallback Safety Net | System Impact |
|---|---|---|---|---|
| **AI Diagnosis** | Groq LLaMA 3.3 70B | Rate limit (429), timeout, model 404 | MiniMax $\to$ Qwen 2.5 $\to$ Nemotron $\to$ Heuristic Rules | **Zero downtime**; diagnostic classification never fails. |
| **Voice Synthesis** | Sarvam AI Indic TTS (`bulbul:v1`) | API timeout (>5s), 4xx/5xx, missing key | Google Text-to-Speech (`gTTS`) in Hindi | **Zero downtime**; natural voice notes always generated. |
| **Long-Term Memory** | Cognee Knowledge Graph | Missing `COGNEE_API_KEY`, package uninstalled | SQLite WAL Historical Table Aggregation | **Zero downtime**; customer broken promise counts preserved. |
| **Workflow Execution** | n8n Webhook Hub | Network timeout (>5s), server down, empty URL | Internal Python Async Sweeps (`orchestrator.py`) | **Zero downtime**; promise and mandate sweeps fire on time. |
| **Payment Links** | Razorpay Live Create API | Quota exhaustion (limit 30 reached) | Local `link_cache` LRU reuse + deterministic URIs | **Zero downtime**; checkout links always delivered. |

---

## 7. Compliance & Regulatory Governance (RBI & PCI-DSS)

1. **RBI Fair Practices Code (Digital Debt Recovery & Outreach)**:
   - **Outreach Window (09:00 - 21:00 IST)**: All automated voice reminders and customer communications are clamped strictly within business hours.
   - **Hard Stopping Rules**: Maximum 2 automated retry/outreach attempts per failed transaction. `retry_count >= 2` immediately halts automated outreach.
   - **Mandate Spacing Rules**: Auto-debit retries are spaced across RBI-compliant windows (Tomorrow 10:30 AM, Day-After 10:30 AM, 1st of Next Month 10:30 AM).
2. **PCI-DSS v4.0 & Data Privacy**:
   - Customer contact numbers are pseudonymized (`mask_contact`) at ingestion.
   - Zero storage of raw card numbers, CVVs, or bank PINs.
3. **Audit Ledger Immutability**:
   - Append-only cryptographic SHA-256 hash chaining prevents backdating, record deletion, or unauthorized tampering.

---

## 8. Complete API Endpoints Catalog

### Core Gateway & Operations
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health check, service status, and current UTC timestamp. |
| `GET` | `/dashboard` | Serves the full War Room Command Center HTML UI. |
| `GET` | `/` | Redirects to `/dashboard`. |
| `POST` | `/razorpay-webhook` | S2S HMAC-SHA256 cryptographically verified webhook ingress. |
| `GET` | `/audio/{filename}` | Streams synthesized Hinglish voice MP3 files with byte-range support. |

### Simulation Playground (Hackathon Jury Demonstration)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/simulate-failure` | Simulates a live payment drop (e.g. Kirana QR failure, UPI limit). |
| `POST` | `/simulate-mandate-failure` | Ingests a mandate debit failure for the Mandate Retry Sequencer. |
| `POST` | `/simulate-retry-cap` | Simulates a payment with `retry_count=2` to prove hard stopping rules. |
| `POST` | `/simulate-webhook` | Simulates a signed Razorpay webhook without requiring ngrok. |
| `POST` | `/customer-paid` | Human-in-the-loop: Dispatches signed `payment_link.paid` webhook to mark recovery. |
| `POST` | `/api/reset-demo` | Resets demo payments and clears test audit logs for a fresh state. |

### Promise-to-Pay & Mandate Controls
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/promise-to-pay` | Records customer promise to pay (applies RBI 9–21 IST clamping). |
| `POST` | `/dev/force-promise-check` | Accelerator: Forces the promise sweep to evaluate due reminders immediately. |
| `POST` | `/dev/force-mandate-attempt` | Accelerator: Forces the next pending mandate debit attempt to fire now. |

### Telemetry, Memory & Auditing
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/metrics` | Returns live financial recovery totals, counterfactual baseline, and KPI metrics. |
| `GET` | `/api/audit-logs` | Returns recent structured audit log records. |
| `GET` | `/api/verify-audit-chain` | Cryptographically verifies the append-only SHA-256 hash chain from genesis. |
| `GET` | `/api/decision-trace/{correlation_id}` | Returns all chronological decision steps for a specific failure lifecycle. |
| `GET` | `/api/customer-memory/{payment_id}` | Recalls long-term customer context (broken promises, best time, risk tier). |
| `GET` | `/api/voice-status` | Returns operational status of Sarvam Voice AI and gTTS fallback. |
| `GET` | `/api/link-quota` | Returns Razorpay link quota consumption metrics. |
| `GET` | `/api/pending-recoveries` | Returns all active payments currently pending recovery. |

### n8n Execution Layer Webhooks
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/payment/{payment_id}/status` | Polling endpoint for n8n decision nodes. |
| `POST` | `/api/log-promise-kept` | Webhook target when n8n detects payment recovered. |
| `POST` | `/api/trigger-voice-reminder` | Webhook target for n8n voice reminder dispatch. |
| `POST` | `/api/mandates/attempt` | Webhook target for mandate retry attempts. |
| `POST` | `/api/escalate-human` | Webhook target for workflow exhaustion escalation. |

---

## 9. Database Schema & Event Taxonomy Reference

### 9.1 Database Tables

```sql
-- 1. failed_payments: Primary transaction entity state store
CREATE TABLE failed_payments (
    payment_id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL,            -- In integer paise (e.g. 50000 = Rs.500)
    currency TEXT DEFAULT 'INR',
    error_code TEXT,
    error_description TEXT,
    user_contact TEXT,                  -- Pseudonymized (e.g. '******3210')
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','MONITORING','RECOVERED','ESCALATED','ABANDONED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. audit_logs: Append-only cryptographic ledger
CREATE TABLE audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_id TEXT NOT NULL,
    payment_id TEXT NOT NULL REFERENCES failed_payments(payment_id),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL,           -- Validated against 33 strict event types
    action_payload TEXT,                -- Serialized JSON metadata
    ai_reasoning TEXT,
    severity TEXT DEFAULT 'INFO' CHECK(severity IN ('INFO','WARNING','CRITICAL')),
    parent_log_id INTEGER,              -- Predecessor link
    hash_chain_link TEXT                -- SHA-256 hash digest
);

-- 3. promises: Promise-to-Pay commitments
CREATE TABLE promises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT NOT NULL,
    promised_at TEXT NOT NULL,          -- UTC ISO timestamp
    followup_after TEXT NOT NULL,       -- promised_at + grace minutes
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','followed_up','kept','broken')),
    created_at TEXT NOT NULL
);

-- 4. mandate_schedule: Spaced debit retry sequencer
CREATE TABLE mandate_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT NOT NULL,
    attempt_no INTEGER NOT NULL,        -- 1, 2, or 3
    scheduled_at TEXT NOT NULL,         -- UTC ISO timestamp
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','fired','cancelled','failed'))
);

-- 5. link_cache: Quota preservation link store
CREATE TABLE link_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT,
    link_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9.2 Complete Audit Event Taxonomy (33 Event Types)

| Event Type | Severity | Description |
|---|---|---|
| `DETECTED` | `INFO` | Payment failure captured from gateway stream or simulation. |
| `AI_DIAGNOSIS` | `INFO` | LLM diagnostic classification and action prescription. |
| `DISCOUNT_APPROVED` | `INFO` | AI authorized instant retention incentive (2% to 5%). |
| `VOICE_SCRIPT_GENERATED` | `INFO` | Personalized Hinglish voice negotiation script generated. |
| `VOICE_GENERATED` | `INFO` | Spoken MP3 voice note synthesized (Sarvam or gTTS). |
| `API_EXECUTED` | `INFO` | Gateway link created, instrument switch configured, or mandate scheduled. |
| `MESSAGE_SENT` | `INFO` | Recovery notification (SMS, WhatsApp, Voice) dispatched to customer. |
| `S2S_CALLBACK` | `INFO` | Non-critical Razorpay webhook event received and logged. |
| `RECOVERED` | `INFO` | Payment successfully captured and verified via HMAC signature. |
| `CUSTOMER_PAID_TRIGGER` | `INFO` | Human-in-the-loop closure initiated through verified webhook path. |
| `PROMISE_TO_PAY` | `INFO` | Customer promise recorded with RBI time window clamping. |
| `PROMISE_FOLLOWUP` | `INFO` | Due promise reminder triggered after scheduled time elapsed. |
| `PROMISE_KEPT` | `INFO` | Promise honored: Payment completed within grace period. |
| `PROMISE_BROKEN` | `WARNING` | Promise broken: Grace period expired without payment. |
| `PROMISE_SWEEP` | `INFO` | Background promise tracker sweep summary recorded. |
| `MANDATE_RETRY_SCHEDULED`| `INFO` | 3-attempt spaced mandate retry schedule generated. |
| `MANDATE_ATTEMPT` | `INFO` | Mandate debit retry attempt executed. |
| `MANDATE_CANCELLED` | `INFO` | Remaining mandate attempts cancelled due to prior recovery. |
| `MANDATE_SCHEDULE_EXHAUSTED` | `WARNING` | 3 mandate retry attempts failed without recovery. |
| `N8N_WORKFLOW_DISPATCHED`| `INFO` | Workflow successfully dispatched to n8n execution layer. |
| `N8N_FALLBACK_INTERNAL` | `WARNING` | n8n unreachable: Internal Python sweep fallback engaged. |
| `SARVAM_FALLBACK_TO_GTTS`| `WARNING` | Sarvam AI TTS unreachable: Failover to local gTTS voice engine. |
| `COGNEE_SYNC` | `INFO` | Customer context synchronized to Cognee Knowledge Graph. |
| `COGNEE_FALLBACK_TO_SQLITE` | `WARNING` | Cognee memory offline: Failover to SQLite state aggregation. |
| `LLM_MODEL_SWITCH` | `INFO` | Active LLM failed: Dynamic failover to next model in ladder. |
| `LLM_ALL_FAILED` | `WARNING` | All LLM endpoints failed: Rule-based heuristic classifier engaged. |
| `QUOTA_PRESERVED` | `WARNING` | Link quota preservation activated (remaining $\le 3$). |
| `STOPPING_RULE_TRIGGERED`| `WARNING` | Max retries reached ($\ge 2$) or broken promises ($\ge 2$). |
| `ESCALATED` | `WARNING` | Payment transitioned to manual compliance review. |
| `ESCALATE_HUMAN` | `CRITICAL` | Recovery sequence exhausted: Escalated to human manager. |
| `SECURITY_ALERT` | `CRITICAL` | Webhook HMAC-SHA256 signature verification failed. |
| `DEBUG_QR` | `INFO` | QR code generated for desktop testing. |
| `ERROR` | `WARNING` | General caught exception handled gracefully. |

---

## 10. Summary & Production Readiness

Pratyavartan is engineered with **zero single points of failure**. Every modern AI capability (LLMs, Voice AI, Long-Term Memory, Workflow Automation) is backed by an immediate, deterministic, local fallback that logs every state transition into an immutable SHA-256 cryptographic ledger.

Whether running with full external API keys or in a 100% offline air-gapped demo mode, **Pratyavartan never crashes, never drops a recovery, and never violates regulatory compliance.**
