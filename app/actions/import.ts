"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { evaluateGovernanceRisks } from "@/lib/governance/risk-engine";
import { CHUNK_SIZE } from "@/lib/governance/constants";
import type { ImportType } from "@/schemas/identity.schema";
import type { CriticalityLevel, ReviewFrequency } from "@/types/database.types";

async function resolveOwnerId(
  supabase: ReturnType<typeof createAdminClient>,
  ownerEmail: string | undefined
): Promise<string | null | { error: string }> {
  if (!ownerEmail) return null;
  const { data } = await supabase
    .from("identities")
    .select("id")
    .eq("email", ownerEmail)
    .maybeSingle();
  if (!data) return { error: `Owner not found: ${ownerEmail}` };
  return data.id;
}

export interface ImportRowResult {
  row: number;
  status: "created" | "updated" | "skipped" | "error";
  message?: string;
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: ImportRowResult[];
}

export async function executeImport(
  type: ImportType,
  rows: Record<string, unknown>[]
): Promise<{ summary?: ImportSummary; error?: string }> {
  await requireRole(["admin"]);

  const supabase = createAdminClient();
  const summary: ImportSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    for (let j = 0; j < chunk.length; j++) {
      const rowIndex = i + j + 2;
      const row = chunk[j];

      try {
        if (type === "users") {
          const email = row.email as string;
          const { data: existing } = await supabase
            .from("identities")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          const payload = {
            first_name: row.first_name as string,
            last_name: row.last_name as string,
            email,
            department: (row.department as string) ?? "",
            job_title: (row.job_title as string) ?? "",
            employee_id: row.employee_id as string,
            status: (row.status as "active" | "disabled") ?? "active",
          };

          if (existing) {
            await supabase.from("identities").update(payload).eq("id", existing.id);
            summary.updated++;
            summary.results.push({ row: rowIndex, status: "updated" });
          } else {
            await supabase.from("identities").insert(payload);
            summary.created++;
            summary.results.push({ row: rowIndex, status: "created" });
          }
        } else if (type === "roles") {
          const name = row.name as string;
          const { data: existing } = await supabase
            .from("roles")
            .select("id")
            .eq("name", name)
            .maybeSingle();

          const ownerResult = await resolveOwnerId(
            supabase,
            row.owner_email as string | undefined
          );
          if (typeof ownerResult === "object" && ownerResult !== null && "error" in ownerResult) {
            summary.errors++;
            summary.results.push({ row: rowIndex, status: "error", message: ownerResult.error });
            continue;
          }

          const ownershipFields: {
            owner_id?: string | null;
            review_frequency?: ReviewFrequency | null;
          } = {};
          if (row.owner_email !== undefined) {
            ownershipFields.owner_id = ownerResult as string | null;
          }
          if (row.review_frequency !== undefined) {
            ownershipFields.review_frequency =
              (row.review_frequency as ReviewFrequency) ?? null;
          }

          const payload = {
            name,
            description: (row.description as string) ?? null,
            is_administrative: Boolean(row.is_administrative),
            ...ownershipFields,
          };

          if (existing) {
            if (Object.keys(ownershipFields).length > 0) {
              await supabase.from("roles").update(ownershipFields).eq("id", existing.id);
              summary.updated++;
              summary.results.push({ row: rowIndex, status: "updated", message: "Ownership updated" });
            } else {
              summary.skipped++;
              summary.results.push({ row: rowIndex, status: "skipped", message: "Role exists" });
            }
          } else {
            await supabase.from("roles").insert(payload);
            summary.created++;
            summary.results.push({ row: rowIndex, status: "created" });
          }
        } else if (type === "groups") {
          const name = row.name as string;
          const { data: existing } = await supabase
            .from("groups")
            .select("id")
            .eq("name", name)
            .maybeSingle();

          if (existing) {
            summary.skipped++;
            summary.results.push({ row: rowIndex, status: "skipped", message: "Group exists" });
          } else {
            await supabase.from("groups").insert({
              name,
              description: (row.description as string) ?? null,
            });
            summary.created++;
            summary.results.push({ row: rowIndex, status: "created" });
          }
        } else if (type === "applications") {
          const name = row.name as string;
          const { data: existing } = await supabase
            .from("applications")
            .select("id")
            .eq("name", name)
            .maybeSingle();

          const ownerResult = await resolveOwnerId(
            supabase,
            row.owner_email as string | undefined
          );
          if (typeof ownerResult === "object" && ownerResult !== null && "error" in ownerResult) {
            summary.errors++;
            summary.results.push({ row: rowIndex, status: "error", message: ownerResult.error });
            continue;
          }

          const ownershipFields: {
            owner_id?: string | null;
            criticality_level?: CriticalityLevel | null;
            review_frequency?: ReviewFrequency | null;
          } = {};
          if (row.owner_email !== undefined) {
            ownershipFields.owner_id = ownerResult as string | null;
          }
          if (row.criticality_level !== undefined) {
            ownershipFields.criticality_level =
              (row.criticality_level as CriticalityLevel) ?? null;
          }
          if (row.review_frequency !== undefined) {
            ownershipFields.review_frequency =
              (row.review_frequency as ReviewFrequency) ?? null;
          }

          if (existing) {
            if (Object.keys(ownershipFields).length > 0) {
              await supabase.from("applications").update(ownershipFields).eq("id", existing.id);
              summary.updated++;
              summary.results.push({ row: rowIndex, status: "updated", message: "Ownership updated" });
            } else {
              summary.skipped++;
              summary.results.push({ row: rowIndex, status: "skipped", message: "Application exists" });
            }
          } else {
            await supabase.from("applications").insert({
              name,
              description: (row.description as string) ?? null,
              ...ownershipFields,
            });
            summary.created++;
            summary.results.push({ row: rowIndex, status: "created" });
          }
        } else if (type === "entitlements") {
          const email = row.email as string;
          const entType = row.entitlement_type as "role" | "group" | "application";
          const entName = row.entitlement_name as string;

          const { data: identity } = await supabase
            .from("identities")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (!identity) {
            summary.errors++;
            summary.results.push({ row: rowIndex, status: "error", message: "Identity not found" });
            continue;
          }

          let entId: string | null = null;
          if (entType === "role") {
            const { data } = await supabase.from("roles").select("id").eq("name", entName).maybeSingle();
            entId = data?.id ?? null;
          } else if (entType === "group") {
            const { data } = await supabase.from("groups").select("id").eq("name", entName).maybeSingle();
            entId = data?.id ?? null;
          } else {
            const { data } = await supabase.from("applications").select("id").eq("name", entName).maybeSingle();
            entId = data?.id ?? null;
          }

          if (!entId) {
            summary.errors++;
            summary.results.push({ row: rowIndex, status: "error", message: `${entType} not found` });
            continue;
          }

          const table =
            entType === "role"
              ? "identity_roles"
              : entType === "group"
                ? "identity_groups"
                : "identity_applications";
          const column =
            entType === "role" ? "role_id" : entType === "group" ? "group_id" : "application_id";

          const { error } = await supabase.from(table).upsert({
            identity_id: identity.id,
            [column]: entId,
          });

          if (error) {
            summary.errors++;
            summary.results.push({ row: rowIndex, status: "error", message: error.message });
          } else {
            summary.created++;
            summary.results.push({ row: rowIndex, status: "created" });
          }
        }
      } catch (err) {
        summary.errors++;
        summary.results.push({
          row: rowIndex,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  await supabase.rpc("write_audit_log", {
    p_event_type: "import.completed",
    p_entity_type: "import",
    p_entity_id: null,
    p_payload: { type, ...summary, results: summary.results.slice(0, 20) },
  });

  await evaluateGovernanceRisks();

  revalidatePath("/identities");
  revalidatePath("/explorer");
  revalidatePath("/risks");
  revalidatePath("/ownership/roles");
  revalidatePath("/ownership/applications");
  revalidatePath("/");

  return { summary };
}
