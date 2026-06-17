"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Upload,
  Search,
  AlertTriangle,
  ShieldAlert,
  ClipboardCheck,
  ListChecks,
  ScrollText,
  LogOut,
  UserCog,
  AppWindow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/types/database.types";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/identities", label: "Identities", icon: Users },
  { href: "/import", label: "Import", icon: Upload, adminOnly: true },
  { href: "/explorer", label: "Explorer", icon: Search },
  { href: "/ownership/roles", label: "Role Ownership", icon: UserCog },
  { href: "/ownership/applications", label: "App Ownership", icon: AppWindow },
  { href: "/risks", label: "Risks", icon: AlertTriangle },
  { href: "/sod", label: "SoD Rules", icon: ShieldAlert, adminOnly: true },
  { href: "/campaigns", label: "Campaigns", icon: ClipboardCheck },
  { href: "/reviews", label: "Review Queue", icon: ListChecks, reviewerOnly: true },
  { href: "/audit", label: "Audit", icon: ScrollText },
];

interface AppSidebarProps {
  profile: {
    email: string;
    display_name: string | null;
    role: AppRole;
  };
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && profile.role !== "admin") return false;
    if ("reviewerOnly" in item && item.reviewerOnly && profile.role === "viewer") {
      return false;
    }
    return true;
  });

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-slate-50">
      <div className="border-b p-6">
        <h1 className="text-lg font-bold text-slate-900">Identity_Governance_Platform</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-700 hover:bg-slate-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 space-y-3">
        <div>
          <p className="text-sm font-medium truncate">{profile.display_name ?? profile.email}</p>
          <Badge variant="secondary" className="mt-1 capitalize">
            {profile.role}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
