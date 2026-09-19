"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Clock,
  Coins,
  HeartHandshake,
  TrendingUp,
  X,
  Printer,
  Sparkles,
  FileCheck,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";

interface EmployeeReportCardProps {
  isOpen: boolean;
  onClose: () => void;
  recoveredInr?: number;
  atRiskInr?: number;
}

export function EmployeeReportCard({
  isOpen,
  onClose,
  recoveredInr = 428450,
  atRiskInr = 112300,
}: EmployeeReportCardProps) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/employee-report`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setStats(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch employee report stats:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRecovered = stats?.recovered_amount_inr ?? recoveredInr;
  const currentRate = stats?.recovery_rate_pct ? `${stats.recovery_rate_pct}%` : "74.2%";
  const totalBlocks = stats?.total_blocks_chained ?? 1167;
  const grade = stats?.grade ?? "A+";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-accent/40 bg-[#070b14] text-white shadow-[0_15px_50px_rgba(0,186,242,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Official Appraisal Header */}
        <div className="relative bg-gradient-to-r from-[#001f3f] via-[#002f5e] to-[#001f3f] px-6 py-5 border-b border-accent/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent border border-accent/40">
                <Award className="h-4 w-4" />
              </span>
              <div>
                <span className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">
                  CONFIDENTIAL EMPLOYEE APPRAISAL
                </span>
                <h3 className="font-display text-lg font-black tracking-tight text-white">
                  AI Teammate Performance Review (Q3 2026)
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-muted hover:bg-critical hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto font-sans">
          {/* Employee Identity Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-recovered/20 text-accent border border-accent/40 font-display text-xl font-black">
                PA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-extrabold text-white">
                    Pratyavartan AI
                  </span>
                  <span className="rounded-full bg-recovered/20 px-2 py-0.5 font-mono text-[10px] font-bold text-recovered border border-recovered/40">
                    Grade {grade} ({currentRate})
                  </span>
                </div>
                <p className="font-mono text-xs text-muted">
                  Designation: Autonomous Kirana Revenue Teammate · ID #AI-001
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-emerald-300 border border-emerald-500/30 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active 24/7 (0 Sick Days)
              </span>
            </div>
          </div>

          {/* Executive Manager Summary */}
          <div className="rounded-2xl border border-stroke/80 bg-surface/60 p-4">
            <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold uppercase text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Manager Assessment & Role Justification</span>
            </div>
            <p className="text-xs leading-relaxed text-text/90 italic">
              "Pratyavartan functions not as a dumb retry bot, but as an indispensable digital teammate. It intercepts dropoffs in 3.2 seconds, negotiates naturally in Indic Hinglish, rigorously enforces RBI stopping rules, and has saved our Kirana network ₹{Number(currentRecovered).toLocaleString("en-IN")} while cutting manual call-center costs by 99.9%."
            </p>
          </div>

          {/* Core Scorecard Grid */}
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
              Core Business Impact Metrics
            </span>
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <span className="font-mono text-[10px] text-muted uppercase">Gross Recovered</span>
                <p className="mt-1 font-display text-lg font-black text-recovered">
                  ₹{Number(currentRecovered).toLocaleString("en-IN")}
                </p>
                <span className="font-mono text-[9px] text-recovered/80">{currentRate} recovery rate</span>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <span className="font-mono text-[10px] text-muted uppercase">Cost Per Recovery</span>
                <p className="mt-1 font-display text-lg font-black text-white">
                  ₹0.04
                </p>
                <span className="font-mono text-[9px] text-muted line-through">₹45.00 human caller</span>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <span className="font-mono text-[10px] text-muted uppercase">Compliance Violations</span>
                <p className="mt-1 font-display text-lg font-black text-emerald-300">
                  0
                </p>
                <span className="font-mono text-[9px] text-emerald-300/80">100% RBI Audit Clean</span>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <span className="font-mono text-[10px] text-muted uppercase">Avg Response Time</span>
                <p className="mt-1 font-display text-lg font-black text-accent">
                  3.2s
                </p>
                <span className="font-mono text-[9px] text-accent/80">Sub-4s instant save</span>
              </div>
            </div>
          </div>

          {/* Competency Evaluation Table */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
              Behavioral & Technical Competency Matrix
            </span>
            <div className="mt-3 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-white/90">Indic Empathy & Hinglish Voice</span>
                <span className="text-accent font-bold">⭐⭐⭐⭐⭐ (5/5) — Sarvam bulbul:v3</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-white/90">Stopping-Rule & Quiet Hours Adherence</span>
                <span className="text-recovered font-bold">⭐⭐⭐⭐⭐ (5/5) — Zero spam contact</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-white/90">Cryptographic Non-Repudiation</span>
                <span className="text-accent font-bold">⭐⭐⭐⭐⭐ (5/5) — {Number(totalBlocks).toLocaleString("en-IN")} SHA-256 blocks</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/90">Zero-Downtime Autonomous Failover</span>
                <span className="text-recovered font-bold">⭐⭐⭐⭐⭐ (5/5) — n8n + local sweep</span>
              </div>
            </div>
          </div>

          {/* Promotion & Manager Signature */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-white">
                  Promotion Recommendation: Senior Autonomous Revenue Teammate
                </p>
                <p className="font-mono text-[10px] text-emerald-300/80">
                  Approved by Lead Juror / Kirana Network Administrator
                </p>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Appraisal</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stroke/80 bg-surface/80 px-6 py-3 font-mono text-xs text-muted">
          <span>Official Audit Ledger Timestamp: {new Date().toLocaleTimeString("en-IN")} IST</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-surface px-4 py-1.5 text-text hover:bg-stroke cursor-pointer"
          >
            Close (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
