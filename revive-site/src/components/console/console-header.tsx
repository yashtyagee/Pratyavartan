"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  RotateCw,
  ArrowLeft,
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

        {/* Right Controls: Relative Timestamp & Refresh */}
        <div className="flex items-center gap-3">
          <span className="mono hidden text-[11px] text-muted sm:inline">
            updated {secondsAgo}s ago
          </span>
          <button
            onClick={onRefresh}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-surface text-muted transition-colors hover:border-accent hover:text-text active:scale-95 cursor-pointer"
            title="Force Refresh Data"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
