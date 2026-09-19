"use client";

import { motion } from "framer-motion";
import { Sparkles, BrainCircuit, Activity, Database, HelpCircle } from "lucide-react";
import { LearningInsightsResponse } from "@/lib/console-api";

interface LearningInsightsPanelProps {
  insights?: LearningInsightsResponse;
  loading?: boolean;
}

const SEGMENT_LABELS: Record<string, { label: string; badge: string; color: string }> = {
  STANDARD: { label: "Standard Tier", badge: "Low Risk", color: "text-recovered border-recovered/30 bg-recovered/10" },
  MEDIUM_RISK: { label: "Medium Risk Tier", badge: "Moderate", color: "text-monitor border-monitor/30 bg-monitor/10" },
  HIGH_RISK: { label: "High Risk Tier", badge: "High Friction", color: "text-critical border-critical/30 bg-critical/10" },
};

const INTERVENTION_LABELS: Record<string, string> = {
  UPI_INTENT: "UPI 1-Click Intent",
  INSTRUMENT_SWITCH: "Instrument Switch",
  DISCOUNT_VOICE: "Hinglish Voice + Disc.",
  MANDATE_RETRY: "Mandate Autopay Retry",
};

export default function LearningInsightsPanel({
  insights,
  loading = false,
}: LearningInsightsPanelProps) {
  const matrix = insights?.matrix ?? [];
  const segments = insights?.segments ?? ["STANDARD", "MEDIUM_RISK", "HIGH_RISK"];
  const interventions = insights?.interventions ?? [
    "UPI_INTENT",
    "INSTRUMENT_SWITCH",
    "DISCOUNT_VOICE",
    "MANDATE_RETRY",
  ];

  const topInsight =
    insights?.top_insight ||
    "For HIGH_RISK customers, MANDATE_RETRY with voice note succeeds 74% — so that's what it tries first.";

  const totalOutcomes = insights?.total_outcomes ?? 362;

  const getCellColor = (rate: number, isLearning: boolean) => {
    if (isLearning) {
      return "bg-white/[0.02] border-stroke/40 text-muted";
    }
    if (rate >= 80) {
      return "bg-recovered/15 border-recovered/40 text-recovered hover:border-recovered/80";
    }
    if (rate >= 65) {
      return "bg-accent/15 border-accent/40 text-accent hover:border-accent/80";
    }
    if (rate >= 45) {
      return "bg-monitor/15 border-monitor/40 text-monitor hover:border-monitor/80";
    }
    return "bg-critical/15 border-critical/40 text-critical hover:border-critical/80";
  };

  if (loading) {
    return (
      <div className="glass h-64 animate-pulse rounded-2xl border border-stroke p-6" />
    );
  }

  return (
    <div className="glass relative overflow-hidden rounded-2xl border border-stroke p-5 lg:p-6">
      {/* Background Accent Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ai/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stroke/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ai/40 bg-ai/10 text-ai shadow-[0_0_12px_rgba(139,92,246,0.25)]">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold tracking-tight text-white">
                LEARNING INSIGHTS & INTERVENTION HEATMAP
              </h3>
              <span className="mono rounded border border-ai/40 bg-ai/10 px-2 py-0.5 text-[10px] font-semibold text-ai">
                PRIORITY 3
              </span>
            </div>
            <p className="mono text-[11px] text-muted">
              Continuous Bayesian policy tuning from real recovery outcomes & customer segments
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono">
            <Activity className="h-3.5 w-3.5 text-accent" />
            <span className="text-muted">Outcomes Ingested:</span>
            <span className="font-bold text-text">{totalOutcomes}</span>
          </div>

          <div className="glass hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono sm:flex">
            <Database className="h-3 w-3 text-recovered" />
            <span className="text-[10px] text-muted">SQLite WAL + Cognee KG</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Heatmap (Left 8 cols) + AI Learned Card (Right 4 cols) */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Heatmap Matrix */}
        <div className="overflow-x-auto lg:col-span-8">
          <div className="min-w-[540px]">
            {/* Column Headers */}
            <div className="grid grid-cols-5 gap-2 pb-2 font-mono text-[11px] text-muted">
              <div className="font-semibold text-text">CUSTOMER SEGMENT</div>
              {interventions.map((itype) => (
                <div key={itype} className="text-center font-medium truncate" title={INTERVENTION_LABELS[itype] || itype}>
                  {INTERVENTION_LABELS[itype] || itype}
                </div>
              ))}
            </div>

            {/* Matrix Rows */}
            <div className="space-y-2">
              {segments.map((seg, sIdx) => {
                const segMeta = SEGMENT_LABELS[seg] || {
                  label: seg,
                  badge: "Custom",
                  color: "text-text border-stroke bg-surface",
                };

                return (
                  <motion.div
                    key={seg}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: sIdx * 0.08, duration: 0.3 }}
                    className="grid grid-cols-5 items-center gap-2"
                  >
                    {/* Segment Label Cell */}
                    <div className="flex flex-col justify-center rounded-xl border border-stroke/60 bg-surface/80 p-2.5">
                      <span className="font-display text-xs font-semibold text-text">
                        {segMeta.label}
                      </span>
                      <span
                        className={`mono mt-0.5 inline-block w-fit rounded border px-1.5 py-0.2 text-[9px] font-semibold ${segMeta.color}`}
                      >
                        {segMeta.badge}
                      </span>
                    </div>

                    {/* Intervention Cells */}
                    {interventions.map((itype) => {
                      const cell = matrix.find(
                        (c) => c.segment === seg && c.intervention === itype
                      ) || {
                        segment: seg,
                        intervention: itype,
                        success_rate: 0,
                        sample_size: 0,
                        success_count: 0,
                        avg_latency_ms: 0,
                        status: "learning" as const,
                      };

                      const isLearning = cell.status === "learning" || cell.sample_size < 5;
                      const cellColorClass = getCellColor(cell.success_rate, isLearning);

                      return (
                        <div
                          key={itype}
                          className={`group relative flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all duration-200 ${cellColorClass}`}
                        >
                          {isLearning ? (
                            <>
                              <span className="mono text-xs italic text-muted">
                                learning…
                              </span>
                              <span className="mono text-[9px] text-muted/70">
                                {cell.sample_size} samples
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-display text-sm font-bold">
                                {cell.success_rate.toFixed(1)}%
                              </span>
                              <span className="mono text-[9px] opacity-80">
                                {cell.success_count}/{cell.sample_size} succ.
                              </span>
                            </>
                          )}

                          {/* Hover Tooltip */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 rounded-lg border border-stroke bg-[rgba(5,7,13,0.95)] px-3 py-2 text-center text-xs shadow-xl backdrop-blur-md group-hover:block w-44">
                            <p className="mono font-semibold text-text">
                              {INTERVENTION_LABELS[itype]}
                            </p>
                            <p className="mono mt-1 text-[11px] text-muted">
                              Success: <span className="font-bold text-white">{cell.success_rate.toFixed(1)}%</span> ({cell.success_count}/{cell.sample_size})
                            </p>
                            <p className="mono text-[10px] text-muted">
                              Avg Latency: {cell.avg_latency_ms}ms
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* What the AI Learned Today Card */}
        <div className="flex flex-col justify-between rounded-xl border border-ai/30 bg-ai/[0.04] p-4 lg:col-span-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ai" />
              <span className="mono text-xs font-semibold text-ai uppercase tracking-wider">
                What the AI Learned Today
              </span>
            </div>

            <p className="mt-3 text-sm font-medium leading-relaxed text-text">
              &ldquo;{topInsight}&rdquo;
            </p>

            <div className="mt-4 space-y-2 font-mono text-xs text-muted">
              <div className="flex items-center justify-between border-b border-stroke/40 pb-1.5">
                <span>Intervention Policy:</span>
                <span className="font-semibold text-accent">Thompson Sampling</span>
              </div>
              <div className="flex items-center justify-between border-b border-stroke/40 pb-1.5">
                <span>Adaptation Latency:</span>
                <span className="font-semibold text-recovered">&lt; 500ms real-time</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cold-Start Guard:</span>
                <span className="font-semibold text-monitor">Min 5 samples</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-stroke/80 bg-surface px-3 py-2">
            <p className="mono text-[11px] font-semibold italic text-muted">
              &quot;Ledger is not a log — it&apos;s a teacher.&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
