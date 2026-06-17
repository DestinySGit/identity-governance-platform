import Link from "next/link";
import { Suspense } from "react";
import { getIdentities, getDepartments } from "@/app/actions/identities";
import { getProfile } from "@/lib/auth";
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
import { IdentityFilters } from "@/components/identities/identity-filters";
import { IdentityFormDialog } from "@/components/identities/identity-form-dialog";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface IdentitiesPageProps {
  searchParams: Promise<{
    search?: string;
    department?: string;
    status?: string;
  }>;
}

export default async function IdentitiesPage({ searchParams }: IdentitiesPageProps) {
  const params = await searchParams;
  const [identities, departments, profile] = await Promise.all([
    getIdentities({
      search: params.search,
      department: params.department,
      status: params.status,
    }),
    getDepartments(),
    getProfile(),
  ]);

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Identities</h1>
          <p className="text-muted-foreground mt-1">
            Governed user repository — {identities.length} records
          </p>
        </div>
        {isAdmin && (
          <IdentityFormDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Identity
              </Button>
            }
          />
        )}
      </div>

      <Suspense fallback={null}>
        <IdentityFilters departments={departments} />
      </Suspense>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {identities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No identities found
                </TableCell>
              </TableRow>
            ) : (
              identities.map((identity) => (
                <TableRow key={identity.id}>
                  <TableCell className="font-medium">
                    {identity.first_name} {identity.last_name}
                  </TableCell>
                  <TableCell>{identity.email}</TableCell>
                  <TableCell>{identity.department || "—"}</TableCell>
                  <TableCell>{identity.job_title || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={identity.status === "active" ? "success" : "secondary"}>
                      {identity.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(identity.last_login)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/identities/${identity.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
