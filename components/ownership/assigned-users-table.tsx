import Link from "next/link";
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
import {
  getRiskLevel,
  RISK_LEVEL_LABELS,
  type RiskLevel,
} from "@/lib/governance/risk-level";
import { formatDate } from "@/lib/utils";
import type { AssignedUserWithRisk } from "@/types/database.types";

const riskVariant: Record<RiskLevel, "success" | "warning" | "destructive" | "critical"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
  critical: "critical",
};

interface AssignedUsersTableProps {
  users: AssignedUserWithRisk[];
}

export function AssignedUsersTable({ users }: AssignedUsersTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Risk Level</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No assigned users
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const level = getRiskLevel(user.risk_score);
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={riskVariant[level]}>
                      {RISK_LEVEL_LABELS[level]} ({user.risk_score})
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.assigned_at)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/identities/${user.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
