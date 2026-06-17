import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { CsvImportWizard } from "@/components/import/csv-import-wizard";

export default async function ImportPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CSV Import</h1>
        <p className="text-muted-foreground mt-1">
          Import users, roles, groups, applications, and entitlements
        </p>
      </div>
      <CsvImportWizard />
    </div>
  );
}
