import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-white">
        <div className="container mx-auto p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
