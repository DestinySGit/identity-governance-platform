"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/auth";
import { campaignSchema, reviewDecisionSchema } from "@/schemas/identity.schema";
import {
  classifyReviewQueue,
  resolveReviewerForCampaign,
  type ReviewQueueFilter,
  type ReviewRoutingResult,
} from "@/lib/campaigns/review-routing";
import type {
  CampaignItemWithIdentity,
  CampaignWithReviewer,
  EntitlementType,
} from "@/types/database.types";

export type ReviewQueueItem = CampaignWithReviewer & {
  pending_count: number;
  total_count: number;
  completion_percent: number;
};

export async function getSuggestedReviewer(
  type: "application" | "role" | "group",
  entitlementId: string
): Promise<ReviewRoutingResult> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  return resolveReviewerForCampaign(supabase, type, entitlementId);
}

export async function getCampaigns() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, reviewer:profiles!campaigns_reviewer_id_fkey(id, email, display_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as CampaignWithReviewer[];
}

export async function getCampaign(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, reviewer:profiles!campaigns_reviewer_id_fkey(id, email, display_name)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as CampaignWithReviewer;
}

export async function getCampaignItems(campaignId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_items")
    .select("*, identity:identities(id, first_name, last_name, email, department)")
    .eq("campaign_id", campaignId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as unknown as CampaignItemWithIdentity[];
}

export async function getReviewQueue(queue: ReviewQueueFilter): Promise<ReviewQueueItem[]> {
  const profile = await requireProfile();
  const supabase = await createClient();

  let query = supabase
    .from("campaigns")
    .select("*, reviewer:profiles!campaigns_reviewer_id_fkey(id, email, display_name)")
    .in("status", ["in_progress", "completed"])
    .order("due_date", { ascending: true, nullsFirst: false });

  if (profile.role === "reviewer") {
    query = query.eq("reviewer_id", profile.id);
  }

  const { data: campaigns, error } = await query;
  if (error) throw new Error(error.message);

  const results: ReviewQueueItem[] = [];

  for (const campaign of campaigns ?? []) {
    const metrics = await getCampaignMetrics(campaign.id);
    const queueStatus = classifyReviewQueue(
      campaign.status,
      campaign.due_date,
      metrics.pending,
      metrics.total
    );

    if (queueStatus !== queue) continue;

    results.push({
      ...(campaign as unknown as CampaignWithReviewer),
      pending_count: metrics.pending,
      total_count: metrics.total,
      completion_percent: metrics.completionPercent,
    });
  }

  return results;
}

export async function getCampaignMetrics(campaignId: string) {
  const items = await getCampaignItems(campaignId);
  const total = items.length;
  const pending = items.filter((i) => i.decision === "pending").length;
  const approved = items.filter((i) => i.decision === "approved").length;
  const revoked = items.filter((i) => i.decision === "revoked").length;
  const escalated = items.filter((i) => i.decision === "escalated").length;
  const completed = total - pending;

  return {
    total,
    pending,
    approved,
    revoked,
    escalated,
    completed,
    completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export async function createCampaign(input: unknown) {
  await requireRole(["admin"]);
  const profile = await requireProfile();
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();

  let reviewerId = parsed.data.reviewer_id;
  let routing: ReviewRoutingResult | null = null;

  if (!reviewerId) {
    routing = await resolveReviewerForCampaign(
      supabase,
      parsed.data.type,
      parsed.data.entitlement_id
    );
    reviewerId = routing.reviewerId ?? undefined;
  }

  if (!reviewerId) {
    return {
      error: {
        message:
          routing?.warning ??
          "No reviewer could be assigned automatically. Select a reviewer manually.",
        reviewer_id: ["Reviewer is required when automatic routing is unavailable"],
      },
    };
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      name: parsed.data.name,
      type: parsed.data.type,
      entitlement_id: parsed.data.entitlement_id,
      department_filter: parsed.data.department_filter ?? null,
      due_date: parsed.data.due_date ?? null,
      reviewer_id: reviewerId,
      status: "draft",
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { error: { message: error.message } };

  await generateCampaignItems(campaign.id, parsed.data.type, parsed.data.entitlement_id, parsed.data.department_filter);

  await supabase.rpc("write_audit_log", {
    p_event_type: "campaign.created",
    p_entity_type: "campaign",
    p_entity_id: campaign.id,
    p_payload: {
      ...parsed.data,
      reviewer_id: reviewerId,
    },
  });

  if (routing?.source) {
    await supabase.rpc("write_audit_log", {
      p_event_type: "campaign.reviewer_routed",
      p_entity_type: "campaign",
      p_entity_id: campaign.id,
      p_payload: {
        reviewer_id: reviewerId,
        routing_source: routing.source,
        owner_identity_id: routing.ownerIdentityId,
      },
    });
  }

  revalidatePath("/campaigns");
  revalidatePath("/reviews");
  return { data: campaign };
}

async function generateCampaignItems(
  campaignId: string,
  type: "application" | "role" | "group",
  entitlementId: string,
  departmentFilter?: string
) {
  const supabase = await createClient();

  let entName = "";
  const entType: EntitlementType = type;

  if (type === "role") {
    const { data } = await supabase.from("roles").select("name").eq("id", entitlementId).single();
    entName = data?.name ?? "";
    const { data: assignments } = await supabase
      .from("identity_roles")
      .select("identity_id, identities!inner(id, department)")
      .eq("role_id", entitlementId);

    for (const a of assignments ?? []) {
      const identity = a.identities as unknown as { id: string; department: string };
      if (departmentFilter && identity.department !== departmentFilter) continue;
      await supabase.from("campaign_items").insert({
        campaign_id: campaignId,
        identity_id: a.identity_id,
        entitlement_type: entType,
        entitlement_id: entitlementId,
        entitlement_name: entName,
      });
    }
  } else if (type === "group") {
    const { data } = await supabase.from("groups").select("name").eq("id", entitlementId).single();
    entName = data?.name ?? "";
    const { data: assignments } = await supabase
      .from("identity_groups")
      .select("identity_id, identities!inner(id, department)")
      .eq("group_id", entitlementId);

    for (const a of assignments ?? []) {
      const identity = a.identities as unknown as { id: string; department: string };
      if (departmentFilter && identity.department !== departmentFilter) continue;
      await supabase.from("campaign_items").insert({
        campaign_id: campaignId,
        identity_id: a.identity_id,
        entitlement_type: entType,
        entitlement_id: entitlementId,
        entitlement_name: entName,
      });
    }
  } else {
    const { data } = await supabase.from("applications").select("name").eq("id", entitlementId).single();
    entName = data?.name ?? "";
    const { data: assignments } = await supabase
      .from("identity_applications")
      .select("identity_id, identities!inner(id, department)")
      .eq("application_id", entitlementId);

    for (const a of assignments ?? []) {
      const identity = a.identities as unknown as { id: string; department: string };
      if (departmentFilter && identity.department !== departmentFilter) continue;
      await supabase.from("campaign_items").insert({
        campaign_id: campaignId,
        identity_id: a.identity_id,
        entitlement_type: entType,
        entitlement_id: entitlementId,
        entitlement_name: entName,
      });
    }
  }
}

export async function launchCampaign(id: string) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "in_progress" })
    .eq("id", id);

  if (error) return { error: { message: error.message } };

  revalidatePath("/campaigns");
  revalidatePath("/reviews");
  return { success: true };
}

export async function completeCampaign(id: string) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "completed" })
    .eq("id", id);

  if (error) return { error: { message: error.message } };

  await supabase.rpc("write_audit_log", {
    p_event_type: "campaign.completed",
    p_entity_type: "campaign",
    p_entity_id: id,
    p_payload: {},
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/reviews");
  return { success: true };
}

export async function submitReviewDecision(
  itemId: string,
  input: unknown
) {
  const profile = await requireProfile();
  if (profile.role === "viewer") {
    return { error: { message: "Forbidden" } };
  }

  const parsed = reviewDecisionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();

  const { data: item, error: fetchError } = await supabase
    .from("campaign_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (fetchError || !item) return { error: { message: "Item not found" } };

  const { error } = await supabase
    .from("campaign_items")
    .update({
      decision: parsed.data.decision,
      notes: parsed.data.notes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
    })
    .eq("id", itemId);

  if (error) return { error: { message: error.message } };

  if (parsed.data.decision === "revoked") {
    const table =
      item.entitlement_type === "role"
        ? "identity_roles"
        : item.entitlement_type === "group"
          ? "identity_groups"
          : "identity_applications";
    const column =
      item.entitlement_type === "role"
        ? "role_id"
        : item.entitlement_type === "group"
          ? "group_id"
          : "application_id";

    await supabase
      .from(table)
      .delete()
      .eq("identity_id", item.identity_id)
      .eq(column, item.entitlement_id);
  }

  await supabase.rpc("write_audit_log", {
    p_event_type: "review.decision",
    p_entity_type: "campaign_item",
    p_entity_id: itemId,
    p_payload: {
      decision: parsed.data.decision,
      notes: parsed.data.notes,
      identity_id: item.identity_id,
    },
  });

  revalidatePath(`/campaigns/${item.campaign_id}`);
  revalidatePath("/reviews");
  revalidatePath("/identities");
  return { success: true };
}
