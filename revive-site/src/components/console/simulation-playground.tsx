"use client";

import { useState } from "react";
import {
  Play,
  QrCode,
  Wallet,
  ServerOff,
  Smartphone,
  CalendarX,
  Ban,
  Webhook,
  HandCoins,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Terminal,
  Volume2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import PipelineGraph3D from "./three/pipeline-graph-3d";
import { PaytmQrStandee } from "./paytm-qr-standee";
import { AudioWavePlayer } from "./audio-wave-player";

interface LifecycleStep {
  step: string;
  detail: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS";
  timestamp: string;
}

interface SimulationPlaygroundProps {
  onSimulationSuccess: (paymentId: string, correlationId: string) => void;
  onDuplicateBlocked: () => void;
  onResetComplete: () => void;
}

export default function SimulationPlayground({
  onSimulationSuccess,
  onDuplicateBlocked,
  onResetComplete,
}: SimulationPlaygroundProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lifecycleLogs, setLifecycleLogs] = useState<LifecycleStep[]>([
    {
      step: "SYSTEM_READY",
      detail: "Kirana War Room listening on Razorpay S2S & Paytm Webhooks",
      severity: "INFO",
      timestamp: "Ready",
    },
  ]);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeScriptText, setActiveScriptText] = useState<string | null>(null);
  const [activeUpiUri, setActiveUpiUri] = useState<string | null>(null);
  const [activePaymentLink, setActivePaymentLink] = useState<string | null>(null);
  const [activeAmountInr, setActiveAmountInr] = useState<number>(2940);
  const [activeDiscountPct, setActiveDiscountPct] = useState<number>(0);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Helper to add lifecycle log
  const pushLifecycle = (
    step: string,
    detail: string,
    severity: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS" = "INFO"
  ) => {
    const timeStr = new Date().toLocaleTimeString("en-IN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " IST";

    setLifecycleLogs((prev) => [
      ...prev.slice(-12),
      { step, detail, severity, timestamp: timeStr },
    ]);
  };

  // 1. Generic Simulate Failure
  const handleSimulateFailure = async (
    errorCode: string,
    errorDescription: string,
    amountPaise: number,
    actionKey: string
  ) => {
    setLoadingAction(actionKey);
    pushLifecycle("INGESTING", `Simulating failure '${errorCode}' for ₹${(amountPaise / 100).toLocaleString("en-IN")}`, "INFO");

    try {
      const res = await fetch(`${API_BASE_URL}/simulate-failure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error_code: errorCode,
          error_description: errorDescription,
          amount: amountPaise,
          user_contact: "9876543210",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const pid = data.payment_id;
        const cid = data.correlation_id;
        setActivePaymentId(pid);

        pushLifecycle("DETECTED", `Payment ${pid} ingested into database`, "INFO");

        const diag = data.workflow_result?.diagnosis;
        if (diag) {
          pushLifecycle("AI_DIAGNOSIS", `${diag.diagnosis} — ${diag.action} (Conf: ${diag.confidence})`, "INFO");
        }

        const actRes = data.workflow_result?.action_result;
        if (actRes?.discount_percentage > 0) {
          setActiveDiscountPct(actRes.discount_percentage);
          pushLifecycle("DISCOUNT_APPROVED", `Dynamic discount ${actRes.discount_percentage}% applied (Authorized)`, "SUCCESS");
        }
        if (actRes?.audio_url) {
          setActiveAudioUrl(actRes.audio_url);
          if (actRes?.voice_script) setActiveScriptText(actRes.voice_script);
          pushLifecycle("VOICE_GENERATED", `Hinglish voice script synthesized via Sarvam AI / gTTS`, "INFO");
        }
        if (actRes?.payment_link) {
          setActivePaymentLink(actRes.payment_link);
          pushLifecycle("MESSAGE_SENT", `1-Click recovery link generated: ${actRes.payment_link}`, "SUCCESS");
        }
        if (actRes?.upi_intent_uri) {
          setActiveUpiUri(actRes.upi_intent_uri);
        }
        if (actRes?.final_amount_paise) {
          setActiveAmountInr(actRes.final_amount_paise / 100);
        } else {
          setActiveAmountInr(amountPaise / 100);
        }

        onSimulationSuccess(pid, cid);
      } else {
        pushLifecycle("ERROR", data.detail || "Simulation failed", "CRITICAL");
      }
    } catch (err: unknown) {
      pushLifecycle("NETWORK_ERROR", String(err), "CRITICAL");
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Paytm Kirana QR Failure (Track 3 Priority 2)
  const handlePaytmQrFailure = async () => {
    setLoadingAction("paytm-qr");
    pushLifecycle("PAYTM_INGRESS", "Incoming Paytm S2S TXN_FAILURE callback from 'Sharma General Store'", "INFO");

    try {
      const res = await fetch(`${API_BASE_URL}/simulate-paytm-qr-failure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_name: "Sharma General Store",
          amount: 300000,
          user_contact: "9876543210",
          result_code: "QR_SESSION_TIMEOUT",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const pid = data.payment_id;
        const cid = data.correlation_id;
        setActivePaymentId(pid);

        pushLifecycle("PAYTM_ADAPTER", "Paytm S2S schema NORMALIZED ✓ -> Kirana QR Drop (QR_FAIL)", "SUCCESS");
        pushLifecycle("DETECTED", `Payment ${pid} captured with Paytm Adapter tag`, "INFO");

        const diag = data.workflow_result?.diagnosis;
        if (diag) {
          pushLifecycle("AI_DIAGNOSIS", `Kirana Cart Recovery -> ${diag.action}`, "INFO");
        }

        const actRes = data.workflow_result?.action_result;
        if (actRes?.discount_percentage > 0) {
          setActiveDiscountPct(actRes.discount_percentage);
        }
        if (actRes?.audio_url) {
          setActiveAudioUrl(actRes.audio_url);
          if (actRes?.voice_script) setActiveScriptText(actRes.voice_script);
          pushLifecycle("VOICE_GENERATED", "Synthesized kirana recovery audio note via Sarvam AI", "INFO");
        }
        if (actRes?.payment_link) {
          setActivePaymentLink(actRes.payment_link);
        }
        if (actRes?.upi_intent_uri) {
          setActiveUpiUri(actRes.upi_intent_uri);
          pushLifecycle("UPI_INTENT", "Paytm / UPI 1-click intent link dispatched", "SUCCESS");
        }
        if (actRes?.final_amount_paise) {
          setActiveAmountInr(actRes.final_amount_paise / 100);
        } else {
          setActiveAmountInr(3000);
        }

        onSimulationSuccess(pid, cid);
      } else {
        pushLifecycle("ERROR", data.detail || "Paytm simulation failed", "CRITICAL");
      }
    } catch (err: unknown) {
      pushLifecycle("NETWORK_ERROR", String(err), "CRITICAL");
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Send Duplicate Webhook (Track 3 Priority 4 Idempotency Shield)
  const handleDuplicateWebhook = async () => {
    setLoadingAction("duplicate");
    pushLifecycle("WEBHOOK_INGRESS", "Dispatching duplicate signed webhook test bench...", "INFO");

    try {
      const res = await fetch(`${API_BASE_URL}/simulate-duplicate-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok) {
        pushLifecycle("HIT_1_VERIFIED", `Original payload registered -> ${data.payment_id}`, "SUCCESS");
        pushLifecycle(
          "DUPLICATE_BLOCKED",
          `Idempotency key ${data.dedup_key} — Mathematical barrier blocked redundant execution!`,
          "WARNING"
        );
        onDuplicateBlocked();
      } else {
        pushLifecycle("ERROR", "Duplicate test failed", "CRITICAL");
      }
    } catch (err: unknown) {
      pushLifecycle("NETWORK_ERROR", String(err), "CRITICAL");
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Stopping Rule Retry Cap
  const handleRetryCap = async () => {
    setLoadingAction("retry-cap");
    pushLifecycle("RETRY_INGRESS", "Simulating payment with retry_count >= 2 (Stopping Rule Test)", "INFO");

    try {
      const res = await fetch(`${API_BASE_URL}/simulate-retry-cap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok) {
        pushLifecycle("STOPPING_RULE", "Retry cap of 2 reached -> LLM call skipped to prevent harassment", "WARNING");
        pushLifecycle("ESCALATED", `Payment ${data.payment_id} escalated to human compliance officer`, "CRITICAL");
        if (data.payment_id && data.correlation_id) {
          onSimulationSuccess(data.payment_id, data.correlation_id);
        }
      }
    } catch (err: unknown) {
      pushLifecycle("NETWORK_ERROR", String(err), "CRITICAL");
    } finally {
      setLoadingAction(null);
    }
  };

  // 5. Mandate Autopay Failure
  const handleMandateFailure = async () => {
    setLoadingAction("mandate-fail");
    pushLifecycle("MANDATE_INGRESS", "Simulating recurring mandate autopay decline (Rs. 2,999)", "INFO");

    try {
      const res = await fetch(`${API_BASE_URL}/simulate-mandate-failure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok) {
        pushLifecycle("MANDATE_SCHEDULED", "Attempt 1 scheduled at 10:30 IST + 1-Click fallback link", "INFO");
        if (data.payment_id && data.correlation_id) {
          onSimulationSuccess(data.payment_id, data.correlation_id);
        }
      }
    } catch (err: unknown) {
      pushLifecycle("NETWORK_ERROR", String(err), "CRITICAL");
    } finally {
      setLoadingAction(null);
    }
  };

  // 6. Simulate Razorpay Webhook
  const handleSimulateWebhook = async () => {
    setLoadingAction("webhook");
    pushLifecycle("S2S_SIGNING", "Computing HMAC-SHA256 signature for payment.failed webhook...", "INFO");

    try {
      const res = await fetch(`${API_BASE_URL}/simulate-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok && data.signature_verified) {
        pushLifecycle("SIGNATURE_VALID", "HMAC-SHA256 signature verified constant-time ✓", "SUCCESS");
        pushLifecycle("DETECTED", `Live webhook accepted: ${data.payment_id}`, "INFO");
        if (data.payment_id) {
          onSimulationSuccess(data.payment_id, data.payment_id);
        }
      }
    } catch (err: unknown) {
      pushLifecycle("NETWORK_ERROR", String(err), "CRITICAL");
    } finally {
      setLoadingAction(null);
    }
  };

  // 7. Customer Paid (Human-in-the-loop)
  const handleCustomerPaid = async () => {
    setLoadingAction("customer-paid");
    pushLifecycle("HUMAN_IN_LOOP", "Customer completes payment via 1-click recovery link", "INFO");

    try {
      const res = await fetch(`${API_BASE_URL}/customer-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: activePaymentId || undefined }),
      });

      const data = await res.json();
      if (res.ok) {
        pushLifecycle("WEBHOOK_SIGNED", "Razorpay payment_link.paid webhook signed & dispatched", "INFO");
        pushLifecycle("RECOVERED", `Payment ${data.payment_id} marked RECOVERED in ledger!`, "SUCCESS");
        if (data.payment_id) {
          onSimulationSuccess(data.payment_id, data.payment_id);
        }
      } else {
        pushLifecycle("INFO", data.message || "No active pending payment to recover", "WARNING");
      }
    } catch (err: unknown) {
      pushLifecycle("NETWORK_ERROR", String(err), "CRITICAL");
    } finally {
      setLoadingAction(null);
    }
  };

  // 8. Reset Demo Data
  const handleResetDemo = async () => {
    setLoadingAction("reset");
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setLifecycleLogs([
          {
            step: "DEMO_RESET",
            detail: "Audit ledger, failed payments, and quota reset to clean demo state",
            severity: "SUCCESS",
            timestamp: "Reset",
          },
        ]);
        setActivePaymentId(null);
        setActiveAudioUrl(null);
        setShowResetConfirm(false);
        onResetComplete();
      }
    } catch (err: unknown) {
      pushLifecycle("RESET_ERROR", String(err), "CRITICAL");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="glass relative overflow-hidden rounded-2xl border border-stroke p-5 lg:p-6">
      {/* Three.js 3D Background Graph */}
      <PipelineGraph3D />

      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-stroke/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent shadow-[0_0_12px_rgba(0,186,242,0.25)]">
            <Play className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold tracking-tight text-white">
              SIMULATION PLAYGROUND & LIFECYCLE STREAMER
            </h3>
            <p className="mono text-[11px] text-muted">
              Live interactive failure scenarios, Paytm adapter normalization, and idempotency tests
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-critical/30 bg-critical/10 px-3 py-1 text-xs font-mono text-critical transition-colors hover:bg-critical/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>

      {/* Main Grid: Action Buttons (Left 7 cols) + Terminal Streamer (Right 5 cols) */}
      <div className="relative z-10 mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Buttons Panel */}
        <div className="space-y-4 lg:col-span-7">
          {/* Group 1: Kirana & Core Payment Failures */}
          <div>
            <span className="mono text-[10px] uppercase tracking-wider text-muted">
              Kirana & Retail Drop-offs
            </span>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                disabled={Boolean(loadingAction)}
                onClick={() =>
                  handleSimulateFailure(
                    "qr_scan_timeout",
                    "Customer scanned dynamic QR at Kirana counter but checkout expired",
                    50000,
                    "qr-scan"
                  )
                }
                className="glass group flex items-center gap-2.5 rounded-xl border border-stroke p-3 text-left transition-all hover:border-accent hover:bg-surface active:scale-98 disabled:opacity-50"
              >
                {loadingAction === "qr-scan" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <QrCode className="h-4 w-4 text-accent transition-transform group-hover:scale-110" />
                )}
                <div>
                  <p className="text-xs font-semibold text-text">QR Scan Failed</p>
                  <p className="mono text-[10px] text-muted">₹500 · Cart Drop</p>
                </div>
              </button>

              <button
                disabled={Boolean(loadingAction)}
                onClick={() =>
                  handleSimulateFailure(
                    "insufficient_funds_decline",
                    "Bank returned insufficient funds on UPI transaction",
                    450000,
                    "insufficient"
                  )
                }
                className="glass group flex items-center gap-2.5 rounded-xl border border-stroke p-3 text-left transition-all hover:border-ai hover:bg-surface active:scale-98 disabled:opacity-50"
              >
                {loadingAction === "insufficient" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-ai" />
                ) : (
                  <Wallet className="h-4 w-4 text-ai transition-transform group-hover:scale-110" />
                )}
                <div>
                  <p className="text-xs font-semibold text-text">Low Balance</p>
                  <p className="mono text-[10px] text-muted">₹4,500 · Auto Split</p>
                </div>
              </button>

              <button
                disabled={Boolean(loadingAction)}
                onClick={() =>
                  handleSimulateFailure(
                    "gateway_timeout_decline",
                    "Customer bank technical server error during UPI PIN entry",
                    120000,
                    "bank-down"
                  )
                }
                className="glass group flex items-center gap-2.5 rounded-xl border border-stroke p-3 text-left transition-all hover:border-critical hover:bg-surface active:scale-98 disabled:opacity-50"
              >
                {loadingAction === "bank-down" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-critical" />
                ) : (
                  <ServerOff className="h-4 w-4 text-critical transition-transform group-hover:scale-110" />
                )}
                <div>
                  <p className="text-xs font-semibold text-text">Bank Down</p>
                  <p className="mono text-[10px] text-muted">₹1,200 · Switch Card</p>
                </div>
              </button>
            </div>
          </div>

          {/* Group 2: Paytm Ecosystem & Adapter (Track 3 Priority 2) */}
          <div className="rounded-xl border border-accent/30 bg-accent/[0.03] p-3">
            <div className="flex items-center justify-between">
              <span className="mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                Paytm Ecosystem Bridge (Priority 2)
              </span>
              <span className="mono rounded border border-accent/40 bg-accent/10 px-1.5 py-0.2 text-[9px] font-bold text-accent">
                NORMALIZER ACTIVE
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                disabled={Boolean(loadingAction)}
                onClick={handlePaytmQrFailure}
                className="glass group flex items-center gap-2.5 rounded-xl border border-accent/40 p-3 text-left transition-all hover:border-accent hover:bg-accent/10 active:scale-98 disabled:opacity-50"
              >
                {loadingAction === "paytm-qr" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <Smartphone className="h-4 w-4 text-accent transition-transform group-hover:scale-110" />
                )}
                <div>
                  <p className="text-xs font-semibold text-white">Paytm Kirana QR Failed</p>
                  <p className="mono text-[10px] text-accent">Sharma General · ₹3,000</p>
                </div>
              </button>

              <button
                disabled={Boolean(loadingAction)}
                onClick={handlePaytmQrFailure}
                className="glass group flex items-center gap-2.5 rounded-xl border border-stroke p-3 text-left transition-all hover:border-accent hover:bg-surface active:scale-98 disabled:opacity-50"
              >
                <Webhook className="h-4 w-4 text-accent transition-transform group-hover:scale-110" />
                <div>
                  <p className="text-xs font-semibold text-text">Paytm TXN_FAILURE</p>
                  <p className="mono text-[10px] text-muted">S2S Webhook Ingestion</p>
                </div>
              </button>
            </div>
          </div>

          {/* Group 3: Autonomous Recovery & Idempotency Barrier */}
          <div>
            <span className="mono text-[10px] uppercase tracking-wider text-muted">
              Autonomous Governance & Idempotency Shield
            </span>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
              <button
                disabled={Boolean(loadingAction)}
                onClick={handleMandateFailure}
                className="glass group flex flex-col justify-between rounded-xl border border-stroke p-3 text-left transition-all hover:border-monitor hover:bg-surface active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <CalendarX className="h-4 w-4 text-monitor" />
                  <span className="mono text-[9px] text-muted">Sequencer</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-text">Mandate Autopay</p>
                <p className="mono text-[10px] text-muted">₹2,999 Decline</p>
              </button>

              <button
                disabled={Boolean(loadingAction)}
                onClick={handleRetryCap}
                className="glass group flex flex-col justify-between rounded-xl border border-stroke p-3 text-left transition-all hover:border-critical hover:bg-surface active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <Ban className="h-4 w-4 text-critical" />
                  <span className="mono text-[9px] text-muted">Cap = 2</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-text">Stopping Rule</p>
                <p className="mono text-[10px] text-muted">Skip LLM Call</p>
              </button>

              <button
                disabled={Boolean(loadingAction)}
                onClick={handleDuplicateWebhook}
                className="glass group flex flex-col justify-between rounded-xl border border-stroke p-3 text-left transition-all hover:border-recovered hover:bg-surface active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <ShieldCheck className="h-4 w-4 text-recovered" />
                  <span className="mono text-[9px] font-bold text-recovered">P4 Dedup</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-text">Send Duplicate</p>
                <p className="mono text-[10px] text-muted">Idempotency Test</p>
              </button>

              <button
                disabled={Boolean(loadingAction)}
                onClick={handleCustomerPaid}
                className="glass group flex flex-col justify-between rounded-xl border border-recovered/40 bg-recovered/5 p-3 text-left transition-all hover:border-recovered hover:bg-recovered/15 active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <HandCoins className="h-4 w-4 text-recovered" />
                  <span className="mono text-[9px] text-recovered font-semibold">Human</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-recovered">Customer Paid</p>
                <p className="mono text-[10px] text-muted">Close Webhook</p>
              </button>
            </div>
          </div>
        </div>

        {/* Terminal Lifecycle Streamer (Right 5 cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-stroke bg-black/60 p-4 font-mono text-xs backdrop-blur-md lg:col-span-5">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-bold tracking-wider text-text">
                  LIFECYCLE STREAMER
                </span>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
            </div>

            {/* Terminal Log Lines */}
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {lifecycleLogs.map((log, index) => {
                let badgeColor = "text-accent bg-accent/15 border-accent/30";
                if (log.severity === "SUCCESS") {
                  badgeColor = "text-recovered bg-recovered/15 border-recovered/30";
                } else if (log.severity === "WARNING") {
                  badgeColor = "text-monitor bg-monitor/15 border-monitor/30";
                } else if (log.severity === "CRITICAL") {
                  badgeColor = "text-critical bg-critical/15 border-critical/30";
                }

                return (
                  <div key={index} className="flex items-start gap-2 text-[11px] leading-relaxed">
                    <span className="shrink-0 text-muted/60 text-[10px]">
                      {log.timestamp}
                    </span>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.2 text-[9px] font-bold ${badgeColor}`}
                    >
                      {log.step}
                    </span>
                    <span className="text-text/90 break-words">{log.detail}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Recovery Output Bar: Audio & Paytm QR */}
          <div className="mt-3 space-y-2.5">
            {activeAudioUrl && (
              <AudioWavePlayer
                audioUrl={activeAudioUrl}
                provider="Sarvam AI (bulbul:v3)"
                scriptText={activeScriptText || undefined}
              />
            )}

            {activePaymentId && (
              <div className="flex items-center justify-between rounded-xl border border-[#00BAF2]/30 bg-[#00BAF2]/10 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00BAF2]/20 text-[#00BAF2] border border-[#00BAF2]/40">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-xs font-bold text-white">
                        Paytm Kirana QR Standee
                      </span>
                      <span className="font-mono text-[9px] text-[#00BAF2] font-bold">
                        Soundbox 4.0
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-muted truncate">
                      Scannable via GPay, PhonePe, Paytm, BHIM
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00BAF2] to-[#0088cc] px-3 py-1.5 font-display text-xs font-bold text-slate-950 transition-all hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(0,186,242,0.3)] cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Scan Standee</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scannable Paytm Standee Modal */}
      {showQrModal && activePaymentId && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute -top-3 -right-3 z-70 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 border border-white/20 text-white hover:bg-critical shadow-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <PaytmQrStandee
              paymentId={activePaymentId}
              merchantName="Sharma General Store"
              amountInr={activeAmountInr}
              discountPercentage={activeDiscountPct}
              upiIntentUri={activeUpiUri || undefined}
              paymentLink={activePaymentLink || undefined}
              onPaymentSettled={() => {
                pushLifecycle("RECOVERED", `Payment ${activePaymentId} successfully recovered & reconciled!`, "SUCCESS");
                setTimeout(() => setShowQrModal(false), 1500);
              }}
            />
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass max-w-sm rounded-2xl border border-critical/40 p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-critical" />
            <h4 className="mt-3 font-display text-lg font-bold text-white">
              Reset Demo State?
            </h4>
            <p className="mt-2 text-xs text-muted">
              This will clear recent audit logs, reset link quotas, and restore initial seed demo data.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3 font-mono text-xs">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-stroke px-4 py-2 text-text hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemo}
                className="rounded-lg bg-critical px-4 py-2 font-semibold text-white hover:bg-critical/80"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
