"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  useConsoleData,
  AuditLog,
} from "@/lib/console-api";
import ConsoleHeader from "@/components/console/console-header";
import KPICards from "@/components/console/kpi-cards";
import AnalyticsCharts from "@/components/console/analytics-charts";
import LearningInsightsPanel from "@/components/console/learning-insights-panel";
import SimulationPlayground from "@/components/console/simulation-playground";
import ActiveRecoveries from "@/components/console/active-recoveries";
import AuditLedger from "@/components/console/audit-ledger";
import DecisionTraceModal from "@/components/console/decision-trace-modal";
import ToastSystem, { ToastMessage } from "@/components/console/toast-system";
import { AlertTriangle, RefreshCw } from "lucide-react";

// Dynamic import of Three.js 3D Ledger with SSR disabled for optimal performance
const LedgerChain3D = dynamic(
  () => import("@/components/console/three/ledger-chain-3d"),
  { ssr: false }
);

export default function WarRoomConsolePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    health,
    voiceStatus,
    linkQuota,
    metrics,
    auditLogs,
    learningInsights,
    dedupStats,
    pendingRecoveries,
    lastUpdated,
    isOffline,
    refreshAll,
    mutateAuditLogs,
    mutateMetrics,
    mutateDedup,
  } = useConsoleData();

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [activeChartFilter, setActiveChartFilter] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pulseCount, setPulseCount] = useState(0);
  const prevLogCountRef = useRef(0);

  // Trigger toast & 3D pulse when new audit events land
  useEffect(() => {
    if (auditLogs.length > prevLogCountRef.current && prevLogCountRef.current > 0) {
      const newestLog = auditLogs[0];
      setPulseCount((prev) => prev + 1);

      if (newestLog.event_type === "RECOVERED" || newestLog.event_type === "PROMISE_KEPT") {
        addToast({
          id: String(Date.now()),
          type: "RECOVERED",
          title: "Payment Recovered!",
          message: `${newestLog.payment_id} successfully settled into merchant khata.`,
        });
      } else if (newestLog.event_type === "SECURITY_ALERT") {
        addToast({
          id: String(Date.now()),
          type: "SECURITY_ALERT",
          title: "Security / Idempotency Barrier",
          message: newestLog.ai_reasoning || "Duplicate webhook or signature anomaly blocked.",
        });
      } else if (newestLog.severity === "CRITICAL") {
        addToast({
          id: String(Date.now()),
          type: "CRITICAL",
          title: "Compliance Escalation",
          message: newestLog.ai_reasoning || "Payment escalated to human officer.",
        });
      }
    }
    prevLogCountRef.current = auditLogs.length;
  }, [auditLogs]);

  const addToast = (toast: ToastMessage) => {
    setToasts((prev) => [...prev.slice(-4), toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSimulationSuccess = (paymentId: string, correlationId: string) => {
    mutateAuditLogs();
    mutateMetrics();
    mutateDedup();
    setPulseCount((prev) => prev + 1);
  };

  const handleDuplicateBlocked = () => {
    mutateAuditLogs();
    mutateDedup();
    addToast({
      id: String(Date.now()),
      type: "SECURITY_ALERT",
      title: "DUPLICATE BLOCKED",
      message: "Idempotency shield intercepted identical signature. Zero duplicate executions.",
    });
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base text-muted font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span>Synchronizing Kirana War Room Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-base text-text selection:bg-accent/30 selection:text-white">
      {/* 3D Rotating Ledger Backdrop (Header layer) */}
      <div className="relative h-20 w-full overflow-hidden">
        <LedgerChain3D pulseCount={pulseCount} />
      </div>

      {/* Sticky Top Header */}
      <ConsoleHeader
        health={health}
        voiceStatus={voiceStatus}
        linkQuota={linkQuota}
        dedupStats={dedupStats}
        lastUpdated={lastUpdated}
        isOffline={isOffline}
        onRefresh={refreshAll}
      />

      {/* Offline Mode Banner (if backend unreachable) */}
      {isOffline && (
        <div className="border-b border-critical/40 bg-critical/10 px-4 py-2 text-center font-mono text-xs text-critical">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>
              <strong>OFFLINE DEMO MODE:</strong> Backend at port 8010 is not reachable. Showing cached state and graceful fallback UI.
            </span>
            <button
              onClick={refreshAll}
              className="ml-2 inline-flex items-center gap-1 rounded bg-critical/20 px-2 py-0.5 font-bold hover:bg-critical/30"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      )}

      {/* Main War Room Content Container */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Row 1: KPI Cards */}
        <section aria-label="Key Performance Indicators">
          <KPICards metrics={metrics} loading={!metrics && !isOffline} />
        </section>

        {/* Row 2: Analytics Charts */}
        <section aria-label="Recovery Analytics and Distribution">
          <AnalyticsCharts
            auditLogs={auditLogs}
            metrics={metrics}
            activeFilter={activeChartFilter}
            onSelectFilter={setActiveChartFilter}
          />
        </section>

        {/* Row 3: Learning Insights Heatmap (Track 3 Priority 3 Headline Widget) */}
        <section aria-label="Learning Insights Heatmap">
          <LearningInsightsPanel
            insights={learningInsights}
            loading={!learningInsights && !isOffline}
          />
        </section>

        {/* Row 4: Simulation Playground & Lifecycle Streamer */}
        <section aria-label="Simulation Playground">
          <SimulationPlayground
            onSimulationSuccess={handleSimulationSuccess}
            onDuplicateBlocked={handleDuplicateBlocked}
            onResetComplete={refreshAll}
          />
        </section>

        {/* Row 5: Active Recoveries, Mandates & Soundbox */}
        <section aria-label="Active Recoveries and Mandate Timelines">
          <ActiveRecoveries
            metrics={metrics}
            pendingRecoveries={pendingRecoveries}
            onActionComplete={refreshAll}
          />
        </section>

        {/* Row 6: Cryptographic Audit Ledger & Verify Chain */}
        <section aria-label="Cryptographic Audit Ledger">
          <AuditLedger
            auditLogs={auditLogs}
            activeFilter={activeChartFilter}
            onClearFilter={() => setActiveChartFilter(undefined)}
            onSelectLog={setSelectedLog}
          />
        </section>
      </main>

      {/* Decision-Trace Modal (Click any ledger row) */}
      {selectedLog && (
        <DecisionTraceModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}

      {/* Real-time Toast Notifications */}
      <ToastSystem toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
