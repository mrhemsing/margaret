import { SubscriptionStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminTopNav } from "@/app/components/admin-top-nav";
import { CallTestPanel } from "@/app/components/call-test-panel";
import { SiteHeader } from "@/app/components/site-header";
import { ADMIN_AUTH_COOKIE, hashAdminPassword, isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { sampleCallAttempts, sampleMembers } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
};

type AdminData = Awaited<ReturnType<typeof getAdminData>>;

const VOICE_AI_COST_PER_MINUTE_USD = 0.08;
const TELEPHONY_COST_PER_MINUTE_USD = 0.02;
const ESTIMATED_COST_PER_MINUTE_USD = VOICE_AI_COST_PER_MINUTE_USD + TELEPHONY_COST_PER_MINUTE_USD;

function getSafeAdminRedirect(value: FormDataEntryValue | string | null | undefined) {
  const path = typeof value === "string" ? value : "";

  if (!path.startsWith("/") || path.startsWith("//")) return "/admin";

  return path;
}

async function unlockAdminDashboard(formData: FormData) {
  "use server";

  const password = process.env.ADMIN_DASHBOARD_PASSWORD;
  const attemptedPassword = String(formData.get("password") ?? "");
  const nextPath = getSafeAdminRedirect(formData.get("next"));

  if (!password || attemptedPassword !== password) {
    redirect(`/admin?auth=failed&next=${encodeURIComponent(nextPath)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_AUTH_COOKIE, hashAdminPassword(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect(nextPath);
}

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

function AdminPasswordGate({ failed, nextPath }: { failed: boolean; nextPath: string }) {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 pb-8 pt-0 md:gap-6 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader showLoginLink={false} showAccountControls={false} />
      <section className="mx-auto mt-2 w-full max-w-xl rounded-[2rem] bg-white/90 p-7 shadow-sm ring-1 ring-black/5 sm:p-8 md:mt-4">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">internal admin</p>
        <h1 className="mt-3 whitespace-nowrap text-3xl font-bold tracking-tight text-ink sm:text-4xl">DailyCall operations</h1>
        {process.env.ADMIN_DASHBOARD_PASSWORD ? (
          <form action={unlockAdminDashboard} className="mt-5 grid gap-3">
            <input type="hidden" name="next" value={nextPath} />
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Admin password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink"
              />
            </label>
            {failed ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">Incorrect admin password.</p> : null}
            <button type="submit" className="rounded-full bg-brandButtonBlue px-5 py-3 font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover">
              Unlock dashboard
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Admin password is not configured. Set ADMIN_DASHBOARD_PASSWORD before using this dashboard.
          </p>
        )}
      </section>
    </main>
  );
}

async function getAdminData() {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const subscriptionStatuses = [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE];
    const registeredCustomerWhere = {
      supabaseUserId: { not: null },
      subscriptions: { some: { status: { in: subscriptionStatuses } } },
    };
    const demoMemberWhere = {
      OR: [
        { preferredCallTime: "Landing page demo" },
        { customer: { email: "demo-family@dailycall.local" } },
        { customer: { subscriptions: { none: {} }, supabaseUserId: null } },
      ],
    };

    const customers = await prisma.customer.findMany({
      where: registeredCustomerWhere,
      include: {
        members: {
          include: {
            callAttempts: {
              select: { startedAt: true, completedAt: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        alertContacts: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const subscriptions = await prisma.subscription.findMany({
      where: { customer: registeredCustomerWhere },
      include: { customer: { include: { members: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const activeMembers = await prisma.member.count({ where: { active: true, customer: registeredCustomerWhere } });
    const demoMembers = await prisma.member.findMany({
      where: demoMemberWhere,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const callsDueToday = await prisma.callAttempt.count({ where: { scheduledFor: { gte: startOfDay, lte: endOfDay } } });
    const textsMade = await prisma.callAttempt.count({ where: { reportSentAt: { not: null } } });
    const recentCalls = await prisma.callAttempt.findMany({
      include: { member: { include: { customer: true } } },
      orderBy: { scheduledFor: "desc" },
      take: 16,
    });

    return { ok: true as const, customers, subscriptions, activeMembers, demoMembers, callsDueToday, textsMade, recentCalls, error: null };
  } catch (error) {
    return {
      ok: false as const,
      customers: [],
      subscriptions: [],
      activeMembers: sampleMembers.length,
      demoMembers: sampleMembers,
      callsDueToday: 3,
      textsMade: 3,
      recentCalls: [],
      error: error instanceof Error ? error.message : "Unable to load admin data.",
    };
  }
}

const statusClassName = (status: string) => {
  const base = "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide";

  if (status === "completed_ok" || status === "ANSWERED_OK" || status === "TRIALING" || status === "ACTIVE") {
    return `${base} bg-sage/15 text-sage`;
  }

  if (status === "help_requested" || status === "HELP_REQUESTED" || status === "FOLLOW_UP_NEEDED" || status === "PAST_DUE") {
    return `${base} bg-red-100 text-red-700`;
  }

  return `${base} bg-sunrise/20 text-amber-800`;
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const formatStatusLabel = (status: string) => {
  if (status === "TRIALING") return "TRIAL";
  return status.replaceAll("_", " ");
};

const formatMinutes = (value: number) => {
  if (value === 0) return "0 min";
  if (value < 1) return `${value.toFixed(1)} min`;
  return `${Math.round(value)} min`;
};

const callDurationMinutes = (startedAt?: Date | string | null, completedAt?: Date | string | null) => {
  if (!startedAt || !completedAt) return 0;

  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, durationMs / 60_000);
};

function memberCostSummary(member: { createdAt?: Date | string; callAttempts?: { startedAt?: Date | string | null; completedAt?: Date | string | null }[] }) {
  const totalMinutes = member.callAttempts?.reduce((total, attempt) => total + callDurationMinutes(attempt.startedAt, attempt.completedAt), 0) ?? 0;
  const createdAt = member.createdAt ? new Date(member.createdAt) : new Date();
  const daysActive = Math.max(1, Math.ceil((Date.now() - createdAt.getTime()) / 86_400_000));
  const averageMinutesPerDay = totalMinutes / daysActive;
  const estimatedCost = totalMinutes * ESTIMATED_COST_PER_MINUTE_USD;

  return { totalMinutes, averageMinutesPerDay, estimatedCost };
}

function TrialBillingSection({ data }: { data: AdminData }) {
  const trialing = data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.TRIALING);
  const active = data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.ACTIVE);
  const incomplete = data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.INCOMPLETE);
  const pastDue = data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.PAST_DUE);

  return (
    <section className="grid self-start gap-6">
      <div className="rounded-[2rem] bg-ink p-6 text-cream shadow-sm md:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cream/60">trial dashboard</p>
          <h2 className="mt-3 text-3xl font-bold">Free trials & billing readiness</h2>
          <p className="mt-3 max-w-2xl leading-7 text-cream/75">
            Track new trial signups, selected plans, Stripe status, billing readiness, customers who may need follow-up, and export conversation history for review.
          </p>
          <a href="/api/admin/export-transcripts" className="mt-5 inline-flex rounded-full bg-cream px-4 py-2.5 text-center text-sm font-semibold text-ink shadow-sm hover:bg-white">
            Export transcript CSV
          </a>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Trialing" value={trialing.length.toString()} dark />
          <MetricCard label="Active" value={active.length.toString()} dark />
          <MetricCard label="Incomplete" value={incomplete.length.toString()} dark />
          <MetricCard label="Past due" value={pastDue.length.toString()} dark />
        </div>
      </div>

      <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
        <div className="grid gap-3">
          <h2 className="text-xl font-bold text-ink">Recent trials and subscriptions</h2>
          <p className="text-sm text-slate-500">Newest customers and their latest subscription record.</p>
          <span className="inline-flex w-fit rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brandButtonBlue">
            {data.subscriptions.length} records
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1.6fr_0.7fr_0.7fr] gap-4 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
            <span>Customer</span>
            <span>Status</span>
            <span>Trial / period end</span>
          </div>
          <div className="divide-y divide-slate-100">
            {data.subscriptions.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No subscription records yet.</div>
            ) : (
              data.subscriptions.map((subscription) => {
                const primaryMember = subscription.customer.members[0];
                return (
                  <div key={subscription.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1.6fr_0.7fr_0.7fr] md:items-center">
                    <div>
                      <p className="font-semibold text-ink">{subscription.customer.fullName}</p>
                      <p className="mt-1 text-slate-500">{subscription.customer.email ?? "No email"}</p>
                      <p className="mt-1 text-xs text-slate-400">Loved one: {primaryMember?.name ?? "Not set"}</p>
                      <p className="mt-3 text-xs font-semibold text-ink">{subscription.plan.replaceAll("_", " ").toLowerCase()}</p>
                      <p className="mt-1 text-xs text-slate-500">Stripe: {subscription.stripeSubscriptionId ? "connected" : "pending"}</p>
                    </div>
                    <span className={statusClassName(subscription.status)}>{formatStatusLabel(subscription.status)}</span>
                    <p className="text-slate-600">{formatDate(subscription.currentPeriodEndsAt)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </article>

    </section>
  );
}

function MetricCard({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <article className={dark ? "rounded-2xl bg-white/10 p-4 ring-1 ring-white/10" : "rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/5 sm:rounded-3xl sm:p-6"}>
      <p className={dark ? "text-[11px] leading-4 text-cream/60 sm:text-sm" : "text-[11px] leading-4 text-slate-500 sm:text-sm"}>{label}</p>
      <p className={dark ? "mt-2 text-3xl font-bold text-cream sm:text-4xl" : "mt-2 text-3xl font-bold text-ink sm:text-4xl"}>{value}</p>
    </article>
  );
}

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ auth?: string; next?: string }> }) {
  const authenticated = await isAdminAuthenticated();
  const params = await searchParams;
  const nextPath = getSafeAdminRedirect(params?.next);

  if (!authenticated) {
    return <AdminPasswordGate failed={params?.auth === "failed"} nextPath={nextPath} />;
  }

  if (nextPath !== "/admin") {
    redirect(nextPath);
  }

  const data = await getAdminData();

  const memberRows = data.ok
    ? data.customers.flatMap((customer) => customer.members.map((member) => ({ ...member, customerName: customer.fullName, customerEmail: customer.email })))
    : sampleMembers.map((member) => ({ ...member, customerName: "Sample", customerEmail: "sample-family@dailycall.local", createdAt: new Date(), callAttempts: [] }));
  const totalEstimatedCost = memberRows.reduce((total, member) => total + memberCostSummary(member).estimatedCost, 0);
  const averageCostPerUser = data.activeMembers > 0 ? totalEstimatedCost / data.activeMembers : 0;

  const stats = [
    { label: "Active members", value: data.activeMembers.toString() },
    { label: "Total costs", value: formatMoney(totalEstimatedCost) },
    { label: "Avg cost/user", value: formatMoney(averageCostPerUser) },
    { label: "Calls due today", value: data.callsDueToday.toString() },
    { label: "Texts made", value: data.textsMade.toString() },
    { label: "Trialing users", value: data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.TRIALING).length.toString() },
  ];

  const allReportRows = data.ok && data.recentCalls.length > 0
    ? data.recentCalls.map((attempt) => ({
        id: attempt.id,
        memberName: attempt.member.name,
        summary: attempt.summary || "No summary yet.",
        status: attempt.status,
        isDemo: attempt.member.customer.email === "demo-family@dailycall.local" || attempt.member.preferredCallTime === "Landing page demo",
      }))
    : sampleCallAttempts.map((attempt) => ({ ...attempt, isDemo: false }));

  const reportRows = allReportRows.filter((attempt) => !attempt.isDemo).slice(0, 8);
  const demoReportRows = allReportRows.filter((attempt) => attempt.isDemo).slice(0, 8);

  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 pb-5 pt-0 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <AdminTopNav activePath="/admin" signOutAction={signOutAdminDashboard} />
      <SiteHeader showLoginLink={false} showAccountControls={false} />
      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">internal admin</p>
        <h1 className="mt-3 max-w-2xl whitespace-nowrap text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">DailyCall operations</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Internal testing and operational view for live calls, members, free trials, billing readiness, and customer follow-up.
        </p>
        {data.error ? (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">Database admin data could not load: {data.error}. Showing sample operations data where needed.</p>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => <MetricCard key={stat.label} label={stat.label} value={stat.value} />)}
      </section>

      <section className="grid gap-10 xl:grid-cols-2 xl:items-start">
        <div className="grid gap-6">
          <CallTestPanel />

          <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-xl font-bold text-ink">Members</h2>
            <p className="mt-1 text-sm text-slate-500">Registered customers with an active plan or trial. Cost estimate uses ${ESTIMATED_COST_PER_MINUTE_USD.toFixed(2)}/call minute.</p>
            <div className="mt-5 space-y-4">
              {memberRows.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No active subscribed members yet.</div>
              ) : memberRows.map((member) => {
                const costSummary = memberCostSummary(member);

                return (
                  <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="grid gap-4 md:grid-cols-2 md:items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{member.name}</p>
                        <p className="mt-1 text-sm font-medium text-slate-600">{member.customerEmail ?? "No email"}</p>
                        <p className="mt-1 text-sm text-slate-500">Daily call at {member.preferredCallTime} · {member.timezone}</p>
                        <span className="mt-2 inline-flex rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sage">active</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-500">Total min</p>
                          <p className="mt-1 font-bold text-ink">{formatMinutes(costSummary.totalMinutes)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-500">Min/day</p>
                          <p className="mt-1 font-bold text-ink">{costSummary.averageMinutesPerDay.toFixed(1)}</p>
                        </div>
                        <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-500">Est. cost</p>
                          <p className="mt-1 font-bold text-ink">{formatMoney(costSummary.estimatedCost)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink">Demo users</h2>
                <p className="mt-1 text-sm text-slate-500">Landing-page demo callers, kept separate from trials and subscriptions.</p>
              </div>
              <span className="rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brandButtonBlue">demo</span>
            </div>
            <div className="mt-5 space-y-4">
              {data.demoMembers.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No demo users yet.</div>
              ) : data.demoMembers.map((member) => (
                <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-ink">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{member.phoneNumber}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-xl font-bold text-ink">Recent check-in reports</h2>
            <div className="mt-5 space-y-4">
              {reportRows.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No non-demo check-in reports yet.</div>
              ) : reportRows.map((attempt) => (
                <div key={attempt.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{attempt.memberName}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{attempt.summary}</p>
                    </div>
                    <span className={statusClassName(attempt.status)}>{attempt.status.replaceAll("_", " ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-ink">Recent demo calls</h2>
              <span className="rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brandButtonBlue">demo</span>
            </div>
            <div className="mt-5 space-y-4">
              {demoReportRows.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No demo calls yet.</div>
              ) : demoReportRows.map((attempt) => (
                <div key={attempt.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{attempt.memberName}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{attempt.summary}</p>
                    </div>
                    <span className={statusClassName(attempt.status)}>{attempt.status.replaceAll("_", " ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <TrialBillingSection data={data} />
      </section>
    </main>
  );
}
