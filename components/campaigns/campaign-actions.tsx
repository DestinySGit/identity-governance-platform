"use client";

import { useRouter } from "next/navigation";
import { launchCampaign, completeCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";
import type { CampaignStatus } from "@/types/database.types";

interface CampaignActionsProps {
  campaignId: string;
  status: CampaignStatus;
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const router = useRouter();

  async function handleLaunch() {
    await launchCampaign(campaignId);
    router.refresh();
  }

  async function handleComplete() {
    await completeCampaign(campaignId);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <Button onClick={handleLaunch}>Launch Campaign</Button>
      )}
      {status === "in_progress" && (
        <Button onClick={handleComplete}>Mark Complete</Button>
      )}
    </div>
  );
}
