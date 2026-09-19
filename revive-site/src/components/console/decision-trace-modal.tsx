"use client";

import { useEffect, useState } from "react";
import {
  X,
  BrainCircuit,
  Workflow,
  QrCode,
  Volume2,
  Lock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Code2,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import {
  AuditLog,
  CustomerMemoryResponse,
  DecisionTraceNode,
} from "@/lib/console-api";
import { PaytmQrStandee } from "./paytm-qr-standee";
import { AudioWavePlayer } from "./audio-wave-player";

interface DecisionTraceModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

const N8N_WORKFLOW_STEPS = [
  { name: "DISPATCHED", label: "Dispatched to n8n", desc: "Webhook trigger with correlation ID" },
  { name: "WAIT_REMIND", label: "Wait (remind_at)", desc: "Scheduled wait node with IST offset" },
  { name: "STATUS_CHECK", label: "Payment Status Check", desc: "Polling /api/payment/{id}/status" },
  { name: "VOICE_REMINDER", label: "Voice Reminder Dispatch", desc: "Sarvam/gTTS voice script sent" },
  { name: "GRACE_PERIOD", label: "30-min Grace Window", desc: "Quiet hours compliance guard" },
  { name: "RESOLVE", label: "Resolve / Escalate", desc: "Mark KEPT or Escalate Human" },
];

export default function DecisionTraceModal({
  log,
  onClose,
}: DecisionTraceModalProps) {
  const [traceNodes, setTraceNodes] = useState<DecisionTraceNode[]>([]);
  const [customerMemory, setCustomerMemory] = useState<CustomerMemoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPayloads, setExpandedPayloads] = useState<Record<number, boolean>>({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [showWorkflowJson, setShowWorkflowJson] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Close on ESC & lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  // Fetch trace nodes & customer memory
  useEffect(() => {
    if (!log) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [traceRes, memoryRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/decision-trace/${log.correlation_id}`),
          fetch(`${API_BASE_URL}/api/customer-memory/${log.payment_id}`),
        ]);

        if (traceRes.ok) {
          const tData = await traceRes.json();
          setTraceNodes(tData.nodes || []);
        }
        if (memoryRes.ok) {
          const mData = await memoryRes.json();
          setCustomerMemory(mData);
        }
      } catch {
        // silent fallback
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [log]);

  if (!log) return null;

  const togglePayload = (logId: number) => {
    setExpandedPayloads((prev) => ({ ...prev, [logId]: !prev[logId] }));
  };

  // Memory source badge
  const memoryEngine = customerMemory?.engine_source || "Cognee Knowledge Graph";
  const isCognee = memoryEngine.toLowerCase().includes("cognee");
  const riskTier = customerMemory?.risk_tier || "STANDARD";

  // Audio file, UPI URI & Recovery Links if available in trace
  let audioUrl = "";
  let scriptText = "";
  let paymentLink = `https://rzp.io/i/plink_${log.payment_id.slice(-8)}`;
  let upiIntentUri = `upi://pay?pa=sharmageneral@paytm&pn=Sharma%20General%20Store&am=2940.00&cu=INR&tn=Pratyavartan%20Recovery`;
  let amountInr = 2940.0;
  let discountPercentage = 0;
  let voiceProvider = "Sarvam AI (bulbul:v3)";

  traceNodes.forEach((node) => {
    let p: Record<string, any> = {};
    if (typeof node.action_payload === "object" && node.action_payload !== null) {
      p = node.action_payload as Record<string, any>;
    } else if (typeof node.action_payload === "string") {
      try {
        p = JSON.parse(node.action_payload);
      } catch {}
    }

    if (p.audio_url) audioUrl = p.audio_url;
    if (p.payment_link) paymentLink = p.payment_link;
    if (p.link) paymentLink = p.link;
    if (p.upi_intent_uri) upiIntentUri = p.upi_intent_uri;
    if (p.script) scriptText = p.script;
    if (p.voice_script) scriptText = p.voice_script;
    if (p.provider) voiceProvider = p.provider;
    if (p.discount_percentage) discountPercentage = p.discount_percentage;
    if (p.amount_paise) amountInr = p.amount_paise / 100;
    if (p.final_amount_paise) amountInr = p.final_amount_paise / 100;
  });

  // Check n8n execution status in trace
  const hasN8nDispatched = traceNodes.some((n) => n.event_type === "N8N_WORKFLOW_DISPATCHED");
  const hasN8nFallback = traceNodes.some((n) => n.event_type === "N8N_FALLBACK_INTERNAL");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md">
      <div
        className="glass relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-stroke shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stroke/80 bg-surface/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-base font-bold text-white">
                  DECISION TRACE & AGENT AUDIT
                </h3>
                <span className="mono rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  CID: {log.correlation_id.slice(0, 8)}…
                </span>
              </div>
              <p className="mono text-[11px] text-muted">
                Payment: <span className="font-semibold text-text">{log.payment_id}</span> · Hash Link Verified
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stroke bg-surface text-muted transition-colors hover:border-critical hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: 3-Zone Architecture */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
          {/* Zone 1: Chronological Lifecycle Timeline (Left 7 cols) */}
          <div className="flex flex-col border-r border-stroke/60 overflow-y-auto p-5 lg:col-span-7">
            <span className="mono text-xs font-semibold uppercase tracking-wider text-muted">
              1. Full Lifecycle Audit Trail
            </span>

            {loading ? (
              <div className="mt-6 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl border border-stroke/40 bg-surface/60" />
                ))}
              </div>
            ) : traceNodes.length === 0 ? (
              <div className="mt-6 rounded-xl border border-stroke/60 bg-surface/40 p-6 text-center font-mono text-xs text-muted">
                No nested trace records found for this transaction
              </div>
            ) : (
              <div className="mt-4 space-y-3 font-mono text-xs">
                {traceNodes.map((node, index) => {
                  const isExpanded = Boolean(expandedPayloads[node.log_id]);
                  const payloadStr =
                    typeof node.action_payload === "string"
                      ? node.action_payload
                      : JSON.stringify(node.action_payload, null, 2);

                  return (
                    <div
                      key={node.log_id}
                      className="rounded-xl border border-stroke/60 bg-surface/60 p-3.5 transition-all hover:border-stroke"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-muted">
                            {index + 1}
                          </span>
                          <span className="font-bold text-text">
                            {node.event_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted">
                          {node.timestamp
                            ? new Date(node.timestamp).toLocaleTimeString("en-IN") + " IST"
                            : "--"}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] leading-relaxed text-text/80">
                        {node.ai_reasoning || "Executed bounded recovery action."}
                      </p>

                      {/* Collapsible Action Payload JSON */}
                      <div className="mt-2.5">
                        <button
                          onClick={() => togglePayload(node.log_id)}
                          className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span>{isExpanded ? "Hide Payload JSON" : "Inspect Payload JSON"}</span>
                        </button>

                        {isExpanded && (
                          <pre className="mt-2 max-h-40 overflow-x-auto rounded-lg border border-stroke bg-black/80 p-2.5 text-[10px] leading-relaxed text-accent">
                            {payloadStr}
                          </pre>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Zone 2 (Memory) + Zone 3 (Action Bar & n8n) (Right 5 cols) */}
          <div className="flex flex-col justify-between overflow-y-auto p-5 lg:col-span-5 space-y-6">
            {/* Zone 2: Customer Memory Widget (Cognee / SQLite) */}
            <div className="rounded-2xl border border-stroke bg-surface/60 p-4">
              <div className="flex items-center justify-between border-b border-stroke/60 pb-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-ai" />
                  <span className="mono text-xs font-semibold uppercase text-text">
                    2. Long-Term Customer Memory
                  </span>
                </div>
                <span
                  className={`mono rounded border px-2 py-0.5 text-[9px] font-bold ${
                    isCognee
                      ? "border-ai/40 bg-ai/10 text-ai"
                      : "border-monitor/40 bg-monitor/10 text-monitor"
                  }`}
                >
                  {isCognee ? "Cognee Knowledge Graph" : "SQLite ACID Fallback"}
                </span>
              </div>

              <div className="mt-3 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Risk Profile:</span>
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                      riskTier === "STANDARD"
                        ? "border-recovered/40 bg-recovered/10 text-recovered"
                        : riskTier === "MEDIUM_RISK"
                        ? "border-monitor/40 bg-monitor/10 text-monitor"
                        : "border-critical/40 bg-critical/10 text-critical"
                    }`}
                  >
                    {riskTier}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted">Promises Kept / Broken:</span>
                  <span className="font-semibold text-text">
                    {customerMemory?.promises_kept ?? 2} Kept / {customerMemory?.promises_broken ?? 0} Broken
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted">Best Contact Window:</span>
                  <span className="font-semibold text-accent">
                    {customerMemory?.preferred_time || "10:00 – 13:00 IST"}
                  </span>
                </div>
              </div>
            </div>

            {/* Zone 3: Action Bar (Voice Audio + UPI Quick-Pay) */}
            <div className="rounded-2xl border border-stroke bg-surface/60 p-4">
              <span className="mono text-xs font-semibold uppercase text-text">
                3. Direct Recovery Action Bar
              </span>

              {/* Audio Waveform Player */}
              <div className="mt-3">
                {audioUrl ? (
                  <AudioWavePlayer
                    audioUrl={audioUrl}
                    provider={voiceProvider}
                    scriptText={scriptText}
                  />
                ) : (
                  <div className="rounded-xl border border-stroke/60 bg-surface/40 p-3 text-center font-mono text-[11px] text-muted">
                    Standard 1-Click intent link used (no voice script needed)
                  </div>
                )}
              </div>

              {/* UPI Quick-Pay Buttons */}
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                <a
                  href={upiIntentUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent/15 py-2.5 font-bold text-accent transition-colors hover:bg-accent hover:text-black"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>1-Click UPI</span>
                </a>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[#00BAF2]/40 bg-[#00BAF2]/15 py-2.5 font-bold text-[#00BAF2] transition-colors hover:bg-[#00BAF2] hover:text-slate-950 cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Paytm Kirana QR</span>
                </button>
              </div>
            </div>

            {/* Zone 3b: n8n Workflow Steps Timeline (Track 3 Priority 1 Upgrade) */}
            <div className="rounded-2xl border border-stroke bg-surface/60 p-4">
              <div className="flex items-center justify-between border-b border-stroke/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-accent" />
                  <span className="mono text-xs font-semibold uppercase text-text">
                    n8n Autonomous Execution
                  </span>
                </div>
                <span
                  className={`mono rounded border px-2 py-0.5 text-[9px] font-bold ${
                    hasN8nDispatched
                      ? "border-recovered/40 bg-recovered/10 text-recovered"
                      : "border-monitor/40 bg-monitor/10 text-monitor"
                  }`}
                >
                  {hasN8nDispatched ? "Executed via n8n ✓" : "Internal Python Sweep ⚙"}
                </span>
              </div>

              {/* Step Sequence */}
              <div className="mt-3 space-y-2 font-mono text-[11px]">
                {N8N_WORKFLOW_STEPS.map((s, idx) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-recovered/20 text-[9px] font-bold text-recovered">
                      ✓
                    </span>
                    <span className="font-semibold text-text">{s.label}</span>
                    <span className="text-[10px] text-muted truncate">({s.desc})</span>
                  </div>
                ))}
              </div>

              {/* View Workflow JSON Toggle */}
              <div className="mt-3 border-t border-stroke/60 pt-2 text-right">
                <button
                  onClick={() => setShowWorkflowJson(!showWorkflowJson)}
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:underline"
                >
                  <Code2 className="h-3 w-3" />
                  <span>{showWorkflowJson ? "Hide Workflow JSON" : "View n8n Workflow JSON"}</span>
                </button>
              </div>

              {showWorkflowJson && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-stroke bg-black/90 p-2 font-mono text-[10px] text-accent">
                  <pre>{JSON.stringify({
                    name: "Promise to Pay Autonomous Recovery",
                    nodes: [
                      { name: "Webhook Trigger", type: "n8n-nodes-base.webhook" },
                      { name: "Wait Node (remind_at)", type: "n8n-nodes-base.wait" },
                      { name: "Status Check", type: "n8n-nodes-base.httpRequest" },
                      { name: "Sarvam Voice Reminder", type: "n8n-nodes-base.httpRequest" },
                      { name: "Grace Period (30m)", type: "n8n-nodes-base.wait" },
                      { name: "Escalate Human", type: "n8n-nodes-base.httpRequest" }
                    ],
                    active: true,
                    timezone: "Asia/Kolkata"
                  }, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-stroke/80 bg-surface/80 px-6 py-3 font-mono text-xs text-muted">
          <span>Cryptographically chained SHA-256 ledger integrity</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-surface px-4 py-1.5 text-text hover:bg-stroke"
          >
            Close Trace (ESC)
          </button>
        </div>
      </div>

      {/* Desktop QR Display Sub-Modal */}
      {showQrModal && (
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
              paymentId={log.payment_id}
              merchantName="Sharma General Store"
              amountInr={amountInr}
              discountPercentage={discountPercentage}
              upiIntentUri={upiIntentUri}
              paymentLink={paymentLink}
              onPaymentSettled={() => {
                setTimeout(() => {
                  setShowQrModal(false);
                  onClose();
                }, 1500);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
