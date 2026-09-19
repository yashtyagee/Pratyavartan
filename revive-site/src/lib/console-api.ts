import { useState, useEffect } from "react";
import useSWR from "swr";
import { API_BASE_URL } from "./constants";

export interface HealthResponse {
  status: string;
  phase: string;
  timestamp: string;
  service: string;
}

export interface VoiceStatusResponse {
  engine?: string;
  provider?: string;
  active_provider?: string;
  sarvam_status?: string;
  gtts_status?: string;
  sarvam_available?: boolean;
  status?: string;
}

export interface LinkQuotaResponse {
  link_quota_limit?: number;
  links_generated_count?: number;
  links_remaining?: number;
  quota_preserved_count?: number;
  quota_exhausted?: boolean;
}

export interface MetricsResponse {
  revenue_at_risk_paise: number;
  revenue_recovered_paise: number;
  at_risk_inr: number;
  recovered_inr: number;
  blind_baseline_inr: number;
  delta_inr: number;
  status_counts: Record<string, number>;
  total_failed: number;
  total_audit_events: number;
  voice_messages_sent: number;
  total_discount_paise: number;
  recovery_success_rate?: number;
  recovery_rate?: number;
  violations_prevented?: number;
  promise_metrics?: {
    promises_total: number;
    promises_followed_up: number;
    promises_kept: number;
    promises_broken: number;
  };
  mandate_metrics?: {
    total: number;
    pending: number;
    fired: number;
    cancelled: number;
    failed: number;
  };
  link_quota_metrics?: LinkQuotaResponse;
  timeline?: Array<{
    timestamp: string;
    at_risk_inr: number;
    recovered_inr: number;
  }>;
}

export interface AuditLog {
  log_id: number;
  correlation_id: string;
  payment_id: string;
  timestamp: string;
  event_type: string;
  action_payload: string | Record<string, unknown>;
  ai_reasoning: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  parent_log_id?: number | null;
  hash_chain_link?: string | null;
}

export interface LearningInsightCell {
  segment: "STANDARD" | "MEDIUM_RISK" | "HIGH_RISK";
  intervention: "UPI_INTENT" | "INSTRUMENT_SWITCH" | "DISCOUNT_VOICE" | "MANDATE_RETRY";
  success_rate: number;
  sample_size: number;
  success_count: number;
  avg_latency_ms: number;
  status: "active" | "learning";
}

export interface LearningInsightsResponse {
  segments: string[];
  interventions: string[];
  matrix: LearningInsightCell[];
  top_insight: string;
  total_outcomes: number;
  source: string;
  timestamp: string;
}

export interface DedupStatsResponse {
  shield_active: boolean;
  duplicates_blocked: number;
  unique_signatures_tracked: number;
  recent_blocked_attempts: Array<{
    dedup_key: string;
    payment_id: string;
    hit_count: number;
    first_seen_at: string;
  }>;
  algorithm: string;
  timestamp: string;
}

export interface PendingRecovery {
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  error_code: string;
  error_description: string;
  user_contact?: string;
  created_at: string;
  promise_due?: string;
  mandate_attempt?: number;
}

export interface CustomerMemoryResponse {
  customer_ref?: string;
  risk_tier?: "STANDARD" | "MEDIUM_RISK" | "HIGH_RISK";
  preferred_time?: string;
  promises_kept?: number;
  promises_broken?: number;
  engine_source?: string;
  interactions_count?: number;
  recent_insights?: string[];
  last_contacted_at?: string;
}

export interface DecisionTraceNode {
  log_id: number;
  timestamp: string;
  event_type: string;
  action_payload: Record<string, unknown> | string;
  ai_reasoning: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  hash_chain_link?: string;
}

export interface DecisionTraceResponse {
  correlation_id: string;
  nodes: DecisionTraceNode[];
  count: number;
}

export interface VerifyChainResponse {
  verified: boolean;
  total_records: number;
  genesis_hash?: string;
  latest_hash?: string;
  broken_links?: Array<{ log_id: number; reason: string }>;
  verified_at?: string;
}

// Global fetcher with timeout
const fetcher = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export function useConsoleData() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // 10s Polls
  const { data: health, error: healthError } = useSWR<HealthResponse>(
    `${API_BASE_URL}/health`,
    fetcher,
    { refreshInterval: 10000, revalidateOnFocus: true }
  );

  const { data: voiceStatus, error: voiceError } = useSWR<VoiceStatusResponse>(
    `${API_BASE_URL}/api/voice-status`,
    fetcher,
    { refreshInterval: 10000, revalidateOnFocus: true }
  );

  const { data: linkQuota, error: quotaError } = useSWR<LinkQuotaResponse>(
    `${API_BASE_URL}/api/link-quota`,
    fetcher,
    { refreshInterval: 10000 }
  );

  // 5s Polls
  const { data: metrics, error: metricsError, mutate: mutateMetrics } = useSWR<MetricsResponse>(
    `${API_BASE_URL}/api/metrics`,
    fetcher,
    {
      refreshInterval: 5000,
      onSuccess: () => setLastUpdated(new Date()),
    }
  );

  // 3s Polls: Audit logs
  const { data: auditLogs, error: auditError, mutate: mutateAuditLogs } = useSWR<AuditLog[]>(
    `${API_BASE_URL}/api/audit-logs?limit=50`,
    fetcher,
    { refreshInterval: 3000 }
  );

  // 10s Polls: Learning Insights & Dedup
  const { data: learningInsights, error: learningError, mutate: mutateLearning } = useSWR<LearningInsightsResponse>(
    `${API_BASE_URL}/api/learning-insights`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const { data: dedupStats, error: dedupError, mutate: mutateDedup } = useSWR<DedupStatsResponse>(
    `${API_BASE_URL}/api/dedup-stats`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // 5s Polls: Pending recoveries
  const { data: pendingData, error: pendingError, mutate: mutatePending } = useSWR<{
    pending_recoveries: PendingRecovery[];
    count: number;
  }>(`${API_BASE_URL}/api/pending-recoveries`, fetcher, { refreshInterval: 5000 });

  const isOffline = Boolean(
    metricsError && auditError && healthError
  );

  const refreshAll = () => {
    mutateMetrics();
    mutateAuditLogs();
    mutateLearning();
    mutateDedup();
    mutatePending();
  };

  return {
    health,
    voiceStatus,
    linkQuota,
    metrics,
    auditLogs: auditLogs ?? [],
    learningInsights,
    dedupStats,
    pendingRecoveries: pendingData?.pending_recoveries ?? [],
    lastUpdated,
    isOffline,
    healthError,
    metricsError,
    auditError,
    learningError,
    dedupError,
    pendingError,
    refreshAll,
    mutateAuditLogs,
    mutateMetrics,
    mutateDedup,
  };
}
