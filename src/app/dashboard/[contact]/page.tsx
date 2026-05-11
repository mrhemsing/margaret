import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardActions } from "../dashboard-actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Contact = "matt" | "chuck";

const exampleContacts: Record<Contact, { name: string; phone: string; title: string }> = {
  matt: { name: "Matt", phone: "+1 604 313 8398", title: "Matt's Dailycall dashboard" },
  chuck: { name: "Chuck", phone: "+1 306 880 2055", title: "Chuck's Dailycall dashboard" },
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetricPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

async function getMember(contact: Contact) {
  return prisma.member.findFirst({
    where: { phoneNumber: exampleContacts[contact].phone.replaceAll(" ", "") },
    orderBy: { createdAt: "desc" },
  });
}

async function getMemberSettings(contact: Contact) {
  const fallback = exampleContacts[contact];
  const member = await getMember(contact);

  if (!member) {
    return [
      { label: "Member", value: fallback.name },
      { label: "Phone", value: fallback.phone },
      { label: "Call schedule", value: "On demand test" },
      { label: "Voicemail retries", value: "Not configured" },
    ];
  }

  return [
    { label: "Member", value: member.name },
    { label: "Phone", value: fallback.phone },
    { label: "Call schedule", value: member.preferredCallTime || "On demand test" },
    { label: "Voicemail retries", value: `${member.voicemailRetryCount} ${member.voicemailRetryCount === 1 ? "retry" : "retries"} · ${member.voicemailRetryDelayMins} min delay` },
  ];
}

async function getMemberMetrics(contact: Contact) {
  const member = await getMember(contact);
  if (!member) {
    return [
      { label: "Answered rate", value: "—", helper: "No calls yet" },
      { label: "Avg. conversation", value: "—", helper: "No completed calls yet" },
      { label: "Answered calls", value: "—", helper: "No calls yet" },
      { label: "Hangups / failed", value: "—", helper: "No calls yet" },
    ];
  }

  const calls = await prisma.callAttempt.findMany({
    where: {
      memberId: member.id,
      providerConversationId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (!calls.length) {
    return [
      { label: "Answered rate", value: "—", helper: "No calls yet" },
      { label: "Avg. conversation", value: "—", helper: "No completed calls yet" },
      { label: "Answered calls", value: "0", helper: "Recent calls" },
      { label: "Hangups / failed", value: "—", helper: "No calls yet" },
    ];
  }

  const answered = calls.filter((call) => call.status === "ANSWERED_OK");
  const failedOrNoResponse = calls.filter((call) => call.status === "FAILED" || call.status === "NO_RESPONSE");
  const durations = answered
    .map((call) => call.startedAt && call.completedAt ? Math.max(0, Math.round((call.completedAt.getTime() - call.startedAt.getTime()) / 1000)) : null)
    .filter((value): value is number => value !== null && value > 0);
  const averageDurationSeconds = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;

  return [
    { label: "Answered rate", value: formatMetricPercent(answered.length / calls.length), helper: `${answered.length}/${calls.length} recent calls` },
    { label: "Avg. conversation", value: averageDurationSeconds ? `${Math.round(averageDurationSeconds / 60)} min` : "—", helper: "Completed calls only" },
    { label: "Answered calls", value: `${answered.length}`, helper: "Recent calls" },
    { label: "Hangups / failed", value: formatMetricPercent(failedOrNoResponse.length / calls.length), helper: `${failedOrNoResponse.length}/${calls.length} recent calls` },
  ];
}

async function getMemberMemory(contact: Contact) {
  const member = await getMember(contact);
  if (!member) return null;

  const memory = await prisma.seniorMemory.findUnique({
    where: { memberId: member.id },
    include: { member: true },
  });

  if (!memory) return null;

  const preferences = memory.preferences && typeof memory.preferences === "object" && !Array.isArray(memory.preferences)
    ? memory.preferences as { favoriteTopics?: string; importantEvents?: string; preferredTone?: string; ritualPreference?: string }
    : null;

  return {
    memberName: memory.member.name,
    recentMood: memory.recentMood,
    hobbies: memory.hobbies,
    routines: memory.routines,
    healthNotes: memory.healthNotes,
    conversationLikes: memory.conversationLikes,
    conversationAvoids: memory.conversationAvoids,
    topicsToRevisit: memory.topicsToRevisit,
    recentTopics: memory.recentTopics,
    lastSummary: memory.lastSummary,
    preferredTone: preferences?.preferredTone,
    ritualPreference: preferences?.ritualPreference,
  };
}

async function getMemberReports(contact: Contact) {
  const member = await getMember(contact);
  if (!member) return [];

  const calls = await prisma.callAttempt.findMany({
    where: { memberId: member.id },
    include: { member: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const visibleCalls = calls.filter((call, index) => {
    const isTechnicalFailedTest = call.status === "FAILED" && !call.providerConversationId && !call.transcript;

    if (isTechnicalFailedTest) return false;
    if (call.status !== "IN_PROGRESS") return true;

    return !calls.slice(0, index).some((newerCall) => newerCall.status === "IN_PROGRESS");
  }).slice(0, 8);

  return visibleCalls.map((call) => ({
    id: call.id,
    date: formatDate(call.startedAt ?? call.scheduledFor),
    status: formatStatus(call.status),
    memberName: call.member.name,
    summary: call.summary ?? "Conversation is stored. Transcript will appear here after the call finishes processing.",
    transcript: call.transcript,
    mood: call.mood,
    topics: call.topics,
    notableMoments: call.notableMoments,
    followUpSuggested: call.followUpSuggested,
    followUpReason: call.followUpReason,
  }));
}

export default async function MemberDashboardPage({ params }: { params: Promise<{ contact: string }> }) {
  const { contact: contactParam } = await params;
  if (contactParam !== "matt" && contactParam !== "chuck") notFound();

  const contact = contactParam as Contact;
  const profile = exampleContacts[contact];
  const [settings, metrics, memory, reports] = await Promise.all([
    getMemberSettings(contact),
    getMemberMetrics(contact),
    getMemberMemory(contact),
    getMemberReports(contact),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8 md:px-10">
      <nav className="flex items-center justify-between rounded-full bg-white/75 px-5 py-3 shadow-sm ring-1 ring-black/5">
        <Link href="/">
          <Image src="/dailycall-logo.jpg" alt="dailycall" width={632} height={150} priority className="h-auto w-40" />
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <Link href="/dashboard/matt" className={contact === "matt" ? "text-sage" : "hover:text-ink"}>Matt</Link>
          <Link href="/dashboard/chuck" className={contact === "chuck" ? "text-sage" : "hover:text-ink"}>Chuck</Link>
        </div>
      </nav>

      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">example member dashboard</p>
        <div className="mt-4">
          <h1 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">{profile.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Focused test space for {profile.name}: calls, transcripts, memory, and retention signals without mixing in the other example member.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {settings.map((item) => (
          <article key={item.label} className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 font-bold text-ink">{item.value}</p>
          </article>
        ))}
      </section>

      <DashboardActions contact={contact} />

      <section className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-sage">Retention signals</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Is {profile.name} building the habit?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.helper}</p>
            </article>
          ))}
        </div>
      </section>

      {memory ? (
        <section className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sage">Personalization memory</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">What Dailycall remembers about {memory.memberName}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This is the companion profile powering warmer calls, better callbacks, and less repetition.
              </p>
            </div>
            <span className="rounded-full bg-brandBlue/10 px-4 py-2 text-sm font-semibold text-brandButtonBlue">Personalization moat</span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">Recent mood</p>
              <p className="mt-2 text-sm text-slate-600">{memory.recentMood ?? "Not enough calls yet"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">Preferred tone</p>
              <p className="mt-2 text-sm text-slate-600">{memory.preferredTone?.replaceAll("_", " ") ?? "Warm and patient"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">Call ritual</p>
              <p className="mt-2 text-sm text-slate-600">{memory.ritualPreference?.replaceAll("_", " ") ?? "Morning coffee chat"}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Hobbies/interests", memory.hobbies],
              ["Routines", memory.routines],
              ["Topics to revisit", memory.topicsToRevisit],
              ["Recent topics", memory.recentTopics],
              ["Likes talking about", memory.conversationLikes],
              ["Avoid or handle gently", memory.conversationAvoids],
            ].map(([label, values]) => (
              <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-ink">{label as string}</p>
                {(values as string[]).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(values as string[]).map((value) => (
                      <span key={value} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">{value}</span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No memory captured yet.</p>
                )}
              </div>
            ))}
          </div>

          {memory.lastSummary ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-ink">Latest memory note</p>
              <p className="mt-2">{memory.lastSummary}</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-[2rem] bg-white/80 p-6 text-sm text-slate-600 shadow-sm ring-1 ring-black/5 md:p-8">
          No personalization memory captured for {profile.name} yet. Start a call, then refresh transcripts after processing.
        </section>
      )}

      <section className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sage">Recent reports</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">{profile.name}&apos;s call history</h2>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {reports.length ? reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">{report.memberName}</p>
                  <p className="text-sm text-slate-500">{report.date}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${report.status === "No Response" || report.status === "Failed" ? "bg-red-100 text-red-700" : report.status === "Follow Up Needed" || report.status === "Help Requested" ? "bg-amber-100 text-amber-800" : "bg-sage/15 text-sage"}`}>
                  {report.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{report.summary}</p>
              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-ink">Mood</p>
                  <p className="mt-1">{report.mood ?? "Pending"}</p>
                </div>
                <div>
                  <p className="font-semibold text-ink">Follow-up</p>
                  <p className={`mt-1 ${report.followUpSuggested ? "text-amber-700" : "text-sage"}`}>
                    {report.followUpSuggested ? report.followUpReason ?? "Suggested" : "No follow-up flagged"}
                  </p>
                </div>
                {report.topics.length > 0 ? (
                  <div className="sm:col-span-2">
                    <p className="font-semibold text-ink">Topics discussed</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {report.topics.map((topic) => (
                        <span key={topic} className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">{topic}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {report.notableMoments.length > 0 ? (
                  <div className="sm:col-span-2">
                    <p className="font-semibold text-ink">Notable moments</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {report.notableMoments.map((moment) => (
                        <li key={moment}>{moment}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              {report.transcript ? (
                <details className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <summary className="cursor-pointer font-semibold text-ink">View call transcript</summary>
                  <pre className="mt-3 whitespace-pre-wrap font-sans">{report.transcript}</pre>
                </details>
              ) : (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Transcript pending or not available yet.</p>
              )}
            </div>
          )) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No calls stored for {profile.name} yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
