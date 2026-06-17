import { format, parseISO } from "date-fns";
import type { GovernanceMetricSnapshot } from "@/types/database.types";

export type TrendMetricKey =
  | "critical_findings"
  | "open_reviews"
  | "sod_violations"
  | "dormant_accounts";

export const TREND_METRICS: {
  key: TrendMetricKey;
  label: string;
  color: string;
}[] = [
  { key: "critical_findings", label: "Critical Findings", color: "#e11d48" },
  { key: "open_reviews", label: "Open Reviews", color: "#9333ea" },
  { key: "sod_violations", label: "SoD Violations", color: "#ea580c" },
  { key: "dormant_accounts", label: "Dormant Accounts", color: "#d97706" },
];

export type TrendDirection = "up" | "down" | "flat";

export interface TrendChange {
  direction: TrendDirection;
  delta: number;
  percentChange: number | null;
}

export function getSnapshotMetricValue(
  snapshot: GovernanceMetricSnapshot,
  key: TrendMetricKey
): number {
  return snapshot[key];
}

export function computeTrendChange(current: number, previous: number): TrendChange {
  const delta = current - previous;

  if (delta === 0) {
    return { direction: "flat", delta: 0, percentChange: 0 };
  }

  const percentChange =
    previous === 0 ? null : Math.round((delta / previous) * 100);

  return {
    direction: delta > 0 ? "up" : "down",
    delta,
    percentChange,
  };
}

export function getPriorSnapshot(
  snapshots: GovernanceMetricSnapshot[]
): GovernanceMetricSnapshot | null {
  if (snapshots.length < 2) return null;
  return snapshots[snapshots.length - 2];
}

export function getLatestSnapshot(
  snapshots: GovernanceMetricSnapshot[]
): GovernanceMetricSnapshot | null {
  if (snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

export function formatComparisonLabel(
  current: GovernanceMetricSnapshot,
  previous: GovernanceMetricSnapshot
): string {
  const currentLabel = format(parseISO(current.snapshot_date), "MMM d, yyyy");
  const previousLabel = format(parseISO(previous.snapshot_date), "MMM d, yyyy");
  return `${currentLabel} vs ${previousLabel}`;
}

export function formatSnapshotDate(date: string): string {
  return format(parseISO(date), "MMM d");
}

export function toChartData(snapshots: GovernanceMetricSnapshot[]) {
  return snapshots.map((snapshot) => ({
    date: snapshot.snapshot_date,
    label: formatSnapshotDate(snapshot.snapshot_date),
    critical_findings: snapshot.critical_findings,
    open_reviews: snapshot.open_reviews,
    sod_violations: snapshot.sod_violations,
    dormant_accounts: snapshot.dormant_accounts,
  }));
}

export function getSnapshotDateBucket(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
