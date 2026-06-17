import { RISK_THRESHOLDS } from "@/lib/governance/constants";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function getRiskLevel(score: number): RiskLevel {
  if (score <= RISK_THRESHOLDS.low.max) return "low";
  if (score <= RISK_THRESHOLDS.medium.max) return "medium";
  if (score <= RISK_THRESHOLDS.high.max) return "high";
  return "critical";
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const RISK_LEVEL_VARIANT: Record<
  RiskLevel,
  "success" | "warning" | "destructive" | "critical" | "outline"
> = {
  low: "success",
  medium: "warning",
  high: "destructive",
  critical: "critical",
};
