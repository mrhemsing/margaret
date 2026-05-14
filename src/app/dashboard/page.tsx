import { SiteHeader } from "@/app/components/site-header";
import { DashboardHome } from "./dashboard-home";

export default function DashboardIndexPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8 md:px-10">
      <SiteHeader showLoginLink={false} links={[{ href: "/dashboard", label: "Dashboard", active: true }]} />
      <DashboardHome />
    </main>
  );
}
