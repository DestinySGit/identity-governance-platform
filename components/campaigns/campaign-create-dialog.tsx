"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCampaign, getSuggestedReviewer } from "@/app/actions/campaigns";
import {
  getRoles,
  getGroups,
  getApplications,
  getReviewers,
} from "@/app/actions/entitlements";
import { getDepartments } from "@/app/actions/identities";
import { ROUTING_SOURCE_LABELS } from "@/lib/campaigns/review-routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CampaignCreateDialogProps {
  trigger: React.ReactNode;
}

export function CampaignCreateDialog({ trigger }: CampaignCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  const [reviewers, setReviewers] = useState<
    { id: string; email: string; display_name: string | null }[]
  >([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [routingWarning, setRoutingWarning] = useState<string | null>(null);
  const [routingSource, setRoutingSource] = useState<string | null>(null);
  const [manualReviewer, setManualReviewer] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "role" as "application" | "role" | "group",
    reviewer_id: "",
    entitlement_id: "",
    department_filter: "",
    due_date: "",
  });

  useEffect(() => {
    if (open) {
      Promise.all([
        getRoles(),
        getGroups(),
        getApplications(),
        getReviewers(),
        getDepartments(),
      ]).then(([r, g, a, rev, d]) => {
        setRoles(r ?? []);
        setGroups(g ?? []);
        setApps(a ?? []);
        setReviewers(rev ?? []);
        setDepartments(d ?? []);
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open || !form.entitlement_id || manualReviewer) return;

    getSuggestedReviewer(form.type, form.entitlement_id).then((result) => {
      setRoutingWarning(result.warning);
      setRoutingSource(result.source);
      if (result.reviewerId) {
        setForm((prev) => ({ ...prev, reviewer_id: result.reviewerId! }));
      } else if (!manualReviewer) {
        setForm((prev) => ({ ...prev, reviewer_id: "" }));
      }
    });
  }, [open, form.type, form.entitlement_id, manualReviewer]);

  const entitlements =
    form.type === "role" ? roles : form.type === "group" ? groups : apps;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    const payload = {
      ...form,
      department_filter: form.department_filter || undefined,
      due_date: form.due_date || undefined,
      reviewer_id: manualReviewer ? form.reviewer_id || undefined : form.reviewer_id || undefined,
    };

    const result = await createCampaign(payload);
    if (result.error) {
      const err = result.error as { message?: string; reviewer_id?: string[] };
      setSubmitError(
        err.message ??
          err.reviewer_id?.[0] ??
          "Failed to create campaign. Check reviewer assignment."
      );
      setLoading(false);
      return;
    }

    if (result.data) {
      setOpen(false);
      router.push(`/campaigns/${result.data.id}`);
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <div onClick={() => setOpen(true)} role="button" tabIndex={0}>
        {trigger}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create Access Review Campaign</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Review Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  setManualReviewer(false);
                  setRoutingWarning(null);
                  setRoutingSource(null);
                  setForm({
                    ...form,
                    type: v as "application" | "role" | "group",
                    entitlement_id: "",
                    reviewer_id: "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application">Application Review</SelectItem>
                  <SelectItem value="role">Role Review</SelectItem>
                  <SelectItem value="group">Group Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entitlement</Label>
              <Select
                value={form.entitlement_id}
                onValueChange={(v) => {
                  setManualReviewer(false);
                  setForm({ ...form, entitlement_id: v, reviewer_id: "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entitlement..." />
                </SelectTrigger>
                <SelectContent>
                  {entitlements.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reviewer</Label>
              {routingSource && form.reviewer_id && !manualReviewer && (
                <p className="text-xs text-muted-foreground">
                  Auto-assigned from{" "}
                  {ROUTING_SOURCE_LABELS[
                    routingSource as keyof typeof ROUTING_SOURCE_LABELS
                  ] ?? routingSource}
                </p>
              )}
              {routingWarning && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {routingWarning}
                </p>
              )}
              <Select
                value={form.reviewer_id}
                onValueChange={(v) => {
                  setManualReviewer(true);
                  setForm({ ...form, reviewer_id: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {reviewers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.display_name ?? r.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department Filter (optional)</Label>
              <Select
                value={form.department_filter || "all"}
                onValueChange={(v) =>
                  setForm({ ...form, department_filter: v === "all" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Campaign"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
