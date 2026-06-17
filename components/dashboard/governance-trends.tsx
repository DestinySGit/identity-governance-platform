"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GovernanceMetricSnapshot } from "@/types/database.types";
import {
  TREND_METRICS,
  computeTrendChange,
  formatComparisonLabel,
  getLatestSnapshot,
  getPriorSnapshot,
  getSnapshotMetricValue,
  toChartData,
  type TrendMetricKey,
} from "@/lib/governance/trends";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GovernanceTrendsProps {
  snapshots: GovernanceMetricSnapshot[];
}

export function GovernanceTrends({ snapshots }: GovernanceTrendsProps) {
  const chartData = toChartData(snapshots);
  const latest = getLatestSnapshot(snapshots);
  const prior = getPriorSnapshot(snapshots);

  if (snapshots.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Governance Trends</CardTitle>
          <CardDescription>
            Capture at least two daily snapshots to view trend lines and period comparisons.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const comparisonLabel =
    latest && prior ? formatComparisonLabel(latest, prior) : "Current vs prior snapshot";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Governance Trends</h2>
        <p className="text-sm text-muted-foreground mt-1">{comparisonLabel}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TREND_METRICS.map((metric) => {
          const current = latest ? getSnapshotMetricValue(latest, metric.key) : 0;
          const previous = prior ? getSnapshotMetricValue(prior, metric.key) : 0;
          const change = computeTrendChange(current, previous);

          return (
            <TrendIndicator
              key={metric.key}
              label={metric.label}
              current={current}
              change={change}
            />
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metric History</CardTitle>
          <CardDescription>
            Daily governance snapshots for critical findings, open reviews, SoD violations, and
            dormant accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="img"
            aria-label="Line chart of governance metrics over time including critical findings, open reviews, SoD violations, and dormant accounts"
            className="h-[320px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as { date?: string } | undefined;
                    return point?.date ?? "";
                  }}
                />
                <Legend />
                {TREND_METRICS.map((metric) => (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    name={metric.label}
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
