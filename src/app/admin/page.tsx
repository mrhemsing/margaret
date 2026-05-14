import { SubscriptionStatus } from "@prisma/client";

import { CallTestPanel } from "@/app/components/call-test-panel";
import { prisma } from "@/lib/db";
import { sampleCallAttempts, sampleMembers } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

type AdminData = Awaited<ReturnType<typeof getAdminData>>;

async function getAdminData() {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [customers, subscriptions, activeMembers, callsDueToday, textsMade, recentCalls] = await Promise.all([
      prisma.customer.findMany({
        include: {
          members: { orderBy: { createdAt: "desc" } },
          subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
          alertContacts: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.subscription.findMany({
        include: { customer: { include: { members: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.member.count({ where: { active: true } }),
      prisma.callAttempt.count({ where: { scheduledFor: { gte: startOfDay, lte: endOfDay } } }),
      prisma.callAttempt.count({ where: { reportSentAt: { not: null } } }),
      prisma.callAttempt.findMany({
        include: { member: { include: { customer: true } } },
        orderBy: { scheduledFor: "desc" },
        take: 16,
      }),
    ]);

    return { ok: true as const, customers, subscriptions, activeMembers, callsDueToday, textsMade, recentCalls, error: null };
  } catch (error) {
    return {
      ok: false as const,
      customers: [],
      subscriptions: [],
      activeMembers: sampleMembers.length,
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

function TrialBillingSection({ data }: { data: AdminData }) {
  const trialing = data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.TRIALING);
  const active = data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.ACTIVE);
  const incomplete = data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.INCOMPLETE);
  const pastDue = data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.PAST_DUE);

  return (
    <section className="grid gap-6">
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
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Recent trials and subscriptions</h2>
            <p className="mt-1 text-sm text-slate-500">Newest customers and their latest subscription record.</p>
          </div>
          <span className="rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brandButtonBlue">
            {data.subscriptions.length} records
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr] gap-4 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
            <span>Customer</span>
            <span>Plan</span>
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
                  <div key={subscription.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr] md:items-center">
                    <div>
                      <p className="font-semibold text-ink">{subscription.customer.fullName}</p>
                      <p className="mt-1 text-slate-500">{subscription.customer.email ?? "No email"}</p>
                      <p className="mt-1 text-xs text-slate-400">Loved one: {primaryMember?.name ?? "Not set"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{subscription.plan.replaceAll("_", " ").toLowerCase()}</p>
                      <p className="mt-1 text-xs text-slate-500">Stripe: {subscription.stripeSubscriptionId ? "connected" : "pending"}</p>
                    </div>
                    <span className={statusClassName(subscription.status)}>{subscription.status.replaceAll("_", " ")}</span>
                    <p className="text-slate-600">{formatDate(subscription.currentPeriodEndsAt)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </article>

      <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xl font-bold text-ink">Recent customers</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {data.customers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No customers yet.</div>
          ) : (
            data.customers.slice(0, 8).map((customer) => {
              const member = customer.members[0];
              const subscription = customer.subscriptions[0];
              return (
                <div key={customer.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{customer.fullName}</p>
                      <p className="mt-1 text-sm text-slate-500">{customer.email ?? "No email"} · {customer.phoneNumber}</p>
                      <p className="mt-2 text-sm text-slate-600">Loved one: {member?.name ?? "Not set"} {member?.preferredCallTime ? `at ${member.preferredCallTime}` : ""}</p>
                    </div>
                    {subscription ? <span className={statusClassName(subscription.status)}>{subscription.status.replaceAll("_", " ")}</span> : null}
                  </div>
                </div>
              );
            })
          )}
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

export default async function AdminPage() {
  const data = await getAdminData();

  const stats = [
    { label: "Active members", value: data.activeMembers.toString() },
    { label: "Calls due today", value: data.callsDueToday.toString() },
    { label: "Texts made", value: data.textsMade.toString() },
    { label: "Trialing users", value: data.subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.TRIALING).length.toString() },
  ];

  const memberRows = data.ok
    ? data.customers.flatMap((customer) => customer.members.map((member) => ({ ...member, customerName: customer.fullName }))).slice(0, 8)
    : sampleMembers.map((member) => ({ ...member, customerName: "Sample" }));

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
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-8 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">internal admin</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-ink md:text-5xl">DailyCall operations dashboard</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Internal testing and operational view for live calls, members, free trials, billing readiness, and customer follow-up.
        </p>
        {data.error ? (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">Database admin data could not load: {data.error}. Showing sample operations data where needed.</p>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        {stats.map((stat) => <MetricCard key={stat.label} label={stat.label} value={stat.value} />)}
      </section>

      <section className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <CallTestPanel />

          <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-xl font-bold text-ink">Members</h2>
            <div className="mt-5 space-y-4">
              {memberRows.map((member) => (
                <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{member.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Daily call at {member.preferredCallTime} · {member.timezone}</p>
                    </div>
                    <span className="rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sage">active</span>
                  </div>
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
