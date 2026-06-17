import { getIdentities, getDepartments } from "@/app/actions/identities";
import { getRiskFindings } from "@/app/actions/governance";
import { ExplorerView } from "@/components/explorer/explorer-view";

interface ExplorerPageProps {
  searchParams: Promise<{
    identity?: string;
    department?: string;
    role?: string;
    application?: string;
    risk?: string;
  }>;
}

export default async function ExplorerPage({ searchParams }: ExplorerPageProps) {
  const params = await searchParams;
  const [identities, departments, risks] = await Promise.all([
    getIdentities({
      department: params.department,
    }),
    getDepartments(),
    getRiskFindings({ status: "open" }),
  ]);

  const riskByIdentity = new Map<string, string[]>();
  for (const risk of risks) {
    const list = riskByIdentity.get(risk.identity_id) ?? [];
    list.push(risk.severity);
    riskByIdentity.set(risk.identity_id, list);
  }

  let filtered = identities;
  if (params.risk) {
    filtered = filtered.filter((i) => {
      const severities = riskByIdentity.get(i.id) ?? [];
      return severities.includes(params.risk!);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Entitlement Explorer</h1>
        <p className="text-muted-foreground mt-1">
          Search and visualize user access across roles, groups, and applications
        </p>
      </div>
      <ExplorerView
        identities={filtered}
        departments={departments}
        selectedIdentityId={params.identity}
        filters={{
          department: params.department,
          role: params.role,
          application: params.application,
          risk: params.risk,
        }}
        riskByIdentity={Object.fromEntries(riskByIdentity)}
      />
    </div>
  );
}
