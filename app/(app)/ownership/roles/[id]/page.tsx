import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIdentityOwners,
  getRoleOwnershipDetail,
} from "@/app/actions/entitlements";
import { getProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssignedUsersTable } from "@/components/ownership/assigned-users-table";
import { RoleOwnershipEditor } from "@/components/ownership/role-ownership-editor";
import { ReviewStatusBadge } from "@/components/ownership/review-status-badge";
import { formatDate } from "@/lib/utils";
import type { ReviewFrequency } from "@/types/database.types";

const frequencyLabels: Record<ReviewFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-annual",
  annual: "Annual",
};

interface RoleOwnershipDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoleOwnershipDetailPage({
  params,
}: RoleOwnershipDetailPageProps) {
  const { id } = await params;
  const [detail, owners, profile] = await Promise.all([
    getRoleOwnershipDetail(id),
    getIdentityOwners(),
    getProfile(),
  ]);

  if (!detail) notFound();

  const { role, assignedUsers, campaigns, reviewStatus } = detail;
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/ownership/roles">← Back to roles</Link>
          </Button>
          <h1 className="text-3xl font-bold">{role.name}</h1>
          <p className="text-muted-foreground mt-1">{role.description || "No description"}</p>
          <div className="flex gap-2 mt-3">
            {role.is_administrative && <Badge variant="warning">Administrative</Badge>}
            <ReviewStatusBadge status={reviewStatus} />
          </div>
        </div>
        {isAdmin && <RoleOwnershipEditor role={role} owners={owners} />}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold">Owner</h2>
          {role.owner ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd>
                <Link
                  href={`/identities/${role.owner.id}`}
                  className="text-primary hover:underline"
                >
                  {role.owner.first_name} {role.owner.last_name}
                </Link>
              </dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{role.owner.email}</dd>
              <dt className="text-muted-foreground">Department</dt>
              <dd>{role.owner.department || "—"}</dd>
              <dt className="text-muted-foreground">Review Frequency</dt>
              <dd>
                {role.review_frequency
                  ? frequencyLabels[role.review_frequency]
                  : "—"}
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No owner assigned</p>
          )}
        </div>

        <div className="rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold">Review Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No review campaigns</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {campaigns.map((campaign) => (
                <li key={campaign.id} className="flex items-center justify-between">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="text-primary hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <span className="text-muted-foreground capitalize">
                    {campaign.status.replace("_", " ")}
                    {campaign.due_date ? ` · due ${formatDate(campaign.due_date)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">
          Assigned Users ({assignedUsers.length})
        </h2>
        <AssignedUsersTable users={assignedUsers} />
      </div>
    </div>
  );
}
