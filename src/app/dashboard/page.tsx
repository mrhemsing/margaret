import { SiteHeader } from "@/app/components/site-header";
import { DashboardHome } from "./dashboard-home";

export default function DashboardIndexPage() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader links={[{ href: "/dashboard", label: "Dashboard", active: true }]} />
      <DashboardHome />
    </main>
  );
}
