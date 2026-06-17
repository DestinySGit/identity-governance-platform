import Link from "next/link";
import { Suspense } from "react";
import {
  Users,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ClipboardCheck,
  Gauge,
  Flame,
  Percent,
} from "lucide-react";
import { getDashboardMetrics, getGovernanceMetricSnapshots } from "@/app/actions/governance";
import { getDepartments } from "@/app/actions/identities";
import { getProfile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { CaptureSnapshotButton } from "@/components/dashboard/capture-snapshot-button";
import { GovernanceTrendsSection } from "@/components/dashboard/governance-trends-section";

interface DashboardPageProps {
  searchParams: Promise<{ department?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const department = params.department;
  const [metrics, departments, snapshots, profile] = await Promise.all([
    getDashboardMetrics(department),
    getDepartments(),
    getGovernanceMetricSnapshots(),
    getProfile(),
  ]);
  const isAdmin = profile?.role === "admin";

  const cards = [
    {
      title: "Total Users",
      value: metrics.totalUsers,
      icon: Users,
      href: department ? `/identities?department=${encodeURIComponent(department)}` : "/identities",
      color: "text-blue-600",
    },
    {
      title: "High Risk Users",
      value: metrics.highRiskUsers,
      icon: AlertTriangle,
      href: "/risks?severity=high",
      color: "text-red-600",
    },
    {
      title: "Critical Findings",
      value: metrics.criticalFindings,
      icon: Flame,
      href: "/risks?severity=critical",
      color: "text-rose-600",
    },
    {
      title: "SoD Violations",
      value: metrics.sodViolations,
      icon: ShieldAlert,
      href: "/risks?type=sod_violation",
      color: "text-orange-600",
    },
    {
      title: "Dormant Accounts",
      value: metrics.dormantAccounts,
      icon: Clock,
      href: "/risks?type=dormant_account",
      color: "text-amber-600",
    },
    {
      title: "Open Reviews",
      value: metrics.openReviews,
      icon: ClipboardCheck,
      href: "/campaigns?status=in_progress",
      color: "text-purple-600",
    },
    {
      title: "Review Completion",
      value: `${metrics.reviewCompletionPercent}%`,
      icon: Percent,
      href: "/reviews?queue=pending",
      color: "text-emerald-600",
    },
    {
      title: "Average Risk Score",
      value: metrics.averageRiskScore,
      icon: Gauge,
      href: "/identities",
      color: "text-slate-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Governance Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Identity governance visibility and risk overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <DashboardFilters departments={departments} currentDepartment={department} />
          </Suspense>
          {isAdmin && <CaptureSnapshotButton />}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {!department && <GovernanceTrendsSection snapshots={snapshots} />}
    </div>
  );
}
