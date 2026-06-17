import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type ReviewRoutingSource =
  | "role_owner"
  | "application_owner"
  | "group_manager"
  | "manual";

export interface ReviewRoutingResult {
  reviewerId: string | null;
  source: ReviewRoutingSource | null;
  ownerIdentityId: string | null;
  warning: string | null;
}

export type ReviewQueueFilter = "pending" | "completed" | "overdue";

export interface ReviewQueueCampaignMetrics {
  pendingCount: number;
  totalCount: number;
  isOverdue: boolean;
}

export function classifyReviewQueue(
  status: string,
  dueDate: string | null,
  pendingCount: number,
  totalCount: number
): ReviewQueueFilter | null {
  const hasPending = pendingCount > 0;
  const allDecided = totalCount > 0 && pendingCount === 0;

  if (status === "completed" || allDecided) {
    return "completed";
  }

  if (status !== "in_progress" || !hasPending) {
    return null;
  }

  const isOverdue = Boolean(dueDate && new Date(dueDate) < new Date());
  return isOverdue ? "overdue" : "pending";
}

export async function resolveIdentityToReviewerProfile(
  supabase: Supabase,
  identityId: string
): Promise<string | null> {
  const { data: identityRow } = await supabase
    .from("identities")
    .select("email")
    .eq("id", identityId)
    .maybeSingle();

  const email = identityRow?.email;
  if (!email) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .in("role", ["admin", "reviewer"])
    .maybeSingle();

  return profile?.id ?? null;
}

export async function resolveReviewerForCampaign(
  supabase: Supabase,
  type: "application" | "role" | "group",
  entitlementId: string
): Promise<ReviewRoutingResult> {
  if (type === "role") {
    const { data: role } = await supabase
      .from("roles")
      .select("owner_id")
      .eq("id", entitlementId)
      .single();

    if (!role?.owner_id) {
      return {
        reviewerId: null,
        source: null,
        ownerIdentityId: null,
        warning: "This role has no owner. Select a reviewer manually.",
      };
    }

    const reviewerId = await resolveIdentityToReviewerProfile(supabase, role.owner_id);
    if (!reviewerId) {
      return {
        reviewerId: null,
        source: "role_owner",
        ownerIdentityId: role.owner_id,
        warning:
          "Role owner has no linked reviewer profile. Select a reviewer manually.",
      };
    }

    return {
      reviewerId,
      source: "role_owner",
      ownerIdentityId: role.owner_id,
      warning: null,
    };
  }

  if (type === "application") {
    const { data: application } = await supabase
      .from("applications")
      .select("owner_id")
      .eq("id", entitlementId)
      .single();

    if (!application?.owner_id) {
      return {
        reviewerId: null,
        source: null,
        ownerIdentityId: null,
        warning: "This application has no owner. Select a reviewer manually.",
      };
    }

    const reviewerId = await resolveIdentityToReviewerProfile(
      supabase,
      application.owner_id
    );
    if (!reviewerId) {
      return {
        reviewerId: null,
        source: "application_owner",
        ownerIdentityId: application.owner_id,
        warning:
          "Application owner has no linked reviewer profile. Select a reviewer manually.",
      };
    }

    return {
      reviewerId,
      source: "application_owner",
      ownerIdentityId: application.owner_id,
      warning: null,
    };
  }

  const { data: members } = await supabase
    .from("identity_groups")
    .select("identity_id, identities!inner(manager_id)")
    .eq("group_id", entitlementId);

  const managerIds = new Set<string>();
  for (const member of members ?? []) {
    const identity = member.identities as unknown as { manager_id: string | null };
    if (identity.manager_id) {
      managerIds.add(identity.manager_id);
    }
  }

  if (managerIds.size === 0) {
    return {
      reviewerId: null,
      source: null,
      ownerIdentityId: null,
      warning:
        "Group members have no managers assigned. Select a reviewer manually.",
    };
  }

  if (managerIds.size > 1) {
    return {
      reviewerId: null,
      source: null,
      ownerIdentityId: null,
      warning:
        "Group members report to different managers. Select a reviewer manually.",
    };
  }

  const managerId = [...managerIds][0];
  const reviewerId = await resolveIdentityToReviewerProfile(supabase, managerId);
  if (!reviewerId) {
    return {
      reviewerId: null,
      source: "group_manager",
      ownerIdentityId: managerId,
      warning:
        "Group manager has no linked reviewer profile. Select a reviewer manually.",
    };
  }

  return {
    reviewerId,
    source: "group_manager",
    ownerIdentityId: managerId,
    warning: null,
  };
}

export const ROUTING_SOURCE_LABELS: Record<ReviewRoutingSource, string> = {
  role_owner: "Role owner",
  application_owner: "Application owner",
  group_manager: "Group manager",
  manual: "Manual assignment",
};
