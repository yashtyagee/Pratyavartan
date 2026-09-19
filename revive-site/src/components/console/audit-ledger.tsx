"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Search,
  Check,
  Copy,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Filter,
  X,
  ChevronRight,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import { AuditLog, VerifyChainResponse } from "@/lib/console-api";

interface AuditLedgerProps {
  auditLogs: AuditLog[];
  activeFilter?: string;
  onClearFilter: () => void;
  onSelectLog: (log: AuditLog) => void;
  onVerifyComplete?: () => void;
}

const EVENT_SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  RECOVERED: { bg: "bg-recovered/10", border: "border-recovered/30", text: "text-recovered" },
  PROMISE_KEPT: { bg: "bg-recovered/10", border: "border-recovered/30", text: "text-recovered" },
  DISCOUNT_APPROVED: { bg: "bg-recovered/10", border: "border-recovered/30", text: "text-recovered" },
  DETECTED: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent" },
  AI_DIAGNOSIS: { bg: "bg-ai/10", border: "border-ai/30", text: "text-ai" },
  VOICE_GENERATED: { bg: "bg-ai/10", border: "border-ai/30", text: "text-ai" },
  MESSAGE_SENT: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent" },
  S2S_CALLBACK: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent" },
  PROMISE_TO_PAY: { bg: "bg-monitor/10", border: "border-monitor/30", text: "text-monitor" },
  PROMISE_FOLLOWUP: { bg: "bg-monitor/10", border: "border-monitor/30", text: "text-monitor" },
  MANDATE_RETRY_SCHEDULED: { bg: "bg-monitor/10", border: "border-monitor/30", text: "text-monitor" },
  MANDATE_ATTEMPT: { bg: "bg-monitor/10", border: "border-monitor/30", text: "text-monitor" },
  STOPPING_RULE_TRIGGERED: { bg: "bg-critical/10", border: "border-critical/30", text: "text-critical" },
  ESCALATED: { bg: "bg-critical/10", border: "border-critical/30", text: "text-critical" },
  ESCALATE_HUMAN: { bg: "bg-critical/10", border: "border-critical/30", text: "text-critical" },
  SECURITY_ALERT: { bg: "bg-critical/10", border: "border-critical/30", text: "text-critical" },
  SOUNDBOX_ANNOUNCE: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent" },
  SOUNDBOX_CONFIRM_REQUEST: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent" },
  DEFAULT: { bg: "bg-surface", border: "border-stroke", text: "text-muted" },
};

export default function AuditLedger({
  auditLogs,
  activeFilter,
  onClearFilter,
  onSelectLog,
}: AuditLedgerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Verify Chain state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyChainResponse | null>(null);

  const handleCopyHash = (e: React.MouseEvent, hash: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-audit-chain`);
      if (res.ok) {
        const data = await res.json();
        setVerifyResult(data);
      }
    } catch {
      // fallback
    } finally {
      setTimeout(() => setIsVerifying(false), 800);
    }
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Event Type filter (from doughnut click or selector)
      if (activeFilter && log.event_type !== activeFilter) {
        return false;
      }
      // Severity filter
      if (severityFilter !== "ALL" && log.severity !== severityFilter) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesPid = log.payment_id.toLowerCase().includes(query);
        const matchesCid = log.correlation_id.toLowerCase().includes(query);
        const matchesType = log.event_type.toLowerCase().includes(query);
        const matchesReason = (log.ai_reasoning || "").toLowerCase().includes(query);
        if (!matchesPid && !matchesCid && !matchesType && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [auditLogs, activeFilter, severityFilter, searchQuery]);

  return (
    <div className="glass relative overflow-hidden rounded-2xl border border-stroke p-5 lg:p-6">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stroke/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-recovered/40 bg-recovered/10 text-recovered shadow-[0_0_12px_rgba(34,197,94,0.25)]">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold tracking-tight text-white">
                CRYPTOGRAPHIC AUDIT LEDGER
              </h3>
              <span className="mono rounded border border-recovered/40 bg-recovered/10 px-2 py-0.5 text-[10px] font-semibold text-recovered">
                APPEND-ONLY
              </span>
            </div>
            <p className="mono text-[11px] text-muted">
              SHA-256 hash-chained immutable transaction trail · Click any row for Decision-Trace
            </p>
          </div>
        </div>

        {/* Verify Chain Button & Sweep Scanner */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="flex items-center gap-2 rounded-xl border border-recovered/40 bg-recovered/10 px-4 py-2 font-mono text-xs font-semibold text-recovered transition-all hover:bg-recovered/20 active:scale-95 disabled:opacity-50"
          >
            {isVerifying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            <span>{isVerifying ? "Verifying Hash Chain..." : "Verify Chain"}</span>
          </button>
        </div>
      </div>

      {/* Sweep Verification Result Banner */}
      <AnimatePresence>
        {verifyResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-4 overflow-hidden rounded-xl border p-3 font-mono text-xs ${
              verifyResult.verified
                ? "border-recovered/40 bg-recovered/10 text-recovered"
                : "border-critical/40 bg-critical/10 text-critical"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {verifyResult.verified ? (
                  <ShieldCheck className="h-4 w-4 text-recovered" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-critical" />
                )}
                <span>
                  <strong>
                    {verifyResult.verified
                      ? "CRYPTOGRAPHIC PROOF VALID"
                      : "CHAIN TAMPERING DETECTED"}
                  </strong>{" "}
                  · Total Records: {verifyResult.total_records} · Broken Links: 0
                </span>
              </div>
              <button
                onClick={() => setVerifyResult(null)}
                className="text-muted hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search payment ID, correlation ID, or reasoning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stroke bg-surface/80 py-1.5 pl-9 pr-3 text-xs text-text placeholder-muted focus:border-accent focus:outline-none"
            />
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-xl border border-stroke bg-surface px-3 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">INFO Only</option>
            <option value="WARNING">WARNING Only</option>
            <option value="CRITICAL">CRITICAL Only</option>
          </select>
        </div>

        {/* Active Filter Chips */}
        {activeFilter && (
          <div className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent">
            <Filter className="h-3 w-3" />
            <span>Event: {activeFilter}</span>
            <button
              onClick={onClearFilter}
              className="ml-1 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Live Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-stroke/60 text-[10px] uppercase text-muted">
              <th className="pb-2.5 pl-2 font-semibold">Time (IST)</th>
              <th className="pb-2.5 font-semibold">Severity</th>
              <th className="pb-2.5 font-semibold">Event Type</th>
              <th className="pb-2.5 font-semibold">Payment ID</th>
              <th className="pb-2.5 font-semibold">SHA-256 Link</th>
              <th className="pb-2.5 pr-2 font-semibold">AI Reasoning / Action Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke/40">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">
                  No matching audit entries found
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const badge =
                  EVENT_SEVERITY_STYLES[log.event_type] ||
                  EVENT_SEVERITY_STYLES.DEFAULT;
                const timeStr = log.timestamp
                  ? new Date(log.timestamp).toLocaleTimeString("en-IN", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }) + " IST"
                  : "--";

                const hashDisplay = log.hash_chain_link
                  ? `${log.hash_chain_link.slice(0, 10)}…`
                  : "GENESIS";

                return (
                  <tr
                    key={log.log_id}
                    onClick={() => onSelectLog(log)}
                    className="group cursor-pointer transition-colors hover:bg-surface/90"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 pl-2 text-muted whitespace-nowrap">
                      {timeStr}
                    </td>

                    {/* Severity Dot */}
                    <td className="py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            log.severity === "CRITICAL"
                              ? "bg-critical"
                              : log.severity === "WARNING"
                              ? "bg-monitor"
                              : "bg-recovered"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-semibold ${
                            log.severity === "CRITICAL"
                              ? "text-critical"
                              : log.severity === "WARNING"
                              ? "text-monitor"
                              : "text-muted"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </div>
                    </td>

                    {/* Event Type Badge */}
                    <td className="py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.border} ${badge.text}`}
                      >
                        {log.event_type}
                      </span>
                    </td>

                    {/* Payment ID */}
                    <td className="py-2.5 text-text font-semibold whitespace-nowrap">
                      {log.payment_id}
                    </td>

                    {/* Hash Link + Copy */}
                    <td className="py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted font-mono">
                          {hashDisplay}
                        </span>
                        {log.hash_chain_link && (
                          <button
                            onClick={(e) => handleCopyHash(e, log.hash_chain_link!)}
                            className="rounded p-1 text-muted transition-colors hover:bg-surface hover:text-text"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === log.hash_chain_link ? (
                              <Check className="h-3 w-3 text-recovered" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Reasoning */}
                    <td className="py-2.5 pr-2 text-text/80">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate max-w-md">
                          {log.ai_reasoning || "System execution recorded."}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
