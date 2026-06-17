import { notFound } from "next/navigation";
import {
  getCampaign,
  getCampaignItems,
  getCampaignMetrics,
} from "@/app/actions/campaigns";
import { getProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { CampaignActions } from "@/components/campaigns/campaign-actions";
import { ReviewItemsTable } from "@/components/campaigns/review-items-table";
import { formatDate } from "@/lib/utils";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const [campaign, items, metrics, profile] = await Promise.all([
    getCampaign(id),
    getCampaignItems(id),
    getCampaignMetrics(id),
    getProfile(),
  ]);

  if (!campaign) notFound();

  const canReview =
    profile?.role === "admin" ||
    (profile?.role === "reviewer" && campaign.reviewer_id === profile.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <div className="flex gap-2 mt-2">
            <Badge className="capitalize">{campaign.type} review</Badge>
            <Badge variant="outline">{campaign.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Reviewer: {campaign.reviewer.display_name ?? campaign.reviewer.email}
            {campaign.due_date && ` · Due ${formatDate(campaign.due_date)}`}
          </p>
        </div>
        {profile?.role === "admin" && (
          <CampaignActions campaignId={id} status={campaign.status} />
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{metrics.total}</p>
          <p className="text-sm text-muted-foreground">Total Items</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{metrics.approved}</p>
          <p className="text-sm text-muted-foreground">Approved</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{metrics.revoked}</p>
          <p className="text-sm text-muted-foreground">Revoked</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{metrics.completionPercent}%</p>
          <p className="text-sm text-muted-foreground">Complete</p>
        </div>
      </div>

      <ReviewItemsTable items={items} canReview={canReview} />
    </div>
  );
}
