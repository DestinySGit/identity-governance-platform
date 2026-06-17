export type OwnershipReviewStatus =
  | "no_owner"
  | "no_campaign"
  | "draft"
  | "in_progress"
  | "overdue"
  | "completed";

export interface EntitlementCampaignSummary {
  status: string;
  due_date: string | null;
}

export function deriveReviewStatus(
  hasOwner: boolean,
  campaigns: EntitlementCampaignSummary[]
): OwnershipReviewStatus {
  if (!hasOwner) return "no_owner";
  const active = campaigns.filter((c) => c.status !== "archived");
  if (active.length === 0) return "no_campaign";

  const latest = active[0];
  if (latest.status === "completed") return "completed";
  if (latest.status === "draft") return "draft";
  if (latest.status === "in_progress") {
    const isOverdue =
      latest.due_date && new Date(latest.due_date) < new Date();
    return isOverdue ? "overdue" : "in_progress";
  }
  return "no_campaign";
}

export const REVIEW_STATUS_LABELS: Record<OwnershipReviewStatus, string> = {
  no_owner: "No owner",
  no_campaign: "No campaign",
  draft: "Draft",
  in_progress: "In progress",
  overdue: "Overdue",
  completed: "Completed",
};
