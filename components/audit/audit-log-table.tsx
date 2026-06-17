"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
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
import { formatDateTime } from "@/lib/utils";
import type { AuditLogWithActor } from "@/app/actions/audit";

interface AuditLogTableProps {
  logs: AuditLogWithActor[];
  eventTypes: string[];
  filters: {
    search?: string;
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function AuditLogTable({ logs, eventTypes, filters }: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/audit?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search logs..."
          defaultValue={filters.search ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilter("search", (e.target as HTMLInputElement).value || null);
            }
          }}
          className="w-64"
        />
        <Select
          value={filters.eventType ?? "all"}
          onValueChange={(v) => updateFilter("eventType", v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {eventTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          defaultValue={filters.dateFrom ?? ""}
          onChange={(e) => updateFilter("dateFrom", e.target.value || null)}
          className="w-40"
        />
        <Input
          type="date"
          defaultValue={filters.dateTo ?? ""}
          onChange={(e) => updateFilter("dateTo", e.target.value || null)}
          className="w-40"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Actor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.event_type}</TableCell>
                  <TableCell className="text-sm">
                    {log.entity_type}
                    {log.entity_id && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({log.entity_id.slice(0, 8)}…)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.actor?.display_name ?? log.actor?.email ?? "System"}
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
