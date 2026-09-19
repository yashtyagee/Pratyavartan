"""
ai_agent.py - Multi-Provider AI Diagnostic Brain, Dynamic Discount Engine & Voice Negotiator.

COMPLIANCE PURPOSE:
Executes deterministic, bounded AI evaluation of payment failures using configurable LLM providers
(Groq, OpenRouter, OpenAI, etc.) with strict JSON mode. Hard-coded stopping rules strictly supersede
model output to guarantee compliance with RBI customer communication and anti-harassment mandates.
Integrates an automated Dynamic Discount Engine and personalized Hinglish Voice Negotiation Generator
with detailed fallback error telemetry.
"""

import json
import logging
import os
import uuid
import time
from typing import Any, Dict, List, Literal, Optional, Tuple
from urllib.parse import quote
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field
import db

load_dotenv()

logger = logging.getLogger(__name__)

# Configurable LLM Provider Settings
LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
MODEL_NAME: str = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
LLM_API_KEY: str = os.getenv("LLM_API_KEY", os.getenv("OPENAI_API_KEY", "dummy"))
MERCHANT_UPI_VPA: str = os.getenv("MERCHANT_UPI_VPA", "MERCHANT_VPA@razorpay")
MERCHANT_DISPLAY_NAME: str = os.getenv("MERCHANT_NAME", "Merchant")

# Ordered Model Fallback Chain:
# Requested priority models followed by active free models to ensure resilient execution
ORDERED_FALLBACK_MODELS: List[str] = [
    "mistralai/mistral-7b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "qwen/qwen-2-7b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "minimax/minimax-m3:free",
    "nvidia/nemotron-3.5-lightning:free",
    "poolside/laguna-s-2.1:free",
    "google/gemma-4-26b-a4b-it:free",
]

# Startup log announcing active LLM Provider
logger.info("[LLM_CONFIG] Active Provider: %s | Model: %s", LLM_BASE_URL, MODEL_NAME)


def test_llm_connection() -> Dict[str, Any]:
    """
    Makes a tiny completion request ("Reply with the single word: READY") using the active model / fallback chain.
    Returns {status:"ok", model:<name>, latency_ms} or {status:"fail", error}.
    """
    api_key = os.getenv("LLM_API_KEY", "").strip()
    if not api_key or api_key == "dummy" or api_key.startswith("sk-your-") or api_key.startswith("sk-dummy"):
        msg = "PASTE YOUR OpenRouter KEY (sk-or-v1-...) INTO .env THEN RE-RUN"
        print(msg)
        return {"status": "fail", "error": msg}

    client = get_llm_client()
    if not client:
        return {"status": "fail", "error": "Unable to initialize LLM client with current configuration"}

    current_model = os.getenv("LLM_MODEL", MODEL_NAME).strip()
    models_to_try = [current_model]
    for m in ORDERED_FALLBACK_MODELS:
        if m != current_model and m not in models_to_try:
            models_to_try.append(m)

    last_error = None
    for idx, model_name in enumerate(models_to_try):
        t0 = time.perf_counter()
        try:
            resp = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": "Reply with the single word: READY"}],
                max_tokens=10,
                timeout=8.0,
            )
            if not resp.choices or not resp.choices[0].message:
                raise ValueError(f"Model {model_name} returned empty choices")
            content = (resp.choices[0].message.content or "").strip()
            if not content:
                raise ValueError(f"Model {model_name} returned empty content")
            latency_ms = int((time.perf_counter() - t0) * 1000)
            return {
                "status": "ok",
                "model": model_name,
                "latency_ms": latency_ms,
            }
        except Exception as exc:
            last_error = exc
            next_model = models_to_try[idx + 1] if idx + 1 < len(models_to_try) else None
            if next_model:
                try:
                    db.log_event(
                        correlation_id=str(uuid.uuid4()),
                        payment_id="SYSTEM",
                        event_type="LLM_MODEL_SWITCH",
                        payload={"from": model_name, "to": next_model, "reason": str(exc)},
                        reasoning=f"LLM test request failed for {model_name}: {exc}. Switching to {next_model}.",
                        severity="INFO",
                    )
                except Exception:
                    pass
                logger.info("[LLM_MODEL_SWITCH] %s -> %s | Reason: %s", model_name, next_model, exc)

    try:
        db.log_event(
            correlation_id=str(uuid.uuid4()),
            payment_id="SYSTEM",
            event_type="LLM_ALL_FAILED",
            payload={"error": str(last_error), "models_tried": models_to_try},
            reasoning="All models in fallback chain failed during LLM test.",
            severity="WARNING",
        )
    except Exception:
        pass
    return {"status": "fail", "error": str(last_error)}


def get_llm_client() -> Optional[OpenAI]:
    """
    Dynamically loads and initializes the OpenAI-compatible client (Groq, OpenRouter, OpenAI, etc.)
    using current environment variables.
    """
    api_key = os.getenv("LLM_API_KEY", os.getenv("OPENAI_API_KEY", "dummy")).strip()
    base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1").strip()
    
    if (
        api_key
        and api_key != "dummy"
        and not api_key.startswith("sk-your-")
        and not api_key.startswith("sk-dummy")
    ):
        try:
            return OpenAI(api_key=api_key, base_url=base_url, max_retries=0)
        except Exception as init_err:
            logger.warning("[LLM_INIT_WARN] %s. Fallback heuristics will be active.", init_err)
    return None


class AIDiagnosis(BaseModel):
    """
    Structured, strictly validated output of the AI revenue diagnostic model.
    """
    diagnosis: Literal["BANK_DOWN", "CART_DROP", "LOW_BALANCE", "SUPPLIER_FAIL", "UNKNOWN"]
    action: Literal["WAIT_AND_MONITOR", "SEND_UPI_INTENT", "SWITCH_INSTRUMENT", "NEGOTIATE_HOLD", "MANDATE_RETRY", "ESCALATE_HUMAN", "IGNORE_LOW_ERV"]
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)
    scenario: Optional[str] = None
    blocked_methods: Optional[List[str]] = None
    enabled_methods: Optional[List[str]] = None
    upi_intent_uri: Optional[str] = None
    erv: Optional[Dict[str, Any]] = None
    split_offer: Optional[Dict[str, Any]] = None
    negotiation_draft: Optional[str] = None


# System Prompt optimized for Llama 3.3 70B and OpenAI models with strict schema definitions
SYSTEM_PROMPT = """
You are Pratyavartan: The Paytm Merchant's AI Teammate (Digital Employee #AI-001). You diagnose Kirana store dynamic QR and retail payment failures, and prescribe bounded recovery actions.

DIAGNOSIS AND ACTION TAXONOMY:
1. BANK_DOWN: error contains 'gateway', 'timeout', 'bank_decline', 'network', 'server_error'
   → action: WAIT_AND_MONITOR (bank issue resolves itself)
   → scenario: BANK_DOWN
2. CART_DROP: error contains 'abandoned', 'session_timeout', 'user_cancelled', 'browser_closed', 'checkout_incomplete', 'qr_scan_failed', 'qr_timeout'
   → action: SEND_UPI_INTENT (Zero-UI deep link bypasses broken checkout)
   → scenario: CART_ABANDONMENT
3. LOW_BALANCE: error contains 'insufficient', 'limit_exceeded', 'daily_limit', 'upi_limit', 'balance'
   → action: SWITCH_INSTRUMENT (disable failing UPI, offer Card/EMI/PayLater link)
   → scenario: UPI_LIMIT (if daily limit reached) OR INSUFFICIENT_BALANCE (if low account balance)
4. SUPPLIER_FAIL: error contains 'supplier', 'distributor', 'vendor'
   → action: NEGOTIATE_HOLD (negotiate temporary order dispatch hold with distributor)
   → scenario: SUPPLIER_FAIL
5. UNKNOWN: anything else
   → action: ESCALATE_HUMAN
   → scenario: UNKNOWN

JSON SCHEMA REQUIREMENT:
You MUST return a valid JSON object matching this exact schema:
{
  "diagnosis": "BANK_DOWN" | "CART_DROP" | "LOW_BALANCE" | "SUPPLIER_FAIL" | "UNKNOWN",
  "action": "WAIT_AND_MONITOR" | "SEND_UPI_INTENT" | "SWITCH_INSTRUMENT" | "NEGOTIATE_HOLD" | "ESCALATE_HUMAN",
  "scenario": "BANK_DOWN" | "CART_ABANDONMENT" | "UPI_LIMIT" | "INSUFFICIENT_BALANCE" | "SUPPLIER_FAIL" | "UNKNOWN",
  "reasoning": "<Short explanatory rationale>",
  "confidence": <float between 0.0 and 1.0>
}

OUTPUT FORMAT:
Return ONLY raw valid JSON. Do not include markdown code blocks, backticks, preamble, or conversational commentary.
"""

VOICE_PROMPT = """
You are a warm, courteous Indian customer-support executive representing the merchant's AI Teammate (Digital Employee #AI-001).
Generate a concise, natural Hinglish (Hindi + English) voice message for automated Kirana store QR payment recovery.

REQUIREMENTS:
1. Speak in polite, reassuring Hinglish.
2. Max 35 words.
3. Mention the customer's name, the original amount (e.g. Rs. 500), any instant merchant incentive applied, and the final amount.
4. Add a gentle call-to-action asking them to tap the 1-click recovery link immediately.
5. Return ONLY the spoken text string without quotes, formatting, or prefixes.
"""


def map_scenario(error_code: str = "", reasoning: str = "") -> str:
    """
    SCENARIO MAPPING — deterministic keyword scan on error_code first (source of truth),
    then fallback to reasoning:
    1. error_code check (gateway/timeout -> BANK_DOWN, etc.)
    2. combined text check
    """
    err_l = str(error_code or "").lower()
    rsn_l = str(reasoning or "").lower()

    # Priority 1: Direct error_code classification
    if "supplier" in err_l or "distributor" in err_l:
        return "SUPPLIER_FAIL"
    if "limit" in err_l:
        return "UPI_LIMIT"
    if "insufficient" in err_l or "balance" in err_l:
        return "INSUFFICIENT_BALANCE"
    if "gateway" in err_l or "bank" in err_l or "timeout" in err_l or "network" in err_l or "server_error" in err_l:
        return "BANK_DOWN"
    if "mandate" in err_l or "autopay" in err_l:
        return "MANDATE_FAIL"
    if "qr" in err_l or "scan" in err_l or "cart" in err_l or "abandon" in err_l:
        return "CART_ABANDONMENT"

    # Priority 2: Combined text check
    combined = f"{err_l} {rsn_l}".lower()
    if "supplier" in combined or "distributor" in combined:
        return "SUPPLIER_FAIL"
    if "limit" in combined:
        return "UPI_LIMIT"
    if "insufficient" in combined or "balance" in combined:
        return "INSUFFICIENT_BALANCE"
    if "bank" in combined or "gateway" in combined or "npci" in combined:
        return "BANK_DOWN"
    if "mandate" in combined or "autopay" in combined:
        return "MANDATE_FAIL"
    if "qr" in combined or "scan" in combined or "cart" in combined or "abandon" in combined:
        return "CART_ABANDONMENT"
    return "UNKNOWN"


def compute_erv(
    amount_paise: int,
    scenario: str,
    memory_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    PART 2: Computes Expected Recovery Value (ERV) & recovery probability.
    Probabilities (illustrative priors):
    - INSUFFICIENT_BALANCE: 0.75
    - UPI_LIMIT: 0.70
    - CART_ABANDONMENT: 0.60
    - MANDATE_FAIL: 0.50
    - BANK_DOWN: 0.30
    - SUPPLIER_FAIL: 0.50
    - Default: 0.50

    Memory adjustments:
    - kept_promises > 0 -> +0.10
    - broken_promises >= 2 -> -0.20
    - Clamped to [0.05, 0.95]
    - erv_paise = int(amount_paise * probability)
    """
    priors = {
        "INSUFFICIENT_BALANCE": 0.75,
        "UPI_LIMIT": 0.70,
        "CART_ABANDONMENT": 0.60,
        "MANDATE_FAIL": 0.50,
        "BANK_DOWN": 0.30,
        "SUPPLIER_FAIL": 0.50,
        "CART_DROP": 0.60,
        "LOW_BALANCE": 0.72,
    }
    sc_clean = (scenario or "UNKNOWN").upper()
    base_prob = priors.get(sc_clean, 0.50)
    basis = [f"Base scenario prior: {sc_clean} ({base_prob:.2f}) [illustrative prior]"]

    prob = base_prob
    if memory_context:
        kept = memory_context.get("kept_promises", 0)
        broken = memory_context.get("broken_promises", 0)
        if kept > 0:
            prob += 0.10
            basis.append(f"Positive credit history: {kept} past promise(s) kept (+0.10)")
        if broken >= 2:
            prob -= 0.20
            basis.append(f"High risk signal: {broken} broken promise(s) (-0.20)")

    # Clamp probability to 0.05..0.95
    clamped_prob = max(0.05, min(0.95, prob))
    if clamped_prob != prob:
        basis.append(f"Clamped to safety bounds [0.05, 0.95] -> {clamped_prob:.2f}")

    erv_paise = int(amount_paise * clamped_prob)
    erv_inr = round(erv_paise / 100.0, 2)
    amount_inr = round(amount_paise / 100.0, 2)

    return {
        "erv_paise": erv_paise,
        "erv_inr": erv_inr,
        "amount_inr": amount_inr,
        "probability": round(clamped_prob, 2),
        "recovery_probability": round(clamped_prob, 2),
        "basis": basis,
        "label": "illustrative priors",
    }


def generate_supplier_negotiation_draft(
    merchant_name: str,
    amount_inr: float,
    memory_context: Optional[Dict[str, Any]] = None,
    correlation_id: Optional[str] = None,
    payment_id: str = "",
) -> str:
    """
    PART 3: B2B Supplier Negotiator.
    Drafts a professional, persuasive Hinglish order hold notice for distributor/supplier.
    """
    cid = correlation_id or str(uuid.uuid4())
    m_name = merchant_name or os.getenv("MERCHANT_NAME", "Sharma Kirana Store")
    amount_formatted = f"₹{int(amount_inr):,}" if amount_inr >= 1 else f"₹{amount_inr:.2f}"

    draft = (
        f"Namaste, main {m_name} ka AI assistant hoon. {amount_formatted} ka payment bank issue se fail hua; "
        f"shaam 5 baje tak clear ho jayega. Order hold kijiye — hamara payment history saaf hai."
    )

    client = get_llm_client()
    if client:
        try:
            prompt = (
                f"Merchant: {m_name}\n"
                f"Amount: {amount_formatted}\n"
                f"Distributor Context: B2B recurring supplier order payment failed due to bank gateway.\n"
                f"Write a 1-paragraph polite Hinglish negotiation letter asking distributor to hold dispatch until 5 PM today. "
                f"Assure them of clean payment history. Keep it under 40 words."
            )
            resp = client.chat.completions.create(
                model=os.getenv("LLM_MODEL", MODEL_NAME),
                messages=[
                    {"role": "system", "content": "You are a professional B2B merchant AI negotiator speaking courteous Hinglish."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=90,
                temperature=0.3,
                timeout=5.0,
            )
            llm_text = resp.choices[0].message.content.strip()
            if llm_text and len(llm_text) > 15:
                draft = llm_text.replace('"', '').strip()
        except Exception as exc:
            logger.info("[SUPPLIER_DRAFT] LLM call failed (%s), using deterministic template.", exc)

    # Log NEGOTIATION_DRAFTED
    db.log_event(
        correlation_id=cid,
        payment_id=payment_id or "SYSTEM",
        event_type="NEGOTIATION_DRAFTED",
        payload={
            "merchant_name": m_name,
            "amount_inr": amount_inr,
            "draft": draft,
            "channel": "supplier_channel",
        },
        reasoning="B2B Supplier payment hold letter drafted for distributor order retention.",
        severity="INFO",
    )

    return draft


def build_upi_intent_uri(amount_paise: int, payment_id: str = "") -> str:
    """
    Builds upi_intent_uri as:
    upi://pay?pa={DEMO_VPA}&pn={merchant_name}&am={amount_paise/100}&cu=INR&tn=Pratyavartan+Recovery
    Defaults to sharmageneral@paytm if unconfigured so mobile camera scanning works 100%.
    Amount MUST equal the recovery amount in INR.
    """
    vpa = os.getenv("DEMO_VPA", os.getenv("MERCHANT_UPI_VPA", "sharmageneral@paytm")).strip()
    if not vpa or vpa.lower() in ("dummy", "none", "unset"):
        vpa = "sharmageneral@paytm"
    merchant = os.getenv("MERCHANT_NAME", "Sharma General Store").strip() or "Sharma General Store"
    am_str = f"{amount_paise / 100:.2f}"
    tn_suffix = f" {payment_id}" if payment_id else ""
    return f"upi://pay?pa={quote(vpa, safe='@')}&pn={quote(merchant)}&am={am_str}&cu=INR&tn={quote('Recovery' + tn_suffix)}"


def resolve_scenario_and_methods(
    error_code: str = "",
    reasoning: str = "",
    amount_paise: int = 0,
    payment_id: str = "",
) -> Tuple[str, List[str], List[str], Optional[str], str, str]:
    """
    Deterministically resolves scenario, blocked_methods, enabled_methods,
    upi_intent_uri, prescribed action, and default reasoning.
    Returns: (scenario, blocked_methods, enabled_methods, upi_intent_uri, action, final_reasoning)
    """
    try:
        scenario = map_scenario(error_code=error_code, reasoning=reasoning)

        if scenario == "SUPPLIER_FAIL":
            return (
                "SUPPLIER_FAIL",
                [],
                ["bank_transfer", "neft", "rtgs"],
                None,
                "NEGOTIATE_HOLD",
                reasoning or "Merchant B2B supplier payment failure. Negotiating temporary order hold with distributor.",
            )
        elif scenario == "UPI_LIMIT":
            return (
                "UPI_LIMIT",
                ["upi", "wallet"],
                ["card", "emi", "netbanking"],
                None,
                "SWITCH_INSTRUMENT",
                reasoning or "UPI daily limit reached. Re-routing customer to Card/EMI/Netbanking recovery link.",
            )
        elif scenario == "INSUFFICIENT_BALANCE":
            uri = build_upi_intent_uri(amount_paise, payment_id) if (amount_paise > 0) else None
            return (
                "INSUFFICIENT_BALANCE",
                [],
                ["upi", "wallet", "card", "emi", "netbanking"],
                uri,
                "SWITCH_INSTRUMENT",
                reasoning or "Low account balance. UPI kept enabled with 1-click intent link + Card/EMI backup.",
            )
        elif scenario == "CART_ABANDONMENT":
            uri = build_upi_intent_uri(amount_paise, payment_id) if (amount_paise > 0) else None
            return (
                "CART_ABANDONMENT",
                [],
                ["upi", "card", "emi", "netbanking"],
                uri,
                "SEND_UPI_INTENT",
                reasoning or "Kirana QR scan payment failure identified. Dispatching 1-click zero-friction recovery deep link.",
            )
        elif scenario == "BANK_DOWN":
            return (
                "BANK_DOWN",
                [],
                [],
                None,
                "WAIT_AND_MONITOR",
                "Bank/gateway down — spamming link now = futile + annoying. Will resume when service recovers.",
            )
        elif scenario == "MANDATE_FAIL":
            return (
                "MANDATE_FAIL",
                [],
                ["upi", "card"],
                None,
                "MANDATE_RETRY",
                "Mandate/autopay debit failure detected. Routing to Mandate Retry Sequencer.",
            )
        else:
            return (
                "UNKNOWN",
                [],
                ["upi", "card", "emi", "netbanking", "wallet"],
                None,
                "ESCALATE_HUMAN",
                reasoning or "Unclassified failure — safe default, no method restriction applied",
            )
    except Exception as err:
        logger.warning("[SCENARIO_RESOLUTION_ERR] %s", err)
        return (
            "UNKNOWN",
            [],
            ["upi", "card", "emi", "netbanking", "wallet"],
            None,
            "ESCALATE_HUMAN",
            "Unclassified failure — safe default, no method restriction applied",
        )


def _heuristic_fallback_classifier(
    error_code: str,
    error_description: str,
    amount_paise: int = 0,
    payment_id: str = "",
    memory_context: Optional[Dict[str, Any]] = None,
) -> AIDiagnosis:
    """
    Deterministic rule-based fallback classifier in the event of LLM API outage or rate limits.
    Ensures 100% fail-safe continuity without violating business logic.
    """
    sc, blk, enb, uri, act, rsn = resolve_scenario_and_methods(
        error_code=error_code,
        reasoning=error_description,
        amount_paise=amount_paise,
        payment_id=payment_id,
    )

    diag_map = {
        "BANK_DOWN": "BANK_DOWN",
        "CART_ABANDONMENT": "CART_DROP",
        "UPI_LIMIT": "LOW_BALANCE",
        "INSUFFICIENT_BALANCE": "LOW_BALANCE",
        "MANDATE_FAIL": "BANK_DOWN",
        "SUPPLIER_FAIL": "SUPPLIER_FAIL",
        "UNKNOWN": "UNKNOWN",
    }
    diag_name = diag_map.get(sc, "UNKNOWN")

    erv_data = compute_erv(amount_paise, sc, memory_context)
    split_offer = None
    if sc == "INSUFFICIENT_BALANCE" and amount_paise >= 20000:
        upi_paise = int(amount_paise * 0.4)
        split_offer = {
            "upi_paise": upi_paise,
            "postpaid_paise": amount_paise - upi_paise,
            "note": "illustrative",
        }

    diag = AIDiagnosis(
        diagnosis=diag_name,
        action=act if act in ("WAIT_AND_MONITOR", "SEND_UPI_INTENT", "SWITCH_INSTRUMENT", "NEGOTIATE_HOLD", "MANDATE_RETRY", "ESCALATE_HUMAN", "IGNORE_LOW_ERV") else "ESCALATE_HUMAN",
        reasoning=rsn,
        confidence=0.95,
        scenario=sc,
        blocked_methods=blk,
        enabled_methods=enb,
        upi_intent_uri=uri,
        erv=erv_data,
        split_offer=split_offer,
    )
    return diag


def generate_discount_offer(
    amount_paise: int,
    error_type: str,
    correlation_id: Optional[str] = None,
    payment_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    PART B: AI Dynamic Discount Engine.

    Evaluates transaction value and applies tiered dynamic incentives to salvage high-intent carts:
    - >= 25,00,000 paise (>= Rs.25,000) -> 5% discount
    - >= 10,00,000 paise (>= Rs.10,000) -> 3% discount
    - >= 5,00,000 paise (>= Rs.5,000)  -> 2% discount
    - else                            -> 0% discount
    """
    cid = correlation_id or str(uuid.uuid4())
    pid = payment_id or "SYSTEM"

    if amount_paise >= 2500000:
        discount_pct = 5
    elif amount_paise >= 1000000:
        discount_pct = 3
    elif amount_paise >= 250000:
        discount_pct = 2
    else:
        discount_pct = 0

    discount_amount_paise = int(amount_paise * discount_pct / 100)
    final_amount_paise = amount_paise - discount_amount_paise
    discount_approved = discount_pct > 0

    offer = {
        "original_amount_paise": amount_paise,
        "discount_percentage": discount_pct,
        "discount_amount_paise": discount_amount_paise,
        "final_amount_paise": final_amount_paise,
        "discount_approved": discount_approved,
    }

    if discount_approved:
        db.log_event(
            correlation_id=cid,
            payment_id=pid,
            event_type="DISCOUNT_APPROVED",
            payload=offer,
            reasoning=f"AI Dynamic Discount Engine authorized {discount_pct}% instant retention incentive (Saved Rs.{discount_amount_paise/100:.2f}).",
            severity="INFO",
        )

    return offer


def generate_voice_script(
    customer_name: str = "Valued Customer",
    original_inr: float = 0.0,
    discount_inr: float = 0.0,
    final_inr: float = 0.0,
    correlation_id: Optional[str] = None,
    payment_id: Optional[str] = None,
    diagnosis: str = "CART_DROP",
    original_error_code: str = "",
    split_offer: Optional[Dict[str, Any]] = None,
) -> str:
    """
    PART C: Generates a personalized Hinglish voice negotiation script using the active LLM.
    - For LOW_BALANCE (persona-aware, driven by the original error_code):
        * UPI_LIMIT           -> UPI daily limit reached; 1-click Card/EMI link.
        * INSUFFICIENT_BALANCE / unknown -> balance was low but top-up-able; UPI stays
          ENABLED with a 1-click UPI intent link + Card/EMI backup.
    - If split_offer is present: Adds Paytm Postpaid split rescue line.
    - For CART_DROP: Highlights retention discount incentive and zero-UI recovery.
    """
    cid = correlation_id or str(uuid.uuid4())
    pid = payment_id or "SYSTEM"
    current_model = os.getenv("LLM_MODEL", MODEL_NAME)

    # Scenario resolution mirrors razorpay_service.resolve_low_balance_scenario
    try:
        error_l = str(original_error_code or "").lower()
        lb_scenario = "UPI_LIMIT" if "limit" in error_l else "INSUFFICIENT_BALANCE"
    except Exception:
        lb_scenario = "INSUFFICIENT_BALANCE"

    split_line = " Chahein toh kuch UPI se aur baaki Paytm Postpaid se de sakte hain — 1-click split link bheja hai." if split_offer else ""

    if diagnosis == "LOW_BALANCE" and lb_scenario == "UPI_LIMIT":
        fallback_script = (
            "Sir, aapki dukaan pe QR payment ki daily UPI limit exceed ho gayi thi, isliye Card aur alternate payment link bheja hai. "
            "Kripya diye gaye link se turant payment complete kijiye!"
        )
    elif diagnosis == "LOW_BALANCE":
        fallback_script = (
            f"Bhaiya, account balance kam hone se dukaan ka QR payment ruk gaya tha. "
            f"Abhi 1-click UPI intent link se pay karein ya Card/EMI use karein!{split_line}"
        )
    elif diagnosis == "SUPPLIER_FAIL":
        fallback_script = (
            f"Namaste! Distributor payment hold notification dispatch ho gaya hai. Order safe hai."
        )
    else:
        fallback_script = (
            f"Namaste {customer_name}! Kirana store pe aapka payment complete nahi ho paya tha. "
            f"Aapke liye instant recovery link bheja hai (amount: rupees {final_inr:,.2f}). "
            f"Kripya diye gaye link se turant complete karein!"
        )

    client = get_llm_client()
    if client:
        try:
            if diagnosis == "LOW_BALANCE" and lb_scenario == "UPI_LIMIT":
                low_balance_prompt = (
                    "You are a warm, courteous Indian customer-support executive representing the merchant's AI Teammate (Digital Employee #AI-001) assisting a customer whose Kirana store QR payment failed due to daily bank/UPI limit.\n"
                    "Generate a concise, natural Hinglish voice message (max 30 words).\n"
                    "State that their UPI daily limit was reached at the Kirana store, and we have sent a 1-click Card/EMI recovery link so they can complete the purchase instantly.\n"
                    "Do NOT mention any discounts or price reductions.\n"
                    "Return ONLY the spoken text string without quotes, formatting, or prefixes."
                )
                user_msg = (
                    f"Customer Name: {customer_name}\n"
                    f"Original Amount: Rs.{original_inr:,.2f}\n"
                    f"Failure Reason: UPI Limit Exceeded at Kirana QR\n"
                    f"Alternative Method: Card / EMI One-Click Link (Instant merchant settlement)"
                )
                system_p = low_balance_prompt
            elif diagnosis == "LOW_BALANCE":
                insufficient_prompt = (
                    "You are a warm, courteous Indian customer-support executive representing the merchant's AI Teammate (Digital Employee #AI-001) assisting a customer whose Kirana store QR payment failed due to insufficient account balance.\n"
                    "Generate a concise, natural Hinglish voice message (max 32 words).\n"
                    "Reassure them it is not a problem: their balance can be topped up and they can pay via the 1-click link. "
                    + ("Mention they can split pay with Paytm Postpaid. " if split_offer else "")
                    + "Do NOT mention any discounts or price reductions.\n"
                    "Return ONLY the spoken text string without quotes, formatting, or prefixes."
                )
                user_msg = (
                    f"Customer Name: {customer_name}\n"
                    f"Original Amount: Rs.{original_inr:,.2f}\n"
                    f"Failure Reason: Insufficient Account Balance (top-up possible)\n"
                    f"Primary Method: 1-Click UPI Intent Link (UPI stays enabled)\n"
                    f"Backup Methods: Card / EMI / Netbanking / Paytm Postpaid"
                )
                system_p = insufficient_prompt
            else:
                user_msg = (
                    f"Customer Name: {customer_name}\n"
                    f"Original Amount: Rs.{original_inr:,.2f}\n"
                    f"Discount Saved: Rs.{discount_inr:,.2f}\n"
                    f"Final Discounted Amount: Rs.{final_inr:,.2f}"
                )
                system_p = VOICE_PROMPT.strip()

            response = client.chat.completions.create(
                model=current_model,
                temperature=0.3,
                max_tokens=90,
                timeout=8.0,
                messages=[
                    {"role": "system", "content": system_p},
                    {"role": "user", "content": user_msg},
                ],
            )
            script_text = (response.choices[0].message.content or "").strip().replace('"', '')
            if script_text and len(script_text) > 15:
                if split_offer and "postpaid" not in script_text.lower():
                    script_text += f"{split_line}"
                db.log_event(
                    correlation_id=cid,
                    payment_id=pid,
                    event_type="VOICE_SCRIPT_GENERATED",
                    payload={"voice_script": script_text, "model": current_model, "diagnosis": diagnosis, "scenario": lb_scenario if diagnosis == "LOW_BALANCE" else "", "final_inr": final_inr, "has_split": bool(split_offer)},
                    reasoning=f"Hinglish voice script generated via {current_model} for {diagnosis}.",
                    severity="INFO",
                )
                return script_text
        except Exception as err:
            logger.warning("[VOICE_GEN_WARN] LLM Voice script generation fallback: %s", err)

    db.log_event(
        correlation_id=cid,
        payment_id=pid,
        event_type="VOICE_SCRIPT_GENERATED",
        payload={"voice_script": fallback_script, "fallback": True, "diagnosis": diagnosis, "scenario": lb_scenario if diagnosis == "LOW_BALANCE" else "", "final_inr": final_inr, "has_split": bool(split_offer)},
        reasoning=f"Deterministic Hinglish voice script applied for {diagnosis}.",
        severity="INFO",
    )
    return fallback_script


def classify_and_decide(
    error_code: str,
    error_description: str,
    retry_count: int,
    correlation_id: Optional[str] = None,
    payment_id: Optional[str] = None,
    amount_paise: int = 0,
    customer_ref: Optional[str] = None,
) -> AIDiagnosis:
    """
    Classifies a payment failure and prescribes a bounded recovery action.

    COMPLIANCE & RESILIENCE PURPOSE:
    1. Enforces the Critical Hard-Coded Stopping Rule (retry_count >= 2).
    2. Recalls Cognee Long-Term Memory (with SQLite fallback): if broken_promises >= 2,
       automatically escalates to human compliance manager (Teammate loses patience).
    3. Injects customer memory into LLM System Prompt for personalized recovery.
    """
    import memory
    cid = correlation_id or str(uuid.uuid4())
    pid = payment_id or "SYSTEM"
    current_model = os.getenv("LLM_MODEL", MODEL_NAME)

    # =========================================================================
    # CRITICAL STOPPING RULE 1: Execute BEFORE any LLM API call
    # =========================================================================
    if retry_count >= 2:
        stopping_reason = (
            "Stopping Rule: Max retries (2) reached. Escalating per RBI governance policy."
        )
        logger.warning("[STOPPING_RULE] Triggered for payment %s (retry_count=%d)", pid, retry_count)
        
        db.log_event(
            correlation_id=cid,
            payment_id=pid,
            event_type="STOPPING_RULE_TRIGGERED",
            payload={"retry_count": retry_count, "limit": 2, "action": "ESCALATE_HUMAN"},
            reasoning=stopping_reason,
            severity="WARNING",
        )
        return AIDiagnosis(
            diagnosis="UNKNOWN",
            action="ESCALATE_HUMAN",
            reasoning=stopping_reason,
            confidence=1.0,
            scenario="UNKNOWN",
            blocked_methods=[],
            enabled_methods=[],
            upi_intent_uri=None,
        )

    # =========================================================================
    # CRITICAL STOPPING RULE 2: Cognee Long-Term Memory Check
    # If broken_promises >= 2 -> Teammate loses patience and escalates early
    # =========================================================================
    effective_ref = customer_ref or pid
    memory_context = memory.recall_customer_context(effective_ref, correlation_id=cid)
    broken_count = memory_context.get("broken_promises", 0)

    if broken_count >= 2:
        memory_stopping_reason = (
            f"Customer Memory Guard: broken_promises={broken_count} >= 2 "
            "(Teammate loses patience). Escalate to human compliance manager immediately."
        )
        logger.warning("[MEMORY_GUARD] Escalating %s: broken_promises=%d", pid, broken_count)
        db.log_event(
            correlation_id=cid,
            payment_id=pid,
            event_type="STOPPING_RULE_TRIGGERED",
            payload={
                "customer_ref": memory_context.get("customer_ref"),
                "broken_promises": broken_count,
                "memory_context": memory_context,
                "action": "ESCALATE_HUMAN",
            },
            reasoning=memory_stopping_reason,
            severity="WARNING",
        )
        return AIDiagnosis(
            diagnosis="UNKNOWN",
            action="ESCALATE_HUMAN",
            reasoning=memory_stopping_reason,
            confidence=1.0,
            scenario="UNKNOWN",
            blocked_methods=[],
            enabled_methods=[],
            upi_intent_uri=None,
        )

    # =========================================================================
    # LLM Invocation with Model Fallback Chain & Strict JSON Output
    # =========================================================================
    user_prompt = f"Error Code: {error_code}\nError Description: {error_description}"
    dynamic_system_prompt = (
        f"{SYSTEM_PROMPT.strip()}\n\n"
        f"Customer Context: {json.dumps(memory_context)}. Use this historical context to decide the best action, tone, and pacing."
    )
    
    client = get_llm_client()
    if client:
        models_to_try = [current_model]
        for m in ORDERED_FALLBACK_MODELS:
            if m != current_model and m not in models_to_try:
                models_to_try.append(m)

        last_api_err = None
        for idx, model_name in enumerate(models_to_try):
            try:
                try:
                    response = client.chat.completions.create(
                        model=model_name,
                        response_format={"type": "json_object"},
                        temperature=0.1,
                        max_tokens=400,
                        timeout=8.0,
                        messages=[
                            {"role": "system", "content": dynamic_system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    )
                except Exception as format_err:
                    # If model does not support response_format json_object
                    logger.info("[LLM_RETRY] Retrying without response_format for model %s: %s", model_name, format_err)
                    response = client.chat.completions.create(
                        model=model_name,
                        temperature=0.1,
                        max_tokens=400,
                        timeout=8.0,
                        messages=[
                            {"role": "system", "content": dynamic_system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    )

                if not response.choices or not response.choices[0].message:
                    raise ValueError(f"Model {model_name} returned empty choices")
                raw_content = response.choices[0].message.content or ""
                if not raw_content.strip():
                    raise ValueError(f"Model {model_name} returned empty content")
                
                # Clean possible markdown wrapping if returned by LLM
                clean_json_str = raw_content.strip()
                if clean_json_str.startswith("```"):
                    lines = clean_json_str.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    clean_json_str = "\n".join(lines).strip()

                parsed = json.loads(clean_json_str)
                llm_reasoning = parsed.get("reasoning") or parsed.get("diagnosis") or f"Diagnosed by {model_name}."

                sc, blk, enb, uri, act, rsn = resolve_scenario_and_methods(
                    error_code=error_code,
                    reasoning=llm_reasoning or error_description,
                    amount_paise=amount_paise,
                    payment_id=pid if pid != "SYSTEM" else "",
                )

                diag_raw = str(parsed.get("diagnosis", "UNKNOWN")).upper()
                if sc == "SUPPLIER_FAIL":
                    safe_diag = "SUPPLIER_FAIL"
                elif "BANK" in diag_raw or "GATEWAY" in diag_raw or "TIMEOUT" in diag_raw:
                    safe_diag = "BANK_DOWN"
                elif "CART" in diag_raw or "ABANDON" in diag_raw:
                    safe_diag = "CART_DROP"
                elif "BALANCE" in diag_raw or "LIMIT" in diag_raw or "INSUFFICIENT" in diag_raw:
                    safe_diag = "LOW_BALANCE"
                else:
                    safe_diag = "UNKNOWN"

                erv_data = compute_erv(amount_paise, sc, memory_context)
                split_offer = None
                if sc == "INSUFFICIENT_BALANCE" and amount_paise >= 20000:
                    upi_paise = int(amount_paise * 0.4)
                    split_offer = {
                        "upi_paise": upi_paise,
                        "postpaid_paise": amount_paise - upi_paise,
                        "note": "illustrative",
                    }

                diagnosis_obj = AIDiagnosis(
                    diagnosis=safe_diag,
                    action=act if act in ("WAIT_AND_MONITOR", "SEND_UPI_INTENT", "SWITCH_INSTRUMENT", "NEGOTIATE_HOLD", "MANDATE_RETRY", "ESCALATE_HUMAN", "IGNORE_LOW_ERV") else "ESCALATE_HUMAN",
                    reasoning=rsn,
                    confidence=float(parsed.get("confidence", 0.95)),
                    scenario=sc,
                    blocked_methods=blk,
                    enabled_methods=enb,
                    upi_intent_uri=uri,
                    erv=erv_data,
                    split_offer=split_offer,
                )
                return diagnosis_obj

            except Exception as api_err:
                last_api_err = api_err
                next_model = models_to_try[idx + 1] if idx + 1 < len(models_to_try) else None
                if next_model:
                    db.log_event(
                        correlation_id=cid,
                        payment_id=pid,
                        event_type="LLM_MODEL_SWITCH",
                        payload={"from": model_name, "to": next_model, "reason": str(api_err)},
                        reasoning=f"LLM call failed for {model_name}: {api_err}. Switching to fallback {next_model}.",
                        severity="INFO",
                    )
                    logger.info("[LLM_MODEL_SWITCH] %s -> %s (Reason: %s)", model_name, next_model, api_err)
                continue

        # If ALL models in fallback chain failed
        status_code = getattr(last_api_err, "status_code", None)
        if status_code is None and hasattr(last_api_err, "response") and hasattr(last_api_err.response, "status_code"):
            status_code = last_api_err.response.status_code
        if status_code is None:
            status_code = "UNKNOWN_STATUS"

        error_text = str(last_api_err)
        if hasattr(last_api_err, "response") and hasattr(last_api_err.response, "text") and last_api_err.response.text:
            error_text = f"{error_text} | Response Body: {last_api_err.response.text}"

        fallback_error_msg = f"FALLBACK TRIGGERED: All LLM models failed. Last error [{status_code}] - [{error_text}]. Heuristic applied."
        logger.warning("[LLM_ALL_FAILED] %s", fallback_error_msg)
        
        db.log_event(
            correlation_id=cid,
            payment_id=pid,
            event_type="LLM_ALL_FAILED",
            payload={"status_code": str(status_code), "error": str(last_api_err), "models_tried": models_to_try},
            reasoning=fallback_error_msg,
            severity="WARNING",
        )

        fallback_diag = _heuristic_fallback_classifier(
            error_code=error_code,
            error_description=error_description,
            amount_paise=amount_paise,
            payment_id=pid if pid != "SYSTEM" else "",
            memory_context=memory_context,
        )
        return fallback_diag

    # Fallback when LLM client is not configured
    return _heuristic_fallback_classifier(
        error_code=error_code,
        error_description=error_description,
        amount_paise=amount_paise,
        payment_id=pid if pid != "SYSTEM" else "",
        memory_context=memory_context,
    )


def process_failed_payment(
    payment_id: str,
    correlation_id: Optional[str] = None,
) -> Optional[AIDiagnosis]:
    """
    Orchestrates the single-payment AI evaluation workflow.

    COMPLIANCE PURPOSE:
    Fetches raw state, computes diagnosis under strict boundary rules,
    logs the AI decision into the immutable audit ledger, and increments the retry count.
    """
    cid = correlation_id or str(uuid.uuid4())
    payment = db.get_payment(payment_id)
    if not payment:
        logger.error("Payment ID %s not found in database.", payment_id)
        return None

    amount_paise = int(payment.get("amount", 0))
    error_code = payment.get("error_code") or "UNKNOWN_ERROR"
    error_desc = payment.get("error_description") or ""
    retry_count = int(payment.get("retry_count", 0))

    diagnosis = classify_and_decide(
        error_code=error_code,
        error_description=error_desc,
        retry_count=retry_count,
        correlation_id=cid,
        payment_id=payment_id,
        amount_paise=amount_paise,
        customer_ref=payment.get("user_contact"),
    )


    # Log AI Diagnosis Event to Immutable Audit Log with enriched structured metadata
    diag_payload: Dict[str, Any] = {
        "diagnosis": diagnosis.diagnosis,
        "action": diagnosis.action,
        "confidence": diagnosis.confidence,
        "retry_count_prior": retry_count,
        "scenario": diagnosis.scenario or "UNKNOWN",
        "blocked_methods": diagnosis.blocked_methods or [],
        "enabled_methods": diagnosis.enabled_methods or [],
        "reasoning": diagnosis.reasoning,
    }
    if diagnosis.upi_intent_uri:
        diag_payload["upi_intent_uri"] = diagnosis.upi_intent_uri
    if diagnosis.erv:
        diag_payload["erv"] = diagnosis.erv
    if diagnosis.split_offer:
        diag_payload["split_offer"] = diagnosis.split_offer
    if diagnosis.negotiation_draft:
        diag_payload["negotiation_draft"] = diagnosis.negotiation_draft

    db.log_event(
        correlation_id=cid,
        payment_id=payment_id,
        event_type="AI_DIAGNOSIS",
        payload=diag_payload,
        reasoning=diagnosis.reasoning,
        severity="INFO",
    )

    # Increment retry count in DB
    db.increment_retry_count(payment_id)

    return diagnosis
