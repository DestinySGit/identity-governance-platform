import Link from "next/link";
import { getCampaigns } from "@/app/actions/campaigns";
import { getProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignCreateDialog } from "@/components/campaigns/campaign-create-dialog";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface CampaignsPageProps {
  searchParams: Promise<{ status?: string }>;
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "outline"> = {
  draft: "outline",
  in_progress: "default",
  completed: "success",
  archived: "secondary",
};

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const params = await searchParams;
  const [campaigns, profile] = await Promise.all([getCampaigns(), getProfile()]);
  const isAdmin = profile?.role === "admin";

  const filtered = params.status
    ? campaigns.filter((c) => c.status === params.status)
    : campaigns;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Access Review Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Conduct application, role, and group access certifications
          </p>
        </div>
        {isAdmin && (
          <CampaignCreateDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            }
          />
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No campaigns found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="capitalize">{campaign.type}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[campaign.status] ?? "outline"}>
                      {campaign.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.reviewer.display_name ?? campaign.reviewer.email}
                  </TableCell>
                  <TableCell>{formatDate(campaign.due_date)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/campaigns/${campaign.id}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
