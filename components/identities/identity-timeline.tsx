import { RISK_RULE_LABELS } from "@/lib/governance/constants";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const EVENT_LABELS: Record<string, string> = {
  "identity.created": "Identity Created",
  "identity.updated": "Identity Updated",
  "identity.disabled": "Identity Disabled",
  "entitlement.assigned": "Entitlement Assigned",
  "entitlement.removed": "Entitlement Removed",
  "review.decision": "Review Decision",
  "risk.detected": "Risk Detected",
  "import.completed": "Import Completed",
  "campaign.created": "Campaign Created",
  "campaign.completed": "Campaign Completed",
  "sod_rule.created": "SoD Rule Created",
  ...RISK_RULE_LABELS,
};

interface TimelineEvent {
  id: string;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown>;
  actor?: { email?: string; display_name?: string | null } | null;
}

interface IdentityTimelineProps {
  events: TimelineEvent[];
}

export function IdentityTimeline({ events }: IdentityTimelineProps) {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="font-semibold mb-6">Activity Timeline</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet</p>
      ) : (
        <div className="relative space-y-0">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
                {index < events.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">
                    {EVENT_LABELS[event.event_type] ?? event.event_type}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {formatDateTime(event.created_at)}
                  </Badge>
                </div>
                {event.actor && (
                  <p className="text-xs text-muted-foreground mt-1">
                    by {event.actor.display_name ?? event.actor.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
