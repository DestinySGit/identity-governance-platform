"use client";

import dynamic from "next/dynamic";
import type { GovernanceMetricSnapshot } from "@/types/database.types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const GovernanceTrends = dynamic(
  () =>
    import("@/components/dashboard/governance-trends").then((mod) => mod.GovernanceTrends),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Governance Trends</CardTitle>
          <CardDescription>Loading trend charts...</CardDescription>
        </CardHeader>
      </Card>
    ),
  }
);

interface GovernanceTrendsSectionProps {
  snapshots: GovernanceMetricSnapshot[];
}

export function GovernanceTrendsSection({ snapshots }: GovernanceTrendsSectionProps) {
  return <GovernanceTrends snapshots={snapshots} />;
}
