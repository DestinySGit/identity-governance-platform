import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeRiskScore,
  DORMANT_DAYS,
  getRemediation,
  getRiskPoints,
  RISK_RULES,
} from "@/lib/governance/constants";
import type { RiskSeverity } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface DetectedRisk {
  identity_id: string;
  rule_type: string;
  severity: RiskSeverity;
  risk_points: number;
  recommendation: string;
  details: Record<string, unknown>;
}

export async function recomputeIdentityRiskScores(
  supabase: SupabaseClient,
  identityIds?: string[]
): Promise<void> {
  let query = supabase.from("identities").select("id");
  if (identityIds?.length) {
    query = query.in("id", identityIds);
  }

  const { data: identities } = await query;
  if (!identities?.length) return;

  for (const identity of identities) {
    const { data: openFindings } = await supabase
      .from("risk_findings")
      .select("risk_points")
      .eq("identity_id", identity.id)
      .eq("status", "open");

    const score = computeRiskScore(
      (openFindings ?? []).map((finding) => finding.risk_points)
    );

    await supabase
      .from("identities")
      .update({ risk_score: score })
      .eq("id", identity.id);
  }
}

export async function evaluateGovernanceRisks(): Promise<{
  created: number;
  resolved: number;
}> {
  const supabase = createAdminClient();
  const detected: DetectedRisk[] = [];
  const now = new Date();
  const dormantCutoff = new Date(now);
  dormantCutoff.setDate(dormantCutoff.getDate() - DORMANT_DAYS);

  const { data: identities } = await supabase.from("identities").select("*");
  if (!identities) return { created: 0, resolved: 0 };

  const { data: identityRoles } = await supabase
    .from("identity_roles")
    .select("identity_id, role_id, roles(id, name, is_administrative)");

  const { data: identityGroups } = await supabase
    .from("identity_groups")
    .select("identity_id");

  const { data: identityApps } = await supabase
    .from("identity_applications")
    .select("identity_id");

  const { data: sodRules } = await supabase.from("sod_rules").select("*");

  const rolesByIdentity = new Map<string, { id: string; name: string; is_administrative: boolean }[]>();
  for (const ir of identityRoles ?? []) {
    const role = ir.roles as unknown as { id: string; name: string; is_administrative: boolean } | null;
    if (!role) continue;
    const list = rolesByIdentity.get(ir.identity_id) ?? [];
    list.push(role);
    rolesByIdentity.set(ir.identity_id, list);
  }

  const hasEntitlements = new Set<string>();
  for (const row of identityRoles ?? []) hasEntitlements.add(row.identity_id);
  for (const row of identityGroups ?? []) hasEntitlements.add(row.identity_id);
  for (const row of identityApps ?? []) hasEntitlements.add(row.identity_id);

  function addFinding(
    identityId: string,
    ruleType: string,
    severity: RiskSeverity,
    details: Record<string, unknown>
  ) {
    detected.push({
      identity_id: identityId,
      rule_type: ruleType,
      severity,
      risk_points: getRiskPoints(ruleType),
      recommendation: getRemediation(ruleType),
      details,
    });
  }

  for (const identity of identities) {
    if (identity.status === "active") {
      const lastLogin = identity.last_login ? new Date(identity.last_login) : null;
      if (!lastLogin || lastLogin < dormantCutoff) {
        addFinding(identity.id, RISK_RULES.DORMANT_ACCOUNT, "medium", {
          last_login: identity.last_login,
          threshold_days: DORMANT_DAYS,
        });
      }
    }

    if (!identity.manager_id) {
      addFinding(identity.id, RISK_RULES.ORPHANED_ACCOUNT, "high", {
        message: "No manager assigned",
      });
    }

    const roles = rolesByIdentity.get(identity.id) ?? [];
    const hasAdminRole = roles.some((r) => r.is_administrative);
    const isItDept = identity.department.toUpperCase().includes("IT");
    if (hasAdminRole && !isItDept) {
      addFinding(identity.id, RISK_RULES.EXCESSIVE_PRIVILEGE, "high", {
        department: identity.department,
        roles: roles.filter((r) => r.is_administrative).map((r) => r.name),
      });
    }

    if (identity.status === "disabled" && hasEntitlements.has(identity.id)) {
      addFinding(identity.id, RISK_RULES.INACTIVE_WITH_ACCESS, "high", {
        message: "Disabled identity retains entitlements",
      });
    }

    const roleIds = new Set(roles.map((r) => r.id));
    for (const rule of sodRules ?? []) {
      if (roleIds.has(rule.role_a_id) && roleIds.has(rule.role_b_id)) {
        addFinding(identity.id, RISK_RULES.SOD_VIOLATION, rule.risk_level, {
          sod_rule_id: rule.id,
          description: rule.description,
        });
      }
    }
  }

  const detectedKeys = new Set(
    detected.map((d) => `${d.identity_id}:${d.rule_type}`)
  );

  const { data: existingOpen } = await supabase
    .from("risk_findings")
    .select("*")
    .eq("status", "open");

  let resolved = 0;
  const resolvedIdentityIds = new Set<string>();
  for (const finding of existingOpen ?? []) {
    const key = `${finding.identity_id}:${finding.rule_type}`;
    if (!detectedKeys.has(key)) {
      await supabase
        .from("risk_findings")
        .update({ status: "resolved", resolved_at: now.toISOString() })
        .eq("id", finding.id);
      resolved++;
      resolvedIdentityIds.add(finding.identity_id);
    }
  }

  let created = 0;
  const affectedIdentityIds = new Set<string>(resolvedIdentityIds);
  const existingKeys = new Set(
    (existingOpen ?? []).map((f) => `${f.identity_id}:${f.rule_type}`)
  );

  for (const risk of detected) {
    affectedIdentityIds.add(risk.identity_id);
    const key = `${risk.identity_id}:${risk.rule_type}`;
    if (existingKeys.has(key)) {
      await supabase
        .from("risk_findings")
        .update({
          severity: risk.severity,
          risk_points: risk.risk_points,
          recommendation: risk.recommendation,
          details: risk.details,
          detected_at: now.toISOString(),
        })
        .eq("identity_id", risk.identity_id)
        .eq("rule_type", risk.rule_type)
        .eq("status", "open");
    } else {
      const { error } = await supabase.from("risk_findings").insert({
        identity_id: risk.identity_id,
        rule_type: risk.rule_type,
        severity: risk.severity,
        status: "open",
        risk_points: risk.risk_points,
        recommendation: risk.recommendation,
        details: risk.details,
        detected_at: now.toISOString(),
      });
      if (!error) created++;
    }
  }

  await recomputeIdentityRiskScores(supabase);

  return { created, resolved };
}

export async function recomputeIdentityRiskScore(identityId: string): Promise<void> {
  const supabase = createAdminClient();
  await recomputeIdentityRiskScores(supabase, [identityId]);
}
