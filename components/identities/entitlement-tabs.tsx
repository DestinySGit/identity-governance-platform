"use client";

import { useRouter } from "next/navigation";
import { assignEntitlement, removeEntitlement } from "@/app/actions/identities";
import { getRoles, getGroups, getApplications } from "@/app/actions/entitlements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import type { IdentityEntitlements } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

interface EntitlementTabsProps {
  identityId: string;
  entitlements: IdentityEntitlements;
  isAdmin: boolean;
}

export function EntitlementTabs({
  identityId,
  entitlements,
  isAdmin,
}: EntitlementTabsProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedApp, setSelectedApp] = useState("");

  useEffect(() => {
    if (isAdmin) {
      Promise.all([getRoles(), getGroups(), getApplications()]).then(
        ([r, g, a]) => {
          setRoles(r ?? []);
          setGroups(g ?? []);
          setApps(a ?? []);
        }
      );
    }
  }, [isAdmin]);

  async function handleAssign(type: "role" | "group" | "application", id: string) {
    await assignEntitlement(identityId, type, id);
    router.refresh();
  }

  async function handleRemove(type: "role" | "group" | "application", id: string) {
    await removeEntitlement(identityId, type, id);
    router.refresh();
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="font-semibold mb-4">Entitlements</h2>
      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles ({entitlements.roles.length})</TabsTrigger>
          <TabsTrigger value="groups">Groups ({entitlements.groups.length})</TabsTrigger>
          <TabsTrigger value="apps">
            Applications ({entitlements.applications.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="space-y-3 mt-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedRole}
                onClick={() => handleAssign("role", selectedRole)}
              >
                Assign
              </Button>
            </div>
          )}
          {entitlements.roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{role.name}</p>
                <p className="text-xs text-muted-foreground">
                  Assigned {formatDateTime(role.assigned_at)}
                  {role.is_administrative && (
                    <Badge variant="warning" className="ml-2">Admin</Badge>
                  )}
                </p>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove("role", role.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {entitlements.roles.length === 0 && (
            <p className="text-sm text-muted-foreground">No roles assigned</p>
          )}
        </TabsContent>
        <TabsContent value="groups" className="space-y-3 mt-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedGroup}
                onClick={() => handleAssign("group", selectedGroup)}
              >
                Assign
              </Button>
            </div>
          )}
          {entitlements.groups.map((group) => (
            <div key={group.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  Assigned {formatDateTime(group.assigned_at)}
                </p>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove("group", group.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {entitlements.groups.length === 0 && (
            <p className="text-sm text-muted-foreground">No groups assigned</p>
          )}
        </TabsContent>
        <TabsContent value="apps" className="space-y-3 mt-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add application..." />
                </SelectTrigger>
                <SelectContent>
                  {apps.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedApp}
                onClick={() => handleAssign("application", selectedApp)}
              >
                Assign
              </Button>
            </div>
          )}
          {entitlements.applications.map((app) => (
            <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{app.name}</p>
                <p className="text-xs text-muted-foreground">
                  Assigned {formatDateTime(app.assigned_at)}
                </p>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove("application", app.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {entitlements.applications.length === 0 && (
            <p className="text-sm text-muted-foreground">No applications assigned</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
