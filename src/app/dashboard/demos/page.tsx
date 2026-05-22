import { SiteHeader } from "@/app/components/site-header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Demo Calls",
};

function formatDate(date: Date | null) {
  if (!date) return "Pending";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(date);
}

function statusClassName(status: string) {
  const base = "whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide";

  if (status === "ANSWERED_OK") return `${base} bg-sage/15 text-sage`;
  if (status === "IN_PROGRESS") return `${base} bg-brandBlue/15 text-brandButtonBlue`;
  if (status === "NO_RESPONSE") return `${base} bg-amber-100 text-amber-800`;
  if (status === "FAILED") return `${base} bg-red-100 text-red-700`;
  return `${base} bg-slate-100 text-slate-600`;
}

export default async function DemoLogsDashboardPage() {
  const demoCustomer = await prisma.customer.findUnique({
    where: { email: "demo-family@dailycall.local" },
    include: {
      members: {
        orderBy: { updatedAt: "desc" },
        include: {
          callAttempts: {
            orderBy: { scheduledFor: "desc" },
            take: 50,
          },
        },
      },
    },
  });

  const demoCalls =
    demoCustomer?.members
      .flatMap((member) =>
        member.callAttempts.map((call) => ({
          ...call,
          memberName: member.name,
          memberPhone: member.phoneNumber,
        })),
      )
      .sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime()) ?? [];

  const total = demoCalls.length;
  const answered = demoCalls.filter((call) => call.status === "ANSWERED_OK").length;
  const inProgress = demoCalls.filter((call) => call.status === "IN_PROGRESS").length;
  const noResponse = demoCalls.filter((call) => call.status === "NO_RESPONSE" || call.status === "FAILED").length;

  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 pb-5 pt-0 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader
        links={[
          { href: "/dashboard", label: "All dashboards" },
          { href: "/dashboard/demos", label: "Demo logs", active: true },
        ]}
      />

      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">Landing page demos</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink md:text-5xl">Demo call logs.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          A separate view for one-minute landing-page demo calls, so demo activity stays out of the customer dashboard.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total demos", total.toString()],
          ["Answered", answered.toString()],
          ["In progress", inProgress.toString()],
          ["No response / failed", noResponse.toString()],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5 md:rounded-3xl md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:p-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sage">Recent demos</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Latest landing-page demo calls</h2>
          </div>
          <p className="text-sm text-slate-500">SMS reports for these should say <span className="font-semibold text-ink">DEMO</span> and link here.</p>
        </div>

        <div className="mt-6 grid gap-4">
          {demoCalls.length ? (
            demoCalls.map((call) => (
              <article key={call.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">{call.memberName}</p>
                      <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{call.memberPhone}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Started {formatDate(call.startedAt ?? call.scheduledFor)} · Completed {formatDate(call.completedAt)}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{call.summary || "No summary yet. Sync transcripts after the demo finishes."}</p>
                    {call.transcript ? (
                      <details className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        <summary className="cursor-pointer font-semibold text-ink">Transcript</summary>
                        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6">{call.transcript}</pre>
                      </details>
                    ) : null}
                  </div>
                  <span className={statusClassName(call.status)}>{call.status.replaceAll("_", " ")}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-lg font-bold text-ink">No demo calls yet.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">When someone uses the landing-page demo form, their one-minute demo call will appear here.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
