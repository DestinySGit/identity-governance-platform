"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { identitySchema, updateIdentitySchema } from "@/schemas/identity.schema";
import type { Identity, IdentityEntitlements, IdentityWithManager, RiskFinding } from "@/types/database.types";

export async function getIdentities(filters?: {
  search?: string;
  department?: string;
  status?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("identities")
    .select("*")
    .order("last_name", { ascending: true });

  if (filters?.department) {
    query = query.eq("department", filters.department);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status as "active" | "disabled");
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let results = (data ?? []) as Identity[];

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(
      (i) =>
        i.first_name.toLowerCase().includes(term) ||
        i.last_name.toLowerCase().includes(term) ||
        i.email.toLowerCase().includes(term) ||
        i.employee_id.toLowerCase().includes(term)
    );
  }

  return results;
}

export async function getIdentity(id: string): Promise<IdentityWithManager | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("identities")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  let manager: IdentityWithManager["manager"] = null;
  if (data.manager_id) {
    const { data: managerData } = await supabase
      .from("identities")
      .select("id, first_name, last_name, email")
      .eq("id", data.manager_id)
      .single();
    manager = managerData;
  }

  return { ...data, manager } as IdentityWithManager;
}

export async function getIdentityEntitlements(id: string): Promise<IdentityEntitlements> {
  const supabase = await createClient();

  const [rolesRes, groupsRes, appsRes] = await Promise.all([
    supabase
      .from("identity_roles")
      .select("assigned_at, roles(*)")
      .eq("identity_id", id),
    supabase
      .from("identity_groups")
      .select("assigned_at, groups(*)")
      .eq("identity_id", id),
    supabase
      .from("identity_applications")
      .select("assigned_at, applications(*)")
      .eq("identity_id", id),
  ]);

  return {
    roles: (rolesRes.data ?? []).map((r: { assigned_at: string; roles: unknown }) => ({
      ...(r.roles as object),
      assigned_at: r.assigned_at,
    })) as IdentityEntitlements["roles"],
    groups: (groupsRes.data ?? []).map((g: { assigned_at: string; groups: unknown }) => ({
      ...(g.groups as object),
      assigned_at: g.assigned_at,
    })) as IdentityEntitlements["groups"],
    applications: (appsRes.data ?? []).map((a: { assigned_at: string; applications: unknown }) => ({
      ...(a.applications as object),
      assigned_at: a.assigned_at,
    })) as IdentityEntitlements["applications"],
  };
}

export async function getDepartments(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("identities").select("department");
  const departments = new Set(
    ((data ?? []) as Pick<Identity, "department">[])
      .map((d) => d.department)
      .filter(Boolean)
  );
  return Array.from(departments).sort();
}

export async function createIdentity(input: unknown) {
  await requireRole(["admin"]);
  const parsed = identitySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("identities")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return { error: { message: error.message } };

  revalidatePath("/identities");
  return { data };
}

export async function updateIdentity(id: string, input: unknown) {
  await requireRole(["admin"]);
  const parsed = updateIdentitySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("identities")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: { message: error.message } };

  revalidatePath("/identities");
  revalidatePath(`/identities/${id}`);
  return { data };
}

export async function disableIdentity(id: string) {
  return updateIdentity(id, { status: "disabled" });
}

export async function assignEntitlement(
  identityId: string,
  type: "role" | "group" | "application",
  entitlementId: string
) {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const table =
    type === "role"
      ? "identity_roles"
      : type === "group"
        ? "identity_groups"
        : "identity_applications";

  const column =
    type === "role" ? "role_id" : type === "group" ? "group_id" : "application_id";

  const { error } = await supabase.from(table).insert({
    identity_id: identityId,
    [column]: entitlementId,
  });

  if (error) return { error: { message: error.message } };

  revalidatePath(`/identities/${identityId}`);
  revalidatePath("/explorer");
  return { success: true };
}

export async function removeEntitlement(
  identityId: string,
  type: "role" | "group" | "application",
  entitlementId: string
) {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const table =
    type === "role"
      ? "identity_roles"
      : type === "group"
        ? "identity_groups"
        : "identity_applications";

  const column =
    type === "role" ? "role_id" : type === "group" ? "group_id" : "application_id";

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("identity_id", identityId)
    .eq(column, entitlementId);

  if (error) return { error: { message: error.message } };

  revalidatePath(`/identities/${identityId}`);
  revalidatePath("/explorer");
  return { success: true };
}
