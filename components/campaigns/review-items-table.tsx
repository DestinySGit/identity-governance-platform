"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReviewDecision } from "@/app/actions/campaigns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CampaignItemWithIdentity } from "@/types/database.types";

interface ReviewItemsTableProps {
  items: CampaignItemWithIdentity[];
  canReview: boolean;
}

const decisionVariant: Record<string, "default" | "success" | "destructive" | "warning" | "outline"> = {
  pending: "outline",
  approved: "success",
  revoked: "destructive",
  escalated: "warning",
};

export function ReviewItemsTable({ items, canReview }: ReviewItemsTableProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function handleDecision(
    itemId: string,
    decision: "approved" | "revoked" | "escalated"
  ) {
    setLoading(itemId);
    await submitReviewDecision(itemId, {
      decision,
      notes: notes[itemId],
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Identity</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Entitlement</TableHead>
            <TableHead>Decision</TableHead>
            {canReview && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No review items generated for this campaign scope
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/identities/${item.identity.id}`}
                    className="hover:underline text-primary"
                  >
                    {item.identity.first_name} {item.identity.last_name}
                  </Link>
                </TableCell>
                <TableCell>{item.identity.department}</TableCell>
                <TableCell>{item.entitlement_name}</TableCell>
                <TableCell>
                  <Badge variant={decisionVariant[item.decision] ?? "outline"}>
                    {item.decision}
                  </Badge>
                </TableCell>
                {canReview && (
                  <TableCell>
                    {item.decision === "pending" ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Notes (optional)"
                          value={notes[item.id] ?? ""}
                          onChange={(e) =>
                            setNotes({ ...notes, [item.id]: e.target.value })
                          }
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading === item.id}
                            onClick={() => handleDecision(item.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={loading === item.id}
                            onClick={() => handleDecision(item.id, "revoked")}
                          >
                            Revoke
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={loading === item.id}
                            onClick={() => handleDecision(item.id, "escalated")}
                          >
                            Escalate
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {item.notes ?? "—"}
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
