import Link from "next/link";
import { AlertTriangle, ShieldAlert, UserX } from "lucide-react";
import { getRolesWithOwnership } from "@/app/actions/entitlements";
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
import type { ReviewFrequency } from "@/types/database.types";

const frequencyLabels: Record<ReviewFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-annual",
  annual: "Annual",
};

export default async function RoleOwnershipPage() {
  const [roles, profile] = await Promise.all([getRolesWithOwnership(), getProfile()]);
  const isAdmin = profile?.role === "admin";

  const rolesWithoutOwners = roles.filter((role) => !role.owner_id).length;
  const overdueRoleReviews = roles.filter((role) => role.review_status === "overdue").length;

  const summaryCards = [
    {
      title: "Roles Without Owners",
      value: rolesWithoutOwners,
      icon: UserX,
      href: "/ownership/roles",
      color: "text-amber-600",
    },
    {
      title: "Overdue Role Reviews",
      value: overdueRoleReviews,
      icon: AlertTriangle,
      href: "/reviews?queue=overdue",
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Ownership</h1>
          <p className="text-muted-foreground mt-1">
            Governed role owners, assignment counts, and review status
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/ownership/applications">Application Ownership</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Assigned Users</TableHead>
              <TableHead>Review Frequency</TableHead>
              <TableHead>Review Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No roles found
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {role.name}
                      {role.is_administrative && (
                        <Badge variant="warning">Admin</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {role.owner
                      ? `${role.owner.first_name} ${role.owner.last_name}`
                      : "—"}
                  </TableCell>
                  <TableCell>{role.owner?.department || "—"}</TableCell>
                  <TableCell>{role.assigned_user_count}</TableCell>
                  <TableCell>
                    {role.review_frequency
                      ? frequencyLabels[role.review_frequency]
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ReviewStatusBadge status={role.review_status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/ownership/roles/${role.id}`}>View</Link>
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
