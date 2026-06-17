"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  evaluateGovernanceRisks,
  recomputeIdentityRiskScore,
} from "@/lib/governance/risk-engine";
import type { RiskFindingWithIdentity, Identity, RiskFinding, GovernanceMetricSnapshot } from "@/types/database.types";
import { getSnapshotDateBucket } from "@/lib/governance/trends";

export async function getRiskFindings(filters?: {
  severity?: string;
  ruleType?: string;
  status?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("risk_findings")
    .select(
      "*, identity:identities(id, first_name, last_name, email, department, risk_score)"
    )
    .order("detected_at", { ascending: false });

  if (filters?.severity) {
    query = query.eq("severity", filters.severity as "medium" | "high" | "critical");
  }
  if (filters?.ruleType) {
    query = query.eq("rule_type", filters.ruleType);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status as "open" | "resolved");
  } else {
    query = query.eq("status", "open");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as unknown as RiskFindingWithIdentity[];
}

export async function getIdentityRiskFindings(identityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("risk_findings")
    .select("*")
    .eq("identity_id", identityId)
    .eq("status", "open")
    .order("risk_points", { ascending: false });

  if (error) throw new Error(error.message);
  return data as RiskFinding[];
}

export async function runRiskAnalysis() {
  await requireRole(["admin"]);
  const result = await evaluateGovernanceRisks();

  revalidatePath("/risks");
  revalidatePath("/");
  revalidatePath("/explorer");
  revalidatePath("/identities");

  return result;
}

export async function resolveRiskFinding(id: string) {
  await requireRole(["admin", "reviewer"]);
  const supabase = await createClient();

  const { data: finding, error: fetchError } = await supabase
    .from("risk_findings")
    .select("identity_id")
    .eq("id", id)
    .single();

  if (fetchError || !finding) {
    return { error: { message: "Finding not found" } };
  }

  const { error } = await supabase
    .from("risk_findings")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: { message: error.message } };

  await recomputeIdentityRiskScore(finding.identity_id);

  revalidatePath("/risks");
  revalidatePath(`/identities/${finding.identity_id}`);
  revalidatePath("/ownership/roles");
  revalidatePath("/ownership/applications");
  return { success: true };
}

export async function getDashboardMetrics(department?: string) {
  const supabase = await createClient();

  let identityQuery = supabase
    .from("identities")
    .select("id, status, last_login, department, risk_score", { count: "exact" });

  if (department) {
    identityQuery = identityQuery.eq("department", department);
  }

  const { data: identities, count: totalUsers } = await identityQuery;

  type IdentityMetrics = Pick<
    Identity,
    "id" | "status" | "last_login" | "department" | "risk_score"
  >;
  const identityList = (identities ?? []) as IdentityMetrics[];
  const identityIds = identityList.map((i) => i.id);

  const averageRiskScore =
    identityList.length > 0
      ? Math.round(
          identityList.reduce((sum, i) => sum + (i.risk_score ?? 0), 0) /
            identityList.length
        )
      : 0;

  const dormantCutoff = new Date();
  dormantCutoff.setDate(dormantCutoff.getDate() - 90);

  const dormantCount = identityList.filter((i) => {
    if (i.status !== "active") return false;
    if (!i.last_login) return true;
    return new Date(i.last_login) < dormantCutoff;
  }).length;

  const { data: openFindings, count: highRiskCount } = await supabase
    .from("risk_findings")
    .select("id, severity, rule_type, identity_id", { count: "exact" })
    .eq("status", "open")
    .in("severity", ["high", "critical"]);

  type RiskMetrics = Pick<RiskFinding, "id" | "severity" | "rule_type" | "identity_id">;
  const riskList = (openFindings ?? []) as RiskMetrics[];

  const filteredHighRisks = department
    ? riskList.filter((r) => identityIds.includes(r.identity_id))
    : riskList;

  const sodCount = filteredHighRisks.filter(
    (r) => r.rule_type === "sod_violation"
  ).length;

  const { data: criticalFindings } = await supabase
    .from("risk_findings")
    .select("id, identity_id")
    .eq("status", "open")
    .eq("severity", "critical");

  type CriticalFinding = Pick<RiskFinding, "id" | "identity_id">;
  const criticalList = (criticalFindings ?? []) as CriticalFinding[];
  const criticalFindingsCount = department
    ? criticalList.filter((r) => identityIds.includes(r.identity_id)).length
    : criticalList.length;

  const { count: openReviews } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("status", "in_progress");

  const { data: activeCampaigns } = await supabase
    .from("campaigns")
    .select("id")
    .in("status", ["in_progress", "completed"]);

  const campaignIds = (activeCampaigns ?? []).map((c) => c.id);
  let reviewCompletionPercent = 0;

  if (campaignIds.length > 0) {
    const { data: campaignItems } = await supabase
      .from("campaign_items")
      .select("decision")
      .in("campaign_id", campaignIds);

    const totalItems = campaignItems?.length ?? 0;
    const completedItems =
      campaignItems?.filter((item) => item.decision !== "pending").length ?? 0;
    reviewCompletionPercent =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }

  return {
    totalUsers: totalUsers ?? 0,
    highRiskUsers: department
      ? new Set(filteredHighRisks.map((r) => r.identity_id)).size
      : highRiskCount ?? 0,
    criticalFindings: criticalFindingsCount,
    sodViolations: sodCount,
    dormantAccounts: dormantCount,
    openReviews: openReviews ?? 0,
    reviewCompletionPercent,
    averageRiskScore,
  };
}

export async function getGovernanceMetricSnapshots(
  limit = 24
): Promise<GovernanceMetricSnapshot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("governance_metric_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to load governance metric snapshots:", error.message);
    return [];
  }
  return (data ?? []) as GovernanceMetricSnapshot[];
}

export async function captureGovernanceSnapshot(snapshotDate?: string) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const metrics = await getDashboardMetrics();
  const bucketDate = snapshotDate ?? getSnapshotDateBucket();

  const { data, error } = await supabase
    .from("governance_metric_snapshots")
    .upsert(
      {
        snapshot_date: bucketDate,
        total_users: metrics.totalUsers,
        high_risk_users: metrics.highRiskUsers,
        critical_findings: metrics.criticalFindings,
        sod_violations: metrics.sodViolations,
        dormant_accounts: metrics.dormantAccounts,
        open_reviews: metrics.openReviews,
        review_completion_percent: metrics.reviewCompletionPercent,
        average_risk_score: metrics.averageRiskScore,
      },
      { onConflict: "snapshot_date" }
    )
    .select()
    .single();

  if (error) return { error: { message: error.message } };

  revalidatePath("/");
  return { data: data as GovernanceMetricSnapshot };
}
