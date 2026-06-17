"use client";

import { useState } from "react";
import { exportAuditLogsCsv } from "@/app/actions/audit";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface AuditExportButtonProps {
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function AuditExportButton({
  eventType,
  dateFrom,
  dateTo,
}: AuditExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const csv = await exportAuditLogsCsv({ eventType, dateFrom, dateTo });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      <Download className="h-4 w-4 mr-2" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
