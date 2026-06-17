import { redirect } from "next/navigation";
import { getSodRules } from "@/app/actions/entitlements";
import { getProfile } from "@/lib/auth";
import { SodRulesManager } from "@/components/sod/sod-rules-manager";

export default async function SodPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    redirect("/");
  }

  const rules = await getSodRules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Separation of Duties</h1>
        <p className="text-muted-foreground mt-1">
          Configure conflicting role pairs and monitor violations
        </p>
      </div>
      <SodRulesManager initialRules={rules ?? []} />
    </div>
  );
}
