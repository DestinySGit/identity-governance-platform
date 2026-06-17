import { notFound } from "next/navigation";
import {
  getIdentity,
  getIdentityEntitlements,
} from "@/app/actions/identities";
import { getIdentityTimeline } from "@/app/actions/audit";
import { getIdentityRiskFindings } from "@/app/actions/governance";
import { getProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { IdentityDetailActions } from "@/components/identities/identity-detail-actions";
import { IdentityRiskBanner } from "@/components/identities/identity-risk-banner";
import { EntitlementTabs } from "@/components/identities/entitlement-tabs";
import { IdentityTimeline } from "@/components/identities/identity-timeline";
import { formatDate } from "@/lib/utils";

interface IdentityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IdentityDetailPage({ params }: IdentityDetailPageProps) {
  const { id } = await params;
  const [identity, entitlements, timeline, riskFindings, profile] = await Promise.all([
    getIdentity(id),
    getIdentityEntitlements(id),
    getIdentityTimeline(id),
    getIdentityRiskFindings(id),
    getProfile(),
  ]);

  if (!identity) notFound();

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {identity.first_name} {identity.last_name}
          </h1>
          <p className="text-muted-foreground mt-1">{identity.email}</p>
          <div className="flex gap-2 mt-3">
            <Badge variant={identity.status === "active" ? "success" : "secondary"}>
              {identity.status}
            </Badge>
            <Badge variant="outline">{identity.department || "No department"}</Badge>
          </div>
        </div>
        {isAdmin && <IdentityDetailActions identity={identity} />}
      </div>

      <IdentityRiskBanner riskScore={identity.risk_score} findings={riskFindings} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold">Profile</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Employee ID</dt>
            <dd>{identity.employee_id}</dd>
            <dt className="text-muted-foreground">Job Title</dt>
            <dd>{identity.job_title || "—"}</dd>
            <dt className="text-muted-foreground">Department</dt>
            <dd>{identity.department || "—"}</dd>
            <dt className="text-muted-foreground">Manager</dt>
            <dd>
              {identity.manager
                ? `${identity.manager.first_name} ${identity.manager.last_name}`
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Last Login</dt>
            <dd>{formatDate(identity.last_login)}</dd>
          </dl>
        </div>

        <EntitlementTabs
          identityId={id}
          entitlements={entitlements}
          isAdmin={isAdmin}
        />
      </div>

      <IdentityTimeline events={timeline ?? []} />
    </div>
  );
}
