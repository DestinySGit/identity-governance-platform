import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getReviewQueue, type ReviewQueueItem } from "@/app/actions/campaigns";
import { getProfile } from "@/lib/auth";
import type { ReviewQueueFilter } from "@/lib/campaigns/review-routing";
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
import { cn, formatDate } from "@/lib/utils";

interface ReviewsPageProps {
  searchParams: Promise<{ queue?: string }>;
}

const QUEUE_TABS: { value: ReviewQueueFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];

const statusVariant: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
  in_progress: "default",
  completed: "success",
};

function QueueTable({ items, emptyMessage }: { items: ReviewQueueItem[]; emptyMessage: string }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reviewer</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            items.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell className="capitalize">{campaign.type}</TableCell>
                <TableCell>
                  {campaign.reviewer.display_name ?? campaign.reviewer.email}
                </TableCell>
                <TableCell>
                  {campaign.total_count === 0
                    ? "No items"
                    : `${campaign.completion_percent}% (${campaign.total_count - campaign.pending_count}/${campaign.total_count})`}
                </TableCell>
                <TableCell>{formatDate(campaign.due_date)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[campaign.status] ?? "outline"}>
                    {campaign.status.replace("_", " ")}
                  </Badge>
                </TableCell>
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
  );
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const profile = await getProfile();
  if (!profile || profile.role === "viewer") {
    redirect("/");
  }

  const params = await searchParams;
  const queue = (params.queue ?? "pending") as ReviewQueueFilter;

  if (!QUEUE_TABS.some((tab) => tab.value === queue)) {
    notFound();
  }

  const items = await getReviewQueue(queue);

  const emptyMessages: Record<ReviewQueueFilter, string> = {
    pending: "No pending reviews in your queue",
    overdue: "No overdue reviews",
    completed: "No completed reviews yet",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <p className="text-muted-foreground mt-1">
          Pending, overdue, and completed access review campaigns
        </p>
      </div>

      <div className="inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground">
        {QUEUE_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/reviews?queue=${tab.value}`}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
              queue === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <QueueTable items={items} emptyMessage={emptyMessages[queue]} />
    </div>
  );
}
