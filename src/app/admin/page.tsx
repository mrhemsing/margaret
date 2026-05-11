import { CallTestPanel } from "@/app/components/call-test-panel";
import { sampleCallAttempts, sampleMembers } from "@/lib/sample-data";

const stats = [
  { label: "Active members", value: sampleMembers.length.toString() },
  { label: "Calls due today", value: "3" },
  { label: "Texts made", value: "3" },
];

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-8 md:px-10">
      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">internal admin</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-ink md:text-5xl">Dailycall operations dashboard</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Internal testing and operational view. This keeps admin/test tools separate from the client-facing sales, signup, and user dashboard states.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/5 sm:rounded-3xl sm:p-6">
            <p className="text-[11px] leading-4 text-slate-500 sm:text-sm">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-ink sm:text-4xl">{stat.value}</p>
          </article>
        ))}
      </section>

      <CallTestPanel />

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-xl font-bold text-ink">Members</h2>
          <div className="mt-5 space-y-4">
            {sampleMembers.map((member) => (
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
            {sampleCallAttempts.map((attempt) => (
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
      </section>
    </main>
  );
}

function statusClassName(status: string) {
  const base = "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide";

  if (status === "completed_ok") {
    return `${base} bg-sage/15 text-sage`;
  }

  if (status === "help_requested" || status === "completed_concern") {
    return `${base} bg-red-100 text-red-700`;
  }

  return `${base} bg-sunrise/20 text-amber-800`;
}
