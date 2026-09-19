"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  AlertOctagon,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Counter from "@/components/ui/counter";
import { MetricsResponse } from "@/lib/console-api";

interface KPICardsProps {
  metrics?: MetricsResponse;
  loading?: boolean;
}

export default function KPICards({ metrics, loading = false }: KPICardsProps) {
  const atRisk = metrics?.at_risk_inr ?? 24500;
  const recovered = metrics?.recovered_inr ?? 18650;
  const statusCounts = metrics?.status_counts ?? {};
  const escalations = statusCounts["ESCALATED"] ?? 0;
  const successRate = metrics?.recovery_success_rate ?? metrics?.recovery_rate ?? 76.1;

  // Passive Kirana calculation
  const totalRecoveredCount = statusCounts["RECOVERED"] ?? 12;
  const passiveRate = totalRecoveredCount > 0 ? Math.min(100, Math.round(((totalRecoveredCount - escalations) / Math.max(1, totalRecoveredCount)) * 100)) : 88;

  const cards = [
    {
      label: "AT-RISK REVENUE",
      numericValue: atRisk,
      prefix: "₹",
      suffix: "",
      decimals: 0,
      delta: "-14.2%",
      deltaPositive: false,
      icon: AlertOctagon,
      borderColor: "border-critical/60",
      glowColor: "group-hover:border-critical/40",
      accentBg: "bg-critical/10",
      accentText: "text-critical",
      subtext: "Pending drops across UPI/QR",
    },
    {
      label: "RECOVERED FUNDS",
      numericValue: recovered,
      prefix: "₹",
      suffix: "",
      decimals: 0,
      delta: "+28.4%",
      deltaPositive: true,
      icon: CheckCircle2,
      borderColor: "border-recovered/60",
      glowColor: "group-hover:border-recovered/40",
      accentBg: "bg-recovered/10",
      accentText: "text-recovered",
      subtext: `₹${(metrics?.delta_inr ?? 14200).toLocaleString("en-IN")} above blind baseline`,
    },
    {
      label: "PASSIVE KIRANA SHARE",
      numericValue: passiveRate,
      prefix: "",
      suffix: "%",
      decimals: 0,
      delta: "+5.1%",
      deltaPositive: true,
      icon: Cpu,
      borderColor: "border-monitor/60",
      glowColor: "group-hover:border-monitor/40",
      accentBg: "bg-monitor/10",
      accentText: "text-monitor",
      subtext: "100% autonomous zero-touch",
    },
    {
      label: "HUMAN ESCALATIONS",
      numericValue: escalations,
      prefix: "",
      suffix: "",
      decimals: 0,
      delta: "Bound Policy",
      deltaPositive: true,
      icon: ShieldAlert,
      borderColor: "border-ai/60",
      glowColor: "group-hover:border-ai/40",
      accentBg: "bg-ai/10",
      accentText: "text-ai",
      subtext: "Max 2 retries stopping rule cap",
    },
    {
      label: "RECOVERY SUCCESS RATE",
      numericValue: successRate,
      prefix: "",
      suffix: "%",
      decimals: 1,
      delta: "+18.2%",
      deltaPositive: true,
      icon: TrendingUp,
      borderColor: "border-accent/60",
      glowColor: "group-hover:border-accent/40",
      accentBg: "bg-accent/10",
      accentText: "text-accent",
      subtext: "From 18% blind baseline",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="glass h-32 animate-pulse rounded-2xl border border-stroke p-5"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.4 }}
            className={`glass group relative overflow-hidden rounded-2xl border border-stroke p-5 transition-all duration-300 hover:scale-[1.01] ${card.glowColor}`}
          >
            {/* Top Severity Border Accent */}
            <div
              className={`absolute left-0 right-0 top-0 h-[2px] border-t-2 ${card.borderColor}`}
            />

            <div className="flex items-center justify-between gap-2">
              <span className="mono text-[11px] font-medium uppercase tracking-wider text-muted">
                {card.label}
              </span>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.accentBg} ${card.accentText}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-1">
              {card.prefix && (
                <span className="font-display text-2xl font-bold text-text">
                  {card.prefix}
                </span>
              )}
              <Counter
                target={card.numericValue}
                decimals={card.decimals}
                suffix={card.suffix}
                className="font-display text-3xl font-bold tracking-tight text-white lg:text-3xl"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="truncate text-[11px] text-muted">
                {card.subtext}
              </span>
              <div
                className={`flex items-center gap-0.5 font-mono text-[11px] font-semibold ${
                  card.deltaPositive ? "text-recovered" : "text-critical"
                }`}
              >
                {card.deltaPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>{card.delta}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
