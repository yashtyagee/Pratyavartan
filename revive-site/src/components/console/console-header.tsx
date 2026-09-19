"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  BrainCircuit,
  AudioWaveform,
  Lock,
  Smartphone,
  RotateCw,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import {
  HealthResponse,
  VoiceStatusResponse,
  LinkQuotaResponse,
  DedupStatsResponse,
} from "@/lib/console-api";

interface ConsoleHeaderProps {
  health?: HealthResponse;
  voiceStatus?: VoiceStatusResponse;
  linkQuota?: LinkQuotaResponse;
  dedupStats?: DedupStatsResponse;
  lastUpdated: Date;
  isOffline: boolean;
  onRefresh: () => void;
}

export default function ConsoleHeader({
  health,
  voiceStatus,
  linkQuota,
  dedupStats,
  lastUpdated,
  isOffline,
  onRefresh,
}: ConsoleHeaderProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const voiceProvider = voiceStatus?.active_provider ?? (voiceStatus?.sarvam_available ? "Sarvam Voice" : "gTTS Fallback");
  const isSarvam = voiceProvider.toLowerCase().includes("sarvam") || voiceStatus?.sarvam_available === true;

  const quotaLimit = linkQuota?.link_quota_limit ?? 30;
  const quotaUsed = linkQuota?.links_generated_count ?? 0;
  const quotaRemaining = linkQuota?.links_remaining ?? quotaLimit - quotaUsed;
  const quotaProgress = Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));
  const isLowQuota = quotaRemaining <= 3;

  const blockedDupes = dedupStats?.duplicates_blocked ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-stroke bg-[rgba(5,7,13,0.85)] px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        {/* Brand & Left Controls */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-surface text-muted transition-colors hover:border-accent hover:text-text"
            title="Back to Landing Page"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent shadow-[0_0_12px_rgba(0,186,242,0.25)]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold tracking-tight text-white">
                  PRATYAVARTAN
                </span>
                <span className="mono rounded border border-accent/30 bg-accent/10 px-1.5 py-0.2 text-[10px] font-semibold text-accent">
                  WAR ROOM
                </span>
                <span className="mono hidden text-[11px] text-muted sm:inline">
                  #AI-001
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Status Indicators & Partner Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live / Offline Pulse */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              isOffline
                ? "border-critical/40 bg-critical/10 text-critical"
                : "border-recovered/30 bg-recovered/10 text-recovered"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {!isOffline && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-recovered opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isOffline ? "bg-critical" : "bg-recovered"
                }`}
              />
            </span>
            <span className="mono text-[11px] font-semibold">
              {isOffline ? "OFFLINE DEMO MODE" : "LIVE"}
            </span>
          </div>

          {/* LLM Model Chip */}
          <div className="glass hidden items-center gap-1.5 rounded-full px-3 py-1 md:flex">
            <BrainCircuit className="h-3.5 w-3.5 text-ai" />
            <span className="mono text-[11px] text-text">
              {health?.service ? "Groq LLaMA 3.3" : "AI Agent v1.2"}
            </span>
          </div>

          {/* Voice Engine Chip */}
          <div className="glass hidden items-center gap-1.5 rounded-full px-3 py-1 sm:flex">
            <AudioWaveform
              className={`h-3.5 w-3.5 ${
                isSarvam ? "text-recovered" : "text-monitor"
              }`}
            />
            <span className="mono text-[11px] text-text">
              {voiceProvider}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSarvam ? "bg-recovered" : "bg-monitor"
              }`}
            />
          </div>

          {/* Link Quota Mini-Bar */}
          <div className="glass hidden items-center gap-2 rounded-full px-3 py-1 lg:flex">
            <span className="mono text-[10px] text-muted">LINK QUOTA</span>
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all duration-500 ${
                  isLowQuota ? "bg-monitor" : "bg-accent"
                }`}
                style={{ width: `${quotaProgress}%` }}
              />
            </div>
            <span
              className={`mono text-[11px] font-semibold ${
                isLowQuota ? "text-monitor" : "text-text"
              }`}
            >
              {quotaUsed}/{quotaLimit}
            </span>
          </div>

          {/* SHA-256 Chained Badge */}
          <div className="glass hidden items-center gap-1.5 rounded-full px-2.5 py-1 xl:flex">
            <Lock className="h-3 w-3 text-recovered" />
            <span className="mono text-[10px] text-muted">SHA-256 CHAINED</span>
          </div>

          {/* Paytm Adapter Badge */}
          <div className="glass hidden items-center gap-1.5 rounded-full border-accent/20 px-2.5 py-1 xl:flex">
            <Smartphone className="h-3 w-3 text-accent" />
            <span className="mono text-[10px] text-accent">PAYTM ADAPTER</span>
          </div>

          {/* Dedup Shield Counter */}
          <div
            className={`glass flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              blockedDupes > 0 ? "border-monitor/40 text-monitor" : "text-muted"
            }`}
            title={`${blockedDupes} duplicate webhooks mathematically blocked`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span className="mono text-[11px] font-semibold text-text">
              {blockedDupes} DEDUP
            </span>
          </div>

          {/* Relative Timestamp & Refresh */}
          <div className="flex items-center gap-2 pl-1">
            <span className="mono hidden text-[10px] text-muted sm:inline">
              updated {secondsAgo}s ago
            </span>
            <button
              onClick={onRefresh}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-stroke bg-surface text-muted transition-colors hover:border-accent hover:text-text active:scale-95"
              title="Force Refresh Data"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
