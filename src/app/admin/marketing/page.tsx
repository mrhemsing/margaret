import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MarketingDashboardClient } from "@/app/admin/marketing/marketing-dashboard-client";
import { AdminTopNav } from "@/app/components/admin-top-nav";
import { SiteHeader } from "@/app/components/site-header";
import { ADMIN_AUTH_COOKIE, isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketing Launch Dashboard",
};

async function signOutAdminDashboard() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  redirect("/admin");
}

export default async function MarketingDashboardPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin?next=/admin/marketing");
  }

  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 pb-8 pt-0 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <AdminTopNav activePath="/admin/marketing" signOutAction={signOutAdminDashboard} />
      <SiteHeader showLoginLink={false} showAccountControls={false} />

      <header className="rounded-[2rem] bg-white/85 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">internal marketing lab</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink md:text-5xl">$5K launch campaign dashboard</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          Track the first paid marketing push as a learning budget: planned allocation, actual spend, live/sent status, notes, and ad-copy winners.
        </p>
      </header>

      <MarketingDashboardClient />
    </main>
  );
}
