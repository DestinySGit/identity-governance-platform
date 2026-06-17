import Link from "next/link";
import { getRiskFindings } from "@/app/actions/governance";
import { getProfile } from "@/lib/auth";
import { RISK_RULE_LABELS } from "@/lib/governance/constants";
import {
  getRiskLevel,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_VARIANT,
} from "@/lib/governance/risk-level";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskAnalysisButton } from "@/components/risks/risk-analysis-button";
import { formatDateTime } from "@/lib/utils";

interface RisksPageProps {
  searchParams: Promise<{
    severity?: string;
    type?: string;
  }>;
}

const severityVariant = {
  medium: "warning" as const,
  high: "destructive" as const,
  critical: "critical" as const,
};

export default async function RisksPage({ searchParams }: RisksPageProps) {
  const params = await searchParams;
  const [findings, profile] = await Promise.all([
    getRiskFindings({
      severity: params.severity,
      ruleType: params.type,
      status: "open",
    }),
    getProfile(),
  ]);

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Governance Risks</h1>
          <p className="text-muted-foreground mt-1">
            {findings.length} open findings with numeric scores and remediation guidance
          </p>
        </div>
        {isAdmin && <RiskAnalysisButton />}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identity</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Finding</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Recommendation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detected</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No open risk findings. Run analysis to evaluate identities.
                </TableCell>
              </TableRow>
            ) : (
              findings.map((finding) => {
                const level = getRiskLevel(finding.identity.risk_score);
                return (
                  <TableRow key={finding.id}>
                    <TableCell className="font-medium">
                      {finding.identity.first_name} {finding.identity.last_name}
                    </TableCell>
                    <TableCell>{finding.identity.risk_score}</TableCell>
                    <TableCell>
                      <Badge variant={RISK_LEVEL_VARIANT[level]}>
                        {RISK_LEVEL_LABELS[level]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {RISK_RULE_LABELS[finding.rule_type] ?? finding.rule_type}
                    </TableCell>
                    <TableCell>+{finding.risk_points}</TableCell>
                    <TableCell>
                      <Badge variant={severityVariant[finding.severity]}>
                        {finding.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm">
                      {finding.recommendation}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{finding.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(finding.detected_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/identities/${finding.identity_id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
