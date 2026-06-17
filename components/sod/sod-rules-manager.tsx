"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSodRule, deleteSodRule, getRoles } from "@/app/actions/entitlements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface SodRuleRow {
  id: string;
  role_a_id: string;
  role_b_id: string;
  risk_level: "medium" | "high" | "critical";
  description: string;
  role_a: { id: string; name: string };
  role_b: { id: string; name: string };
}

interface SodRulesManagerProps {
  initialRules: SodRuleRow[];
}

export function SodRulesManager({ initialRules }: SodRulesManagerProps) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    role_a_id: "",
    role_b_id: "",
    risk_level: "critical" as "medium" | "high" | "critical",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  useEffect(() => {
    getRoles().then(setRoles);
  }, []);

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createSodRule(form);
    if (!result.error) {
      setForm({ role_a_id: "", role_b_id: "", risk_level: "critical", description: "" });
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this SoD rule?")) return;
    await deleteSodRule(id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create SoD Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Role A</Label>
              <Select
                value={form.role_a_id}
                onValueChange={(v) => setForm({ ...form, role_a_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role B (conflicts with A)</Label>
              <Select
                value={form.role_b_id}
                onValueChange={(v) => setForm({ ...form, role_b_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select
                value={form.risk_level}
                onValueChange={(v) =>
                  setForm({ ...form, risk_level: v as "medium" | "high" | "critical" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the conflict..."
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading || !form.role_a_id || !form.role_b_id}>
                Create Rule
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role A</TableHead>
              <TableHead>Role B</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Description</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No SoD rules configured
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => {
                const isExpanded = expandedRuleId === rule.id;
                return (
                <TableRow key={rule.id}>
                  <TableCell>{rule.role_a.name}</TableCell>
                  <TableCell>{rule.role_b.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rule.risk_level === "critical"
                          ? "critical"
                          : rule.risk_level === "high"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {rule.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p
                      className={
                        isExpanded
                          ? "whitespace-normal break-words text-sm"
                          : "line-clamp-2 text-sm"
                      }
                      title={rule.description}
                    >
                      {rule.description || "—"}
                    </p>
                    {rule.description.length > 80 && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          setExpandedRuleId(isExpanded ? null : rule.id)
                        }
                      >
                        {isExpanded ? (
                          <>
                            Show less <ChevronUp className="ml-1 inline h-3 w-3" />
                          </>
                        ) : (
                          <>
                            Show full rule <ChevronDown className="ml-1 inline h-3 w-3" />
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
