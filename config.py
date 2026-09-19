"""
config.py - Centralized Configuration & Environment Guardrails.

COMPLIANCE & SECURITY PURPOSE:
Provides immutable runtime configuration and security barriers.
Enforces DEMO_MODE gating: in production (DEMO_MODE=false), all simulation
and state reset endpoints are locked down with HTTP 403 Forbidden, and
strict cryptographic signature verification is required.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Gating: DEMO_MODE defaults to True for hackathon demo and local tests.
# Set DEMO_MODE=false in production to disable all simulated inputs and resets.
DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"

DATABASE_PATH: str = os.getenv("DATABASE_PATH", "revenue_recovery.db")
PORT: int = int(os.getenv("PORT", "8010"))

RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_mock")
RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "dummy_webhook_secret_key")
RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "dummy_webhook_secret_key")
PAYTM_WEBHOOK_SECRET: str = os.getenv("PAYTM_WEBHOOK_SECRET", "dummy_paytm_secret_key")

# Margin Protection Guardrail: Max allowable dynamic discount percentage
MAX_DISCOUNT_PCT: int = int(os.getenv("MAX_DISCOUNT_PCT", "10"))
