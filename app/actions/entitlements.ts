"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  roleSchema,
  groupSchema,
  applicationSchema,
  sodRuleSchema,
  updateRoleOwnershipSchema,
  updateApplicationOwnershipSchema,
} from "@/schemas/identity.schema";
import { deriveReviewStatus } from "@/lib/ownership/review-status";
import type {
  Application,
  ApplicationWithOwnership,
  AssignedUserWithRisk,
  IdentityOwner,
  OwnershipCampaignSummary,
  Role,
  RoleWithOwnership,
} from "@/types/database.types";
import type { OwnershipReviewStatus } from "@/lib/ownership/review-status";

export type RoleOwnershipDetail = {
  role: Role & { owner: IdentityOwner | null };
  assignedUsers: AssignedUserWithRisk[];
  campaigns: OwnershipCampaignSummary[];
  reviewStatus: OwnershipReviewStatus;
};

export type ApplicationOwnershipDetail = {
  application: Application & { owner: IdentityOwner | null };
  assignedUsers: AssignedUserWithRisk[];
  campaigns: OwnershipCampaignSummary[];
  reviewStatus: OwnershipReviewStatus;
};

export async function getRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getGroups() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getApplications() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("applications").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function createRole(input: unknown) {
  await requireRole(["admin"]);
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").insert(parsed.data).select().single();
  if (error) return { error: { message: error.message } };

  revalidatePath("/identities");
  return { data };
}

export async function createGroup(input: unknown) {
  await requireRole(["admin"]);
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").insert(parsed.data).select().single();
  if (error) return { error: { message: error.message } };

  revalidatePath("/identities");
  return { data };
}

export async function createApplication(input: unknown) {
  await requireRole(["admin"]);
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("applications").insert(parsed.data).select().single();
  if (error) return { error: { message: error.message } };

  revalidatePath("/identities");
  return { data };
}

export async function getSodRules() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sod_rules")
    .select("*, role_a:roles!sod_rules_role_a_id_fkey(id, name), role_b:roles!sod_rules_role_b_id_fkey(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createSodRule(input: unknown) {
  await requireRole(["admin"]);
  const parsed = sodRuleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("sod_rules").insert(parsed.data).select().single();
  if (error) return { error: { message: error.message } };

  await supabase.rpc("write_audit_log", {
    p_event_type: "sod_rule.created",
    p_entity_type: "sod_rule",
    p_entity_id: data.id,
    p_payload: parsed.data,
  });

  revalidatePath("/sod");
  revalidatePath("/risks");
  return { data };
}

export async function deleteSodRule(id: string) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("sod_rules").delete().eq("id", id);
  if (error) return { error: { message: error.message } };

  revalidatePath("/sod");
  revalidatePath("/risks");
  return { success: true };
}

export async function getReviewers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "reviewer"])
    .order("email");
  if (error) throw new Error(error.message);
  return data;
}

async function buildRoleAssignmentCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("identity_roles").select("role_id");
  const countMap: Record<string, number> = {};
  for (const row of data ?? []) {
    countMap[row.role_id] = (countMap[row.role_id] ?? 0) + 1;
  }
  return countMap;
}

async function buildApplicationAssignmentCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("identity_applications").select("application_id");
  const countMap: Record<string, number> = {};
  for (const row of data ?? []) {
    countMap[row.application_id] = (countMap[row.application_id] ?? 0) + 1;
  }
  return countMap;
}

async function buildCampaignMap(
  type: "role" | "application",
  entitlementIds: string[]
) {
  if (entitlementIds.length === 0) return {} as Record<string, OwnershipCampaignSummary[]>;

  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, name, entitlement_id, status, due_date, created_at")
    .eq("type", type)
    .neq("status", "archived")
    .in("entitlement_id", entitlementIds)
    .order("created_at", { ascending: false });

  const map: Record<string, OwnershipCampaignSummary[]> = {};
  for (const campaign of data ?? []) {
    if (!map[campaign.entitlement_id]) {
      map[campaign.entitlement_id] = [];
    }
    map[campaign.entitlement_id].push(campaign);
  }
  return map;
}

export async function getRolesWithOwnership(): Promise<RoleWithOwnership[]> {
  const supabase = await createClient();
  const { data: roles, error } = await supabase
    .from("roles")
    .select("*, owner:identities!roles_owner_id_fkey(id, first_name, last_name, email, department)")
    .order("name");
  if (error) throw new Error(error.message);

  const roleList = roles ?? [];
  const countMap = await buildRoleAssignmentCounts();
  const campaignMap = await buildCampaignMap("role", roleList.map((r) => r.id));

  return roleList.map((role) => {
    const owner = role.owner as IdentityOwner | null;
    const campaigns = campaignMap[role.id] ?? [];
    return {
      ...role,
      owner,
      assigned_user_count: countMap[role.id] ?? 0,
      review_status: deriveReviewStatus(role.owner_id != null, campaigns),
    };
  });
}

export async function getRoleOwnershipDetail(id: string): Promise<RoleOwnershipDetail | null> {
  const supabase = await createClient();
  const { data: role, error } = await supabase
    .from("roles")
    .select("*, owner:identities!roles_owner_id_fkey(id, first_name, last_name, email, department)")
    .eq("id", id)
    .single();
  if (error || !role) return null;

  const owner = role.owner as IdentityOwner | null;

  const { data: assignments } = await supabase
    .from("identity_roles")
    .select(
      "assigned_at, identity:identities(id, first_name, last_name, email, department, risk_score)"
    )
    .eq("role_id", id);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, status, due_date, created_at")
    .eq("type", "role")
    .eq("entitlement_id", id)
    .order("created_at", { ascending: false });

  const assignedUsers: AssignedUserWithRisk[] = (assignments ?? []).map((row) => {
    const identity = row.identity as unknown as Omit<AssignedUserWithRisk, "assigned_at">;
    return {
      ...identity,
      assigned_at: row.assigned_at,
    };
  });

  return {
    role: { ...role, owner } as Role & { owner: IdentityOwner | null },
    assignedUsers,
    campaigns: (campaigns ?? []) as OwnershipCampaignSummary[],
    reviewStatus: deriveReviewStatus(role.owner_id != null, campaigns ?? []),
  };
}

export async function getApplicationsWithOwnership(): Promise<ApplicationWithOwnership[]> {
  const supabase = await createClient();
  const { data: applications, error } = await supabase
    .from("applications")
    .select(
      "*, owner:identities!applications_owner_id_fkey(id, first_name, last_name, email, department)"
    )
    .order("name");
  if (error) throw new Error(error.message);

  const appList = applications ?? [];
  const countMap = await buildApplicationAssignmentCounts();
  const campaignMap = await buildCampaignMap("application", appList.map((a) => a.id));

  return appList.map((app) => {
    const owner = app.owner as IdentityOwner | null;
    const campaigns = campaignMap[app.id] ?? [];
    return {
      ...app,
      owner,
      assigned_user_count: countMap[app.id] ?? 0,
      review_status: deriveReviewStatus(app.owner_id != null, campaigns),
    };
  });
}

export async function getApplicationOwnershipDetail(
  id: string
): Promise<ApplicationOwnershipDetail | null> {
  const supabase = await createClient();
  const { data: application, error } = await supabase
    .from("applications")
    .select(
      "*, owner:identities!applications_owner_id_fkey(id, first_name, last_name, email, department)"
    )
    .eq("id", id)
    .single();
  if (error || !application) return null;

  const owner = application.owner as IdentityOwner | null;

  const { data: assignments } = await supabase
    .from("identity_applications")
    .select(
      "assigned_at, identity:identities(id, first_name, last_name, email, department, risk_score)"
    )
    .eq("application_id", id);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, status, due_date, created_at")
    .eq("type", "application")
    .eq("entitlement_id", id)
    .order("created_at", { ascending: false });

  const assignedUsers: AssignedUserWithRisk[] = (assignments ?? []).map((row) => {
    const identity = row.identity as unknown as Omit<AssignedUserWithRisk, "assigned_at">;
    return {
      ...identity,
      assigned_at: row.assigned_at,
    };
  });

  return {
    application: { ...application, owner } as Application & { owner: IdentityOwner | null },
    assignedUsers,
    campaigns: (campaigns ?? []) as OwnershipCampaignSummary[],
    reviewStatus: deriveReviewStatus(application.owner_id != null, campaigns ?? []),
  };
}

export async function updateRoleOwnership(id: string, input: unknown) {
  await requireRole(["admin"]);
  const parsed = updateRoleOwnershipSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: { message: error.message } };

  await supabase.rpc("write_audit_log", {
    p_event_type: "role.ownership_updated",
    p_entity_type: "role",
    p_entity_id: id,
    p_payload: parsed.data,
  });

  revalidatePath("/ownership/roles");
  revalidatePath(`/ownership/roles/${id}`);
  return { data };
}

export async function updateApplicationOwnership(id: string, input: unknown) {
  await requireRole(["admin"]);
  const parsed = updateApplicationOwnershipSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: { message: error.message } };

  await supabase.rpc("write_audit_log", {
    p_event_type: "application.ownership_updated",
    p_entity_type: "application",
    p_entity_id: id,
    p_payload: parsed.data,
  });

  revalidatePath("/ownership/applications");
  revalidatePath(`/ownership/applications/${id}`);
  return { data };
}

export async function getIdentityOwners() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("identities")
    .select("id, first_name, last_name, email, department")
    .eq("status", "active")
    .order("last_name");
  if (error) throw new Error(error.message);
  return data as IdentityOwner[];
}
