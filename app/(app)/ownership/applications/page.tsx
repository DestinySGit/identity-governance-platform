import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getApplicationsWithOwnership } from "@/app/actions/entitlements";
import { getProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewStatusBadge } from "@/components/ownership/review-status-badge";
import type { CriticalityLevel, ReviewFrequency } from "@/types/database.types";

const frequencyLabels: Record<ReviewFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-annual",
  annual: "Annual",
};

const criticalityVariant: Record<
  CriticalityLevel,
  "success" | "warning" | "destructive" | "critical"
> = {
  low: "success",
  medium: "warning",
  high: "destructive",
  critical: "critical",
};

export default async function ApplicationOwnershipPage() {
  const [applications, profile] = await Promise.all([
    getApplicationsWithOwnership(),
    getProfile(),
  ]);
  const isAdmin = profile?.role === "admin";

  const criticalAppsWithoutOwners = applications.filter(
    (app) => app.criticality_level === "critical" && !app.owner_id
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Application Ownership</h1>
          <p className="text-muted-foreground mt-1">
            Application owners, criticality, and review status
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/ownership/roles">Role Ownership</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/ownership/applications">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Apps Without Owners
              </CardTitle>
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{criticalAppsWithoutOwners}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Assigned Users</TableHead>
              <TableHead>Review Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No applications found
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell>
                    {app.owner
                      ? `${app.owner.first_name} ${app.owner.last_name}`
                      : "—"}
                  </TableCell>
                  <TableCell>{app.owner?.department || "—"}</TableCell>
                  <TableCell>
                    {app.criticality_level ? (
                      <Badge
                        variant={
                          criticalityVariant[app.criticality_level as CriticalityLevel]
                        }
                      >
                        {app.criticality_level}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{app.assigned_user_count}</TableCell>
                  <TableCell>
                    <ReviewStatusBadge status={app.review_status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/ownership/applications/${app.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          You have read-only access to ownership views.
        </p>
      )}
    </div>
  );
}
