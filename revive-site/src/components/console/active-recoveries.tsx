"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Calendar,
  Volume2,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  RotateCw,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import { MetricsResponse, PendingRecovery } from "@/lib/console-api";

interface ActiveRecoveriesProps {
  metrics?: MetricsResponse;
  pendingRecoveries: PendingRecovery[];
  onActionComplete: () => void;
}

export default function ActiveRecoveries({
  metrics,
  pendingRecoveries,
  onActionComplete,
}: ActiveRecoveriesProps) {
  const [now, setNow] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [soundboxConfirmations, setSoundboxConfirmations] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active soundbox confirmations
  useEffect(() => {
    const fetchSoundbox = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/soundbox/active-confirmations`);
        if (res.ok) {
          const data = await res.json();
          setSoundboxConfirmations(data.confirmations || []);
        }
      } catch {
        // silent fallback
      }
    };
    fetchSoundbox();
    const interval = setInterval(fetchSoundbox, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleForcePromiseCheck = async () => {
    setActionLoading("promise-check");
    try {
      await fetch(`${API_BASE_URL}/dev/force-promise-check`, { method: "POST" });
      onActionComplete();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceMandate = async (paymentId?: string) => {
    setActionLoading(`mandate-${paymentId || "next"}`);
    try {
      await fetch(`${API_BASE_URL}/dev/force-mandate-attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      onActionComplete();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleSoundboxRespond = async (paymentId: string, choice: string) => {
    setActionLoading(`soundbox-${paymentId}`);
    try {
      await fetch(`${API_BASE_URL}/api/soundbox/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, choice }),
      });
      setSoundboxConfirmations((prev) =>
        prev.filter((item) => item.payment_id !== paymentId)
      );
      onActionComplete();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const promiseTotal = metrics?.promise_metrics?.promises_total ?? 0;
  const promiseKept = metrics?.promise_metrics?.promises_kept ?? 0;
  const mandateTotal = metrics?.mandate_metrics?.total ?? 0;
  const mandatePending = metrics?.mandate_metrics?.pending ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. Promise-to-Pay Tracker */}
      <div className="glass relative flex flex-col justify-between rounded-2xl border border-stroke p-5">
        <div>
          <div className="flex items-center justify-between border-b border-stroke/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-monitor/10 text-monitor">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-semibold text-white">
                  PROMISE-TO-PAY TRACKER
                </h4>
                <p className="mono text-[10px] text-muted">
                  RBI 9–21 IST Window Auto Clamping
                </p>
              </div>
            </div>

            <button
              disabled={Boolean(actionLoading)}
              onClick={handleForcePromiseCheck}
              className="flex items-center gap-1 rounded border border-monitor/30 bg-monitor/10 px-2 py-0.5 text-[10px] font-mono text-monitor hover:bg-monitor/20"
              title="Force Check Overdue Promises"
            >
              <RotateCw className={`h-3 w-3 ${actionLoading === "promise-check" ? "animate-spin" : ""}`} />
              <span>Sweep</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-xs">
            <div className="rounded-lg border border-stroke/60 bg-surface/60 p-2">
              <p className="text-[10px] text-muted">Total</p>
              <p className="font-bold text-text">{promiseTotal}</p>
            </div>
            <div className="rounded-lg border border-stroke/60 bg-surface/60 p-2">
              <p className="text-[10px] text-recovered">Kept</p>
              <p className="font-bold text-recovered">{promiseKept}</p>
            </div>
            <div className="rounded-lg border border-stroke/60 bg-surface/60 p-2">
              <p className="text-[10px] text-monitor">Active</p>
              <p className="font-bold text-monitor">
                {metrics?.promise_metrics?.promises_followed_up ?? 0}
              </p>
            </div>
          </div>

          {/* Pending items list */}
          <div className="mt-3 max-h-36 space-y-2 overflow-y-auto">
            {pendingRecoveries.length === 0 ? (
              <p className="mono py-4 text-center text-xs text-muted">
                No active promises awaiting follow-up
              </p>
            ) : (
              pendingRecoveries.slice(0, 3).map((item) => (
                <div
                  key={item.payment_id}
                  className="flex items-center justify-between rounded-xl border border-stroke/60 bg-surface/40 p-2.5 font-mono text-xs"
                >
                  <div className="truncate">
                    <span className="font-semibold text-text truncate">
                      {item.payment_id}
                    </span>
                    <p className="text-[10px] text-muted">
                      ₹{(item.amount / 100).toLocaleString("en-IN")} · {item.error_code}
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-monitor/40 bg-monitor/10 px-2 py-0.5 text-[10px] font-semibold text-monitor">
                    Due in 14m
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-2 text-[10px] font-mono text-muted">
          Auto follow-up voice notes fire +30m post promise window
        </div>
      </div>

      {/* 2. Mandate Retry Sequencer */}
      <div className="glass relative flex flex-col justify-between rounded-2xl border border-stroke p-5">
        <div>
          <div className="flex items-center justify-between border-b border-stroke/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/10 text-ai">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-semibold text-white">
                  MANDATE RETRY SEQUENCER
                </h4>
                <p className="mono text-[10px] text-muted">
                  3-Attempt Auto Rescheduling
                </p>
              </div>
            </div>

            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleForceMandate()}
              className="flex items-center gap-1 rounded border border-ai/30 bg-ai/10 px-2 py-0.5 text-[10px] font-mono text-ai hover:bg-ai/20"
              title="Force Next Pending Mandate Attempt"
            >
              <Zap className="h-3 w-3" />
              <span>Force Attempt</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center font-mono text-xs">
            <div className="rounded-lg border border-stroke/60 bg-surface/60 p-2">
              <p className="text-[10px] text-muted">Total Scheduled</p>
              <p className="font-bold text-text">{mandateTotal}</p>
            </div>
            <div className="rounded-lg border border-stroke/60 bg-surface/60 p-2">
              <p className="text-[10px] text-ai">Pending Queue</p>
              <p className="font-bold text-ai">{mandatePending}</p>
            </div>
          </div>

          {/* Mandate Schedule Item Preview */}
          <div className="mt-3 rounded-xl border border-ai/25 bg-ai/[0.04] p-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-text">Attempt 1</span>
              <span className="text-ai">Tomorrow 10:30 IST</span>
            </div>
            <p className="mt-1 text-[10px] text-muted">
              Auto-dispatches 1-Click WhatsApp payment link if bank declines debit.
            </p>
          </div>
        </div>

        <div className="mt-2 text-[10px] font-mono text-muted">
          Cancels remaining scheduled attempts automatically on payment closure
        </div>
      </div>

      {/* 3. Soundbox Whisper v2 Approvals */}
      <div className="glass relative flex flex-col justify-between rounded-2xl border border-stroke p-5">
        <div>
          <div className="flex items-center justify-between border-b border-stroke/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Volume2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-semibold text-white">
                  SOUNDBOX WHISPER V2
                </h4>
                <p className="mono text-[10px] text-muted">
                  Kirana Merchant Khata Approvals
                </p>
              </div>
            </div>
            <span className="mono rounded border border-accent/40 bg-accent/10 px-1.5 py-0.2 text-[10px] font-semibold text-accent">
              TWO-WAY
            </span>
          </div>

          <div className="mt-3 max-h-48 space-y-2.5 overflow-y-auto pr-1">
            {soundboxConfirmations.length === 0 ? (
              <div className="rounded-xl border border-stroke/60 bg-surface/40 p-4 text-center">
                <CheckCircle2 className="mx-auto h-5 w-5 text-recovered/70" />
                <p className="mt-1.5 font-mono text-xs text-text">
                  All Recoveries Reconciled
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">
                  Soundbox confirmations automatically pop up on recovery.
                </p>
              </div>
            ) : (
              soundboxConfirmations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-accent/30 bg-accent/[0.04] p-3 font-mono text-xs"
                >
                  <p className="text-[11px] font-semibold text-text">
                    &ldquo;{item.script}&rdquo;
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      disabled={Boolean(actionLoading)}
                      onClick={() => handleSoundboxRespond(item.payment_id, "add_to_khata")}
                      className="flex-1 rounded-lg bg-recovered/20 border border-recovered/40 py-1 text-center font-bold text-recovered hover:bg-recovered/30"
                    >
                      Add to Khata ✓
                    </button>
                    <button
                      disabled={Boolean(actionLoading)}
                      onClick={() => handleSoundboxRespond(item.payment_id, "ignore")}
                      className="rounded-lg border border-stroke px-3 py-1 text-muted hover:text-text"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-2 text-[10px] font-mono text-muted">
          Merchant voice oversight retains final audit authority
        </div>
      </div>
    </div>
  );
}
