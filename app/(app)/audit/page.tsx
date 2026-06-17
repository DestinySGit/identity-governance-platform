import { getAuditLogs, getAuditEventTypes } from "@/app/actions/audit";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { AuditExportButton } from "@/components/audit/audit-export-button";

interface AuditPageProps {
  searchParams: Promise<{
    search?: string;
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  const [logs, eventTypes] = await Promise.all([
    getAuditLogs({
      search: params.search,
      eventType: params.eventType,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    getAuditEventTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground mt-1">
            Immutable record of all governance activity
          </p>
        </div>
        <AuditExportButton
          eventType={params.eventType}
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
        />
      </div>
      <AuditLogTable
        logs={logs}
        eventTypes={eventTypes}
        filters={{
          search: params.search,
          eventType: params.eventType,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        }}
      />
    </div>
  );
}
