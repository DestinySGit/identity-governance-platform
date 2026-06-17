"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getIdentityEntitlements } from "@/app/actions/identities";
import { getRoles, getApplications } from "@/app/actions/entitlements";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Shield, Users, AppWindow } from "lucide-react";
import type { Identity, IdentityEntitlements } from "@/types/database.types";

interface ExplorerViewProps {
  identities: Identity[];
  departments: string[];
  selectedIdentityId?: string;
  filters: {
    department?: string;
    role?: string;
    application?: string;
    risk?: string;
  };
  riskByIdentity: Record<string, string[]>;
}

export function ExplorerView({
  identities,
  departments,
  selectedIdentityId,
  filters,
  riskByIdentity,
}: ExplorerViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entitlements, setEntitlements] = useState<IdentityEntitlements | null>(null);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getRoles().then(setRoles);
    getApplications().then(setApps);
  }, []);

  useEffect(() => {
    if (selectedIdentityId) {
      getIdentityEntitlements(selectedIdentityId).then(setEntitlements);
    } else {
      setEntitlements(null);
    }
  }, [selectedIdentityId]);

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/explorer?${params.toString()}`);
  }

  const selectedIdentity = identities.find((i) => i.id === selectedIdentityId);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.department ?? "all"}
            onValueChange={(v) => updateFilter("department", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Department" />
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
          <Select
            value={filters.risk ?? "all"}
            onValueChange={(v) => updateFilter("risk", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border max-h-[600px] overflow-auto">
          {identities.map((identity) => {
            const risks = riskByIdentity[identity.id] ?? [];
            const maxRisk = risks.includes("critical")
              ? "critical"
              : risks.includes("high")
                ? "high"
                : risks.includes("medium")
                  ? "medium"
                  : null;

            return (
              <button
                key={identity.id}
                type="button"
                onClick={() => updateFilter("identity", identity.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${
                  selectedIdentityId === identity.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {identity.first_name} {identity.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{identity.department}</p>
                  </div>
                  {maxRisk && (
                    <Badge
                      variant={
                        maxRisk === "critical"
                          ? "critical"
                          : maxRisk === "high"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {maxRisk}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedIdentity && entitlements ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link
                  href={`/identities/${selectedIdentity.id}`}
                  className="hover:underline"
                >
                  {selectedIdentity.first_name} {selectedIdentity.last_name}
                </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{selectedIdentity.email}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Roles</h3>
                </div>
                {entitlements.roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">No roles</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {entitlements.roles.map((role) => (
                      <div key={role.id} className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span>{role.name}</span>
                        {role.is_administrative && (
                          <Badge variant="warning" className="text-xs">Admin</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Groups</h3>
                </div>
                {entitlements.groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">No groups</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {entitlements.groups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span>{group.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AppWindow className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Applications</h3>
                </div>
                {entitlements.applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">No applications</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {entitlements.applications.map((app) => (
                      <div key={app.id} className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span>{app.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Select an identity to view their entitlement inventory
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
