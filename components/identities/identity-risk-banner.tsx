import { Badge } from "@/components/ui/badge";
import { RISK_RULE_LABELS } from "@/lib/governance/constants";
import {
  getRiskLevel,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_VARIANT,
} from "@/lib/governance/risk-level";
import type { RiskFinding } from "@/types/database.types";

interface IdentityRiskBannerProps {
  riskScore: number;
  findings: RiskFinding[];
}

export function IdentityRiskBanner({ riskScore, findings }: IdentityRiskBannerProps) {
  const level = getRiskLevel(riskScore);

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Governance Risk</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregate score from open findings (max 100)
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{riskScore}</p>
          <Badge variant={RISK_LEVEL_VARIANT[level]} className="mt-1">
            {RISK_LEVEL_LABELS[level]}
          </Badge>
        </div>
      </div>

      {findings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open risk findings.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Contributing factors</p>
          <ul className="space-y-2">
            {findings.map((finding) => (
              <li
                key={finding.id}
                className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium">
                    {RISK_RULE_LABELS[finding.rule_type] ?? finding.rule_type}
                  </span>
                  <span className="text-muted-foreground"> · +{finding.risk_points} pts</span>
                </div>
                <span className="text-muted-foreground">{finding.recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
