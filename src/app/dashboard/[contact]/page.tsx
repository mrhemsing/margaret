import { notFound } from "next/navigation";
import { SiteHeader } from "@/app/components/site-header";
import { DashboardActions } from "../dashboard-actions";
import { prisma } from "@/lib/db";
import { relabelConversationTranscript } from "@/lib/voice/elevenlabs";

export const dynamic = "force-dynamic";

type Contact = "matt" | "chuck";

export async function generateMetadata({ params }: { params: Promise<{ contact: string }> }) {
  const { contact } = await params;
  const name = contact === "matt" ? "Matt" : contact === "chuck" ? "Chuck" : "Member";

  return {
    title: `${name}'s Dashboard`,
  };
}

const exampleContacts: Record<Contact, { name: string; phone: string; title: string }> = {
  matt: { name: "Matt", phone: "+1 604 313 8398", title: "Matt Hemsing" },
  chuck: { name: "Chuck", phone: "+1 306 880 2055", title: "Chuck" },
};

const fallbackMetrics = [
  { label: "Answered rate", value: "83%", helper: "5/6 recent calls" },
  { label: "Avg. conversation", value: "9 min", helper: "Completed calls only" },
  { label: "Answered calls", value: "5", helper: "Recent calls" },
  { label: "Hangups / failed", value: "17%", helper: "1/6 recent calls" },
];

const fallbackMemoryByContact: Record<Contact, {
  memberName: string;
  recentMood: string;
  hobbies: string[];
  routines: string[];
  healthNotes: string[];
  conversationLikes: string[];
  conversationAvoids: string[];
  topicsToRevisit: string[];
  recentTopics: string[];
  lastSummary: string;
  preferredTone: string;
  ritualPreference: string;
}> = {
  matt: {
    memberName: "Matt",
    recentMood: "Positive and engaged",
    hobbies: ["technology", "family updates", "project progress"],
    routines: ["morning check-in", "quick status recap"],
    healthNotes: [],
    conversationLikes: ["direct questions", "practical next steps"],
    conversationAvoids: ["overly long explanations"],
    topicsToRevisit: ["DailyCall polish", "dashboard feedback"],
    recentTopics: ["mobile layout", "call summaries", "pricing"],
    lastSummary: "Matt responds best to concise check-ins that move the project forward and make the next action clear.",
    preferredTone: "focused and steady",
    ritualPreference: "morning project check-in",
  },
  chuck: {
    memberName: "Chuck",
    recentMood: "Calm and upbeat",
    hobbies: ["family", "daily routines", "light conversation"],
    routines: ["morning coffee", "daily check-in"],
    healthNotes: ["prefers gentle reminders"],
    conversationLikes: ["warm conversation", "simple questions", "family updates"],
    conversationAvoids: ["clinical wording", "rushed prompts"],
    topicsToRevisit: ["how the morning went", "family news", "favorite music"],
    recentTopics: ["daily routine", "family", "weather"],
    lastSummary: "Chuck's calls should feel friendly and familiar, with gentle pacing and a short family-friendly summary afterward.",
    preferredTone: "warm and patient",
    ritualPreference: "morning coffee chat",
  },
};

const fallbackReportsByContact: Record<Contact, Array<{
  id: string;
  date: string;
  status: string;
  memberName: string;
  summary: string;
  transcript: string | null;
  mood: string;
  topics: string[];
  notableMoments: string[];
  followUpSuggested: boolean;
  followUpReason: string | null;
}>> = {
  matt: [
    {
      id: "fallback-matt-1",
      date: "Demo report",
      status: "Answered Ok",
      memberName: "Matt",
      summary: "Matt answered quickly, sounded focused, and wanted the next dashboard changes kept tight and practical.",
      transcript: null,
      mood: "Focused",
      topics: ["dashboard", "mobile polish", "next steps"],
      notableMoments: ["Asked for concise, useful progress rather than broad status updates."],
      followUpSuggested: false,
      followUpReason: null,
    },
  ],
  chuck: [
    {
      id: "fallback-chuck-1",
      date: "Demo report",
      status: "Answered Ok",
      memberName: "Chuck",
      summary: "Chuck answered the daily call and sounded comfortable. The conversation stayed warm and simple, with a gentle check-in about his morning routine.",
      transcript: null,
      mood: "Calm and upbeat",
      topics: ["morning routine", "family", "weather"],
      notableMoments: ["Responded well to a slower, friendly pace.", "Family summary should stay short and reassuring."],
      followUpSuggested: false,
      followUpReason: null,
    },
    {
      id: "fallback-chuck-2",
      date: "Previous demo report",
      status: "Follow Up Needed",
      memberName: "Chuck",
      summary: "Chuck mentioned he would appreciate a family call later in the week. No urgent concern was detected.",
      transcript: null,
      mood: "Reflective",
      topics: ["family call", "weekly plans"],
      notableMoments: ["A family touchpoint later this week may be appreciated."],
      followUpSuggested: true,
      followUpReason: "Consider a friendly family call later this week.",
    },
  ],
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
  if (contact === "matt") {
    return prisma.member.findFirst({
      where: {
        name: exampleContacts.matt.name,
        phoneNumber: exampleContacts.matt.phone.replaceAll(" ", ""),
      },
      orderBy: { createdAt: "desc" },
    });
  }

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
    { label: "Member", value: fallback.name },
    { label: "Phone", value: fallback.phone },
    { label: "Call schedule", value: member.preferredCallTime || "On demand test" },
    { label: "Voicemail retries", value: `${member.voicemailRetryCount} ${member.voicemailRetryCount === 1 ? "retry" : "retries"} (${member.voicemailRetryDelayMins} min delay)` },
  ];
}

async function getMemberMetrics(contact: Contact) {
  const member = await getMember(contact);
  if (!member) return fallbackMetrics;

  const calls = await prisma.callAttempt.findMany({
    where: {
      memberId: member.id,
      providerConversationId: { not: null },
      status: { notIn: ["FAILED", "NO_RESPONSE"] },
    },
    orderBy: { scheduledFor: "desc" },
    take: 20,
  });

  if (!calls.length) return fallbackMetrics;

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
  if (!member) return fallbackMemoryByContact[contact];

  const memory = await prisma.seniorMemory.findUnique({
    where: { memberId: member.id },
    include: { member: true },
  });

  if (!memory) return fallbackMemoryByContact[contact];

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
  if (!member) return fallbackReportsByContact[contact];

  const calls = await prisma.callAttempt.findMany({
    where: { memberId: member.id },
    include: { member: true },
    orderBy: { scheduledFor: "desc" },
    take: 50,
  });

  const visibleCalls = calls.filter((call, index) => {
    if (call.status === "FAILED" || call.status === "NO_RESPONSE") return false;
    if (call.status !== "IN_PROGRESS") return true;

    return !calls.slice(0, index).some((newerCall) => newerCall.status === "IN_PROGRESS");
  });

  if (!visibleCalls.length) return fallbackReportsByContact[contact];

  return visibleCalls.map((call) => ({
    id: call.id,
    date: formatDate(call.startedAt ?? call.scheduledFor),
    status: formatStatus(call.status),
    memberName: call.member.name,
    summary: call.summary ?? "Conversation is stored. Transcript will appear here after the call finishes processing.",
    transcript: relabelConversationTranscript(call.transcript, call.member.name),
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
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-5 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader
        links={[
          { href: "/dashboard/matt", label: "Matt", active: contact === "matt" },
          { href: "/dashboard/chuck", label: "Chuck", active: contact === "chuck" },
        ]}
      />

      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">example member dashboard</p>
        <div className="mt-4">
          <h1 className="font-bold tracking-tight text-ink">
            <span className="block text-4xl md:text-5xl">Welcome,</span>
            <span className="mt-1 block text-4xl md:text-5xl">{profile.title}</span>
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Focused test space for {profile.name}: calls, transcripts, memory, and retention signals.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {settings.map((item) => (
          <article key={item.label} className="min-w-0 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5 md:p-5">
            <p className="break-words text-sm leading-snug text-slate-500">{item.label}</p>
            <p className="mt-2 break-words text-sm font-bold leading-snug text-ink sm:text-base">{item.value}</p>
          </article>
        ))}
      </section>

      <DashboardActions contact={contact} />

      <section className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-sage">Retention signals</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Is {profile.name} building the habit?</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
              <h2 className="mt-2 text-2xl font-bold text-ink">What DailyCall remembers about {memory.memberName}</h2>
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
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {(values as string[]).map((value) => (
                      <li key={value} className="flex gap-2">
                        <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-brandButtonBlue" />
                        <span>{value}</span>
                      </li>
                    ))}
                  </ul>
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
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {report.topics.map((topic) => (
                        <li key={topic} className="flex gap-2">
                          <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-brandButtonBlue" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
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
