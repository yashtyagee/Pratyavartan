<div align="center">

# 🛡️ Pratyavartan (प्रत्यावर्तन)
### Your Paytm Merchant's AI Teammate (Digital Employee #AI-001)

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Razorpay](https://img.shields.io/badge/Razorpay-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF)](https://razorpay.com)
[![Cloudflare](https://img.shields.io/badge/Cloudflare%20Tunnel-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel&logoColor=white)](https://pratyavartan.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Your Paytm Merchant's AI Teammate (Digital Employee #AI-001) — Recover failed Kirana QR payments (e.g. ₹500) and retail transactions autonomously with zero friction and 100% RBI compliance.</b>
</p>

[🌐 Live Landing Page](https://pratyavartan.vercel.app) • [⚡ Live Merchant War Room](#-live-demo) • [📚 API Documentation](#-api-endpoints)

</div>

---

## ⚡ The Problem: Kirana & Retail Payment Leakage at the Counter

In Indian Kirana stores and retail counters, **millions of QR scan transactions fail at the checkout edge**:

| Failure Category | What Happens | Business Impact for Kirana Merchants |
|---|---|---|
| **Kirana QR Scan Failure (e.g. ₹500)** | Dynamic QR scan times out or fails mid-transaction | Customer walks away, counter bottleneck, lost revenue |
| **Insufficient Balance / UPI Daily Limit** | Customer bank rejects UPI at checkout counter | Embarrassing failure, merchant loses sale |
| **Bank Gateway Downtime** | Acquiring bank server offline; dumb bots spam customers | Brand trust destroyed, RBI compliance risk |
| **Manual Escalation Overhead** | Merchants manually chase pending QR debits | Hours lost, friction with local patrons |

**Merchants lose revenue. Customers get frustrated. Nobody wins.**

---

## 💡 The Solution: Pratyavartan — Digital Employee #AI-001

**Pratyavartan** *(Sanskrit: प्रत्यावर्तन — "Return / Reclamation")* is your **Paytm Merchant's AI Teammate (Digital Employee #AI-001)** built natively for the **Razorpay API ecosystem**.

It acts as an autonomous digital staff member:
1. **Instantly detects failed Kirana QR & online payments** via HMAC-SHA256 verified webhooks.
2. **Diagnoses root causes with bounded AI reasoning** (Bank Downtime vs Insufficient Balance vs QR Scan Failure).
3. **Dispatches 1-Click zero-friction recovery links & Hinglish voice notes** directly to the customer.
4. **Maintains a Bulletproof Reliability Fallback Safety Net**: Seamlessly fails over from Sarvam AI to gTTS, and Cognee to SQLite WAL ledger.
5. **Records every autonomous decision in a cryptographic SHA-256 hash-chained audit ledger** while strictly enforcing **RBI anti-harassment stopping rules**.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    A["Razorpay Failure Webhook / Simulator"] -->|"Masked PII Ingestion"| B[("SQLite WAL Database")]
    B -->|"State: PENDING"| C["Autonomous Orchestrator"]
    C -->|"Check retry_count >= 2"| D{"Regulatory Stopping Rule?"}

    D -- Yes --> E["ESCALATE_HUMAN & Log STOPPING_RULE_TRIGGERED"]
    D -- No --> F["AI Diagnostic Brain: Strict JSON Mode"]

    F -->|"CART_DROP"| G["Zero-UI UPI Intent Deep Link"]
    F -->|"LOW_BALANCE"| H["1-Click Instrument Switch: Card/EMI"]
    F -->|"BANK_DOWN"| I["Silent Bank Watch: Suppress Outreach"]
    F -->|"UNKNOWN"| E

    G --> J["Razorpay Payment Link API"]
    H --> J
    I --> K["Status: MONITORING"]

    J --> L["Customer Completes Payment"]
    L -->|"POST /razorpay-webhook HMAC SHA-256"| M["S2S Signature Verification"]
    M -->|"Status: RECOVERED"| B

    B --> N["Merchant War Room Dashboard & Live Audit Trail"]
```

---

## 🚀 Autonomous Recovery Superpowers

### 1. 🎯 Dynamic 1-Click Instrument Switching (`SWITCH_INSTRUMENT`)
When UPI fails due to insufficient balance or daily limits:
- Automatically provisions a **Razorpay Payment Link** with customized rails.
- **Disables failing instruments** (`upi=0`, `wallet=0`).
- **Enables backup rails** (`card=1`, `emi=1`, `netbanking=1`).
- Customer completes checkout in **1 tap — zero cart rebuild**.

### 2. ⚡ Zero-UI UPI Deep Linking (`SEND_UPI_INTENT`)
For abandoned carts and session timeouts:
- Generates direct `upi://pay` intent URIs.
- Applies **dynamic tiered retention incentives** (≥₹5K: 2%, ≥₹10K: 3%, ≥₹25K: 5%).
- Launches the customer's default UPI app (Google Pay, PhonePe, Paytm) directly.

### 3. 🤫 Silent Bank Health Watch (`WAIT_AND_MONITOR`)
When the acquiring bank is offline (`BANK_DOWN`):
- **All customer outreach is suppressed** to protect brand reputation.
- Transaction enters silent monitoring queue.
- Re-evaluates automatically when banking rails recover.

### 4. 🛑 RBI Anti-Harassment Hard Stopping Rules
- If `retry_count >= 2` → AI evaluation **aborts immediately**.
- Emits `STOPPING_RULE_TRIGGERED` audit event.
- Flags to `ESCALATED` status with full diagnostic trail for human support.

### 5. 🎙️ Hinglish AI Voice Recovery Engine
- Generates hyper-personalized audio outreach in natural **Hinglish** via `gTTS`.
- Different voice scripts per diagnosis (e.g., *"Aapka UPI limit cross ho gaya hai — yeh 1-click Card link se payment complete karein"*).

### 6. ⛓️ Cryptographic Hash-Chaining Audit Ledger
- Every audit log entry is sealed: `hash = SHA256(prev_hash + event_data)`.
- Provides **tamper-evident, non-repudiable proof** of compliance for RBI/PCI-DSS audits.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Python 3.11 · FastAPI · Uvicorn · SQLite 3 (WAL Mode) |
| **AI Diagnostic Core** | Google Gemma 4 26B (via OpenRouter) · Strict JSON Schema · Low Temperature (0.1) |
| **Payment Integration** | Razorpay Python SDK · HMAC SHA-256 Webhook Verification · Payment Links API |
| **Voice Engine** | gTTS (Google Text-to-Speech) · Hinglish Script Templates |
| **Merchant War Room** | Bootstrap 5.3 Dark Glassmorphism · Google Fonts (*Outfit*, *Inter*, *JetBrains Mono*) · Real-time 5s auto-sync |
| **Landing Experience** | Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · GSAP · Three.js |
| **Backend Tunnel** | Cloudflare Tunnel (`cloudflared`) — exposes local FastAPI to the internet with zero config |
| **Frontend Hosting** | Vercel (Free Tier) |

---

## 📂 Repository Structure

```text
Pratyavartan/
├── main.py                  # FastAPI App, Webhooks, Simulation Endpoints
├── db.py                    # SQLite WAL Database & SHA-256 Hash-Chained Audit Ledger
├── ai_agent.py              # AI Diagnostic Classifier & Hinglish Voice Engine
├── orchestrator.py          # Autonomous Queue Engine & Stopping Rule Guardrails
├── razorpay_service.py      # Razorpay SDK: Payment Links, UPI Intents, Instrument Routing
├── check_ai.py              # AI Health Check & Diagnostic Verification Script
├── check_audit.py           # Audit Trail Integrity Verification Script
├── requirements.txt         # Python Dependencies
├── .env.example             # Environment Variable Template (safe to commit)
├── templates/
│   └── index.html           # Merchant War Room & Live Audit Dashboard (Dark Glassmorphism)
├── revive-site/             # Next.js 16 High-Performance 3D Animated Landing Page
│   ├── src/
│   │   ├── app/             # App Router Pages
│   │   └── components/      # Hero, Features, Pricing, Footer Components
│   └── package.json
├── DEPLOY_VERCEL.md         # Vercel Landing Deployment Guide
├── Dockerfile               # Optional containerized deployment
├── docker-compose.yml       # Docker Compose for local container testing
└── render.yaml              # Render.com Blueprint (alternative hosting)
```

---

## 💻 Local Setup & Development

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** (for the landing page)
- **Razorpay Test Account** ([dashboard.razorpay.com](https://dashboard.razorpay.com) → API Keys)
- **OpenRouter API Key** ([openrouter.ai](https://openrouter.ai) — free tier available)

### 1. Clone & Install Backend
```bash
git clone https://github.com/Nilesh1381/Pratyavartan.git
cd Pratyavartan

# Create virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your actual Razorpay & LLM credentials
```

### 3. Start the Backend
```bash
python main.py
```
- 🎛️ **War Room Dashboard**: [http://localhost:8010/dashboard](http://localhost:8010/dashboard)
- 📚 **API Documentation**: [http://localhost:8010/docs](http://localhost:8010/docs)
- ❤️ **Health Check**: [http://localhost:8010/health](http://localhost:8010/health)

### 4. Expose via Cloudflare Tunnel (for webhooks & external access)
```bash
# Download cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://localhost:8010
```
This gives you a public `https://xxxxx.trycloudflare.com` URL — use it for:
- Razorpay webhook callbacks
- Connecting the Vercel frontend to the backend
- Live jury demos

### 5. Start the Landing Page (Optional)
```bash
cd revive-site
npm install
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) for the 3D animated landing experience.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check with DB status |
| `GET` | `/dashboard` | Merchant War Room & Audit Trail UI |
| `GET` | `/docs` | Interactive Swagger/OpenAPI Documentation |
| `POST` | `/simulate-failure` | Simulate payment failures for testing |
| `GET` | `/trigger-agent` | Trigger autonomous recovery sweep |
| `POST` | `/razorpay-webhook` | S2S webhook receiver (HMAC SHA-256 verified) |
| `GET` | `/api/metrics` | Real-time revenue recovery KPI metrics |
| `GET` | `/api/audit-log` | Full audit trail with hash chain integrity |
| `GET` | `/api/payments` | List all tracked payment records |

---

## 🧪 Hackathon Jury: Interactive Evaluation Guide

The Merchant Command Center includes a built-in **Live Simulation Engine** for real-time testing:

| Scenario | Simulated Failure Code | Expected AI Response |
|---|---|---|
| **🔴 Test Insufficient Balance (Kirana)** | `PAYMENT_UPI_LIMIT_EXCEEDED` / `INSUFFICIENT_BALANCE` | `SWITCH_INSTRUMENT` → 1-click Card/EMI recovery link or UPI intent, **zero discount** |
| **🟡 Test QR Scan Failed** | `QR_SCAN_FAILED` (₹500 Kirana QR) | `SEND_UPI_INTENT` → Zero-UI 1-click recovery deep link with instant closure |
| **🟠 Test Bank Down** | `GATEWAY_TIMEOUT` | `WAIT_AND_MONITOR` → Silent hold, **no customer outreach** |
| **🔵 Test Max Retries** | Payment with `retry_count >= 2` | `ESCALATE_HUMAN` → AI aborts, logs `STOPPING_RULE_TRIGGERED` |

### How to Test:
1. Open the **War Room Dashboard** → scroll to **Live Simulation Engine**.
2. Click any scenario button → watch the audit trail update in real-time.
3. Click **Trigger Recovery Sweep** → observe autonomous orchestration.
4. Verify **KPI cards** update: Revenue at Risk, Revenue Recovered, Active Monitoring, Escalated.

---

## 🔒 Compliance & Security

| Guardrail | Implementation |
|---|---|
| **PII Data Masking** | Customer phone numbers masked on ingestion (`******1234`) — never stored in plaintext |
| **Webhook Cryptography** | All Razorpay webhooks verified via `X-Razorpay-Signature` HMAC SHA-256 |
| **Audit Immutability** | SHA-256 hash-chaining (`hash = SHA256(prev_hash + event)`) prevents log tampering |
| **Anti-Harassment** | Hard stop at 2 retries per payment — no exceptions |
| **CORS Protection** | Strict origin allowlisting via `ALLOWED_ORIGINS` environment variable |

---

## 🚢 Deployment Options

| Platform | Type | Guide |
|---|---|---|
| **Cloudflare Tunnel** | Backend (primary) | `cloudflared tunnel --url http://localhost:8010` |
| **Vercel** | Frontend Landing | [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) |
| **Docker** | Full-stack containerized | `docker-compose up --build` |
| **Render** | Cloud PaaS | Uses [render.yaml](render.yaml) blueprint |

---

## 👥 Team & Acknowledgments

Built with ❤️ for the **Razorpay AI Buildathon 2026**.

- **Nilesh** — Architecture, Backend Engine, AI Integration, Deployment
- **Repository**: [github.com/Nilesh1381/Pratyavartan](https://github.com/Nilesh1381/Pratyavartan)
