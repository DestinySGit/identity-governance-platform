"use server";

import { createClient } from "@/lib/supabase/server";

export type AuditLogWithActor = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  actor: { id: string; email: string; display_name: string | null } | null;
};

export async function getAuditLogs(filters?: {
  search?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<AuditLogWithActor[]> {
  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("*, actor:profiles(id, email, display_name)")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 200);

  if (filters?.eventType) {
    query = query.eq("event_type", filters.eventType);
  }
  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let logs = (data ?? []) as AuditLogWithActor[];

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    logs = logs.filter(
      (log) =>
        log.event_type.toLowerCase().includes(term) ||
        log.entity_type.toLowerCase().includes(term) ||
        JSON.stringify(log.payload).toLowerCase().includes(term)
    );
  }

  return logs;
}

export async function getIdentityTimeline(identityId: string) {
  const supabase = await createClient();

  const { data: byEntity, error: entityError } = await supabase
    .from("audit_logs")
    .select("*, actor:profiles(id, email, display_name)")
    .eq("entity_id", identityId)
    .order("created_at", { ascending: true });

  if (entityError) throw new Error(entityError.message);

  const { data: reviewLogs, error: reviewError } = await supabase
    .from("audit_logs")
    .select("*, actor:profiles(id, email, display_name)")
    .eq("event_type", "review.decision")
    .order("created_at", { ascending: true });

  if (reviewError) throw new Error(reviewError.message);

  const relatedReviews = ((reviewLogs ?? []) as AuditLogWithActor[]).filter((log) => {
    const payload = log.payload as Record<string, unknown>;
    return payload?.identity_id === identityId;
  });

  const merged = [...((byEntity ?? []) as AuditLogWithActor[]), ...relatedReviews];
  const seen = new Set<string>();
  return merged
    .filter((log) => {
      if (seen.has(log.id)) return false;
      seen.add(log.id);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export async function exportAuditLogsCsv(filters?: {
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<string> {
  const logs = await getAuditLogs({ ...filters, limit: 10000 });

  const headers = ["id", "event_type", "entity_type", "entity_id", "actor_email", "created_at", "payload"];
  const rows = logs.map((log) => {
    const actor = log.actor as { email?: string } | null;
    return [
      log.id,
      log.event_type,
      log.entity_type,
      log.entity_id ?? "",
      actor?.email ?? "",
      log.created_at,
      JSON.stringify(log.payload),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export async function getAuditEventTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_logs").select("event_type");
  const types = new Set(
    ((data ?? []) as { event_type: string }[]).map((d) => d.event_type)
  );
  return Array.from(types).sort();
}
