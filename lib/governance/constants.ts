export const RISK_RULES = {
  DORMANT_ACCOUNT: "dormant_account",
  ORPHANED_ACCOUNT: "orphaned_account",
  EXCESSIVE_PRIVILEGE: "excessive_privilege",
  INACTIVE_WITH_ACCESS: "inactive_with_access",
  SOD_VIOLATION: "sod_violation",
} as const;

export const RISK_RULE_LABELS: Record<string, string> = {
  dormant_account: "Dormant Account",
  orphaned_account: "Orphaned Account",
  excessive_privilege: "Excessive Privilege",
  inactive_with_access: "Inactive User With Access",
  sod_violation: "Separation of Duties Violation",
};

export const RISK_POINTS: Record<string, number> = {
  [RISK_RULES.DORMANT_ACCOUNT]: 20,
  [RISK_RULES.ORPHANED_ACCOUNT]: 30,
  [RISK_RULES.EXCESSIVE_PRIVILEGE]: 40,
  [RISK_RULES.INACTIVE_WITH_ACCESS]: 40,
  [RISK_RULES.SOD_VIOLATION]: 50,
};

export const RISK_THRESHOLDS = {
  low: { min: 0, max: 25 },
  medium: { min: 26, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 },
} as const;

export const REMEDIATION_MAP: Record<string, string> = {
  [RISK_RULES.DORMANT_ACCOUNT]: "Disable account",
  [RISK_RULES.ORPHANED_ACCOUNT]: "Assign manager",
  [RISK_RULES.EXCESSIVE_PRIVILEGE]: "Review administrative access",
  [RISK_RULES.INACTIVE_WITH_ACCESS]: "Remove remaining entitlements",
  [RISK_RULES.SOD_VIOLATION]: "Remove conflicting role",
};

export const DORMANT_DAYS = 90;
export const IT_DEPARTMENT_PATTERN = "%IT%";

export const CHUNK_SIZE = 500;

export const MAX_RISK_SCORE = 100;

export function getRiskPoints(ruleType: string): number {
  return RISK_POINTS[ruleType] ?? 0;
}

export function getRemediation(ruleType: string): string {
  return REMEDIATION_MAP[ruleType] ?? "Review finding";
}

export function computeRiskScore(points: number[]): number {
  return Math.min(MAX_RISK_SCORE, points.reduce((sum, value) => sum + value, 0));
}
