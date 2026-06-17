import { Badge } from "@/components/ui/badge";
import {
  REVIEW_STATUS_LABELS,
  type OwnershipReviewStatus,
} from "@/lib/ownership/review-status";

const statusVariant: Record<
  OwnershipReviewStatus,
  "default" | "secondary" | "success" | "outline" | "destructive" | "warning"
> = {
  no_owner: "secondary",
  no_campaign: "outline",
  draft: "outline",
  in_progress: "default",
  overdue: "destructive",
  completed: "success",
};

interface ReviewStatusBadgeProps {
  status: OwnershipReviewStatus | string;
}

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const key = status as OwnershipReviewStatus;
  return (
    <Badge variant={statusVariant[key] ?? "outline"}>
      {REVIEW_STATUS_LABELS[key] ?? status}
    </Badge>
  );
}
