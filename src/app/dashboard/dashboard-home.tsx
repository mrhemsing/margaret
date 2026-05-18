"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type DashboardCustomer = {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  minutesUsed: number;
  members: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    preferredCallTime: string;
    active: boolean;
    memory: {
      topicsToRevisit: string[];
    } | null;
    callAttempts: Array<{
      id: string;
      scheduledFor: string;
      status: string;
      summary: string | null;
    }>;
  }>;
  subscriptions: Array<{
    id: string;
    plan: string;
    status: string;
    currentPeriodEndsAt: string | null;
  }>;
};

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; customer: DashboardCustomer | null };

type DashboardMember = DashboardCustomer["members"][number];

type EditPanel = "profile" | "questions" | null;

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDateWithDaysRemaining(value: string | null) {
  if (!value) return "Pending";

  const endDate = new Date(value);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));

  return `${formatDate(value)} (${daysRemaining} days)`;
}

function formatSubscriptionStatus(value: string) {
  return value === "TRIALING" || value === "ACTIVE" ? "Active" : formatPlan(value);
}

function formatPlan(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSubscriptionPlan(value: string) {
  return value === "ONE_CALL_DAILY" ? "Companion Daily" : "Companion Plus";
}

function normalizeQuestions(value: string[]) {
  return value
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function sortCallsNewestFirst(calls: DashboardMember["callAttempts"]) {
  return [...calls].sort((first, second) => new Date(second.scheduledFor).getTime() - new Date(first.scheduledFor).getTime());
}

function getNextCall(member: DashboardMember) {
  const now = Date.now();
  return member.callAttempts
    .filter((call) => call.status === "SCHEDULED" && new Date(call.scheduledFor).getTime() >= now)
    .sort((first, second) => new Date(first.scheduledFor).getTime() - new Date(second.scheduledFor).getTime())[0] ?? null;
}

function getPastCalls(member: DashboardMember) {
  const now = Date.now();
  const nextCall = getNextCall(member);
  return sortCallsNewestFirst(
    member.callAttempts.filter((call) => call.id !== nextCall?.id && (call.status !== "SCHEDULED" || new Date(call.scheduledFor).getTime() < now)),
  );
}

function getLastCompletedCall(member: DashboardMember) {
  return getPastCalls(member).find((call) => ["ANSWERED_OK", "HELP_REQUESTED", "FOLLOW_UP_NEEDED"].includes(call.status)) ?? null;
}

function formatFriendlyStatus(value: string) {
  switch (value) {
    case "ANSWERED_OK":
      return "Completed";
    case "FOLLOW_UP_NEEDED":
      return "Follow-up suggested";
    case "HELP_REQUESTED":
      return "Help requested";
    case "NO_RESPONSE":
      return "No answer";
    case "FAILED":
      return "Call did not connect";
    case "SCHEDULED":
      return "Scheduled";
    case "IN_PROGRESS":
      return "Calling now";
    default:
      return formatPlan(value);
  }
}

function getFriendlyCallSummary(call: DashboardMember["callAttempts"][number]) {
  if (call.summary) return call.summary;
  if (call.status === "FAILED" || call.status === "NO_RESPONSE") return "DailyCall will try again automatically when retries are available.";
  if (call.status === "SCHEDULED") return "DailyCall is scheduled and ready.";
  return "Call details will appear here after processing finishes.";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={"skeleton-shimmer rounded-full " + className} />;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6" aria-label="Loading dashboard">
      <section className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
          <div className="grid gap-6">
            <div>
              <SkeletonBlock className="h-3 w-36" />
              <SkeletonBlock className="mt-5 h-10 w-64 max-w-full md:h-12 md:w-96" />
              <div className="mt-5 grid max-w-3xl gap-3">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-10/12" />
              </div>
            </div>

            <article className="rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="mt-4 h-7 w-44" />
                  <SkeletonBlock className="mt-4 h-4 w-72 max-w-full" />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SkeletonBlock className="h-9 w-24" />
                    <SkeletonBlock className="h-9 w-28" />
                    <SkeletonBlock className="h-9 w-32" />
                  </div>
                </div>
                <SkeletonBlock className="h-7 w-20" />
              </div>

              <div className="mt-5 grid gap-4">
                <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                  <SkeletonBlock className="h-4 w-36" />
                  <div className="mt-4 rounded-2xl bg-brandBlue/10 p-4 ring-1 ring-brandBlue/10">
                    <SkeletonBlock className="h-6 w-48" />
                    <SkeletonBlock className="mt-3 h-4 w-32" />
                  </div>
                </section>
                <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                  <SkeletonBlock className="h-4 w-24" />
                  <div className="mt-4 grid gap-3">
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-11/12" />
                    <SkeletonBlock className="h-4 w-8/12" />
                  </div>
                </section>
              </div>
            </article>
          </div>

          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <article key={item} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-3 h-7 w-28" />
                <SkeletonBlock className="mt-3 h-4 w-40" />
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardOverview({ members }: { members: DashboardMember[] }) {
  const activeMembers = members.filter((member) => member.active);
  const nextCalls = members
    .map((member) => ({ member, call: getNextCall(member) }))
    .filter((item): item is { member: DashboardMember; call: NonNullable<ReturnType<typeof getNextCall>> } => item.call !== null)
    .sort((first, second) => new Date(first.call.scheduledFor).getTime() - new Date(second.call.scheduledFor).getTime());
  const completedCalls = members
    .map((member) => ({ member, call: getLastCompletedCall(member) }))
    .filter((item): item is { member: DashboardMember; call: NonNullable<ReturnType<typeof getLastCompletedCall>> } => item.call !== null)
    .sort((first, second) => new Date(second.call.scheduledFor).getTime() - new Date(first.call.scheduledFor).getTime());

  const nextCall = nextCalls[0] ?? null;
  const lastCall = completedCalls[0] ?? null;
  const headline = activeMembers.length > 0 ? "Everything looks good today" : "Monitoring is paused";
  const detail = lastCall
    ? `${lastCall.member.name} completed a check-in ${formatDateTime(lastCall.call.scheduledFor)}.`
    : activeMembers.length > 0
      ? "DailyCall is watching the schedule and will show completed check-ins here."
      : "Turn a loved one back on when you are ready for DailyCall to resume check-ins.";

  return (
    <section className="rounded-[2rem] bg-white/85 p-5 shadow-sm ring-1 ring-black/5 md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 gap-4">
          <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.14)]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">Today</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink md:text-4xl">{headline}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{detail}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Updated recently</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
          <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Last successful call</p>
            <p className="mt-2 text-lg font-bold leading-snug text-ink">{lastCall ? lastCall.member.name : "Pending"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{lastCall ? formatDateTime(lastCall.call.scheduledFor) : "No completed calls yet"}</p>
          </article>
          <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next scheduled call</p>
            <p className="mt-2 text-lg font-bold leading-snug text-ink">{nextCall ? nextCall.member.name : "Pending"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{nextCall ? formatDateTime(nextCall.call.scheduledFor) : "No upcoming call set"}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function MemberCard({ member, onUpdated }: { member: DashboardMember; onUpdated: (member: DashboardMember) => void }) {
  const [editPanel, setEditPanel] = useState<EditPanel>(null);
  const [profileForm, setProfileForm] = useState({
    name: member.name,
    phoneNumber: member.phoneNumber,
    preferredCallTime: member.preferredCallTime,
  });
  const [questions, setQuestions] = useState(() => {
    const storedQuestions = normalizeQuestions(member.memory?.topicsToRevisit ?? []);
    return storedQuestions.length > 0 ? storedQuestions : [""];
  });
  const [saving, setSaving] = useState<EditPanel>(null);
  const [calling, setCalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedQuestions = normalizeQuestions(member.memory?.topicsToRevisit ?? []);
    setQuestions(storedQuestions.length > 0 ? storedQuestions : [""]);
  }, [member.memory?.topicsToRevisit]);

  const nextCall = getNextCall(member);
  const pastCalls = getPastCalls(member);
  const lastCompletedCall = getLastCompletedCall(member);

  async function saveMember(payload: { profile?: typeof profileForm; questionsToAsk?: string[] }, panel: Exclude<EditPanel, null>) {
    setSaving(panel);
    setMessage(null);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) throw new Error("Please log in again.");

      const response = await fetch(`/api/dashboard/members/${member.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; member?: DashboardMember; error?: string } | null;

      if (!response.ok || !result?.ok || !result.member) {
        throw new Error(result?.error ?? "Could not save changes.");
      }

      onUpdated(result.member);
      if (panel === "questions") {
        const storedQuestions = normalizeQuestions(result.member.memory?.topicsToRevisit ?? []);
        setQuestions(storedQuestions.length > 0 ? storedQuestions : [""]);
      }
      setMessage(panel === "profile" ? "Profile updated." : "Questions updated.");
      setEditPanel(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save changes.");
    } finally {
      setSaving(null);
    }
  }

  async function startManualCall() {
    setCalling(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) throw new Error("Please log in again.");

      const response = await fetch(`/api/dashboard/members/${member.id}/call`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; member?: DashboardMember; error?: string } | null;

      if (!response.ok || !result?.ok || !result.member) {
        throw new Error(result?.error ?? "Could not start the call.");
      }

      onUpdated(result.member);
      setMessage(`Calling ${result.member.name} now.`);
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : "Could not start the call.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <article className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-black/5 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brandBlue/10 text-lg font-bold text-brandButtonBlue ring-1 ring-brandBlue/15">
            {getInitials(member.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-sage">Loved one</p>
              <span className={"inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold " + (member.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600")}>
                <span className={"h-2 w-2 rounded-full " + (member.active ? "bg-emerald-500" : "bg-slate-400")} />
                {member.active ? "Active" : "Paused"}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-ink">{member.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{member.phoneNumber}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void startManualCall()}
          disabled={calling || !member.active}
          className="inline-flex w-full items-center justify-center rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          {calling ? `Calling ${member.name}...` : `Call ${member.name} now`}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Last call</p>
          <p className="mt-2 text-base font-bold text-ink">{lastCompletedCall ? formatFriendlyStatus(lastCompletedCall.status) : "No completed call yet"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{lastCompletedCall ? formatDateTime(lastCompletedCall.scheduledFor) : "A completed call will appear here."}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next call</p>
          <p className="mt-2 text-base font-bold text-ink">{nextCall ? formatDateTime(nextCall.scheduledFor) : "Not scheduled"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Preferred time: {member.preferredCallTime || "Not set"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Conversation focus</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{member.memory?.topicsToRevisit?.[0] ?? "Warm daily check-in and family reassurance."}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditPanel(editPanel === "profile" ? null : "profile")}
          className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink ring-1 ring-black/10 hover:bg-slate-50"
        >
          Edit profile
        </button>
        <button
          type="button"
          onClick={() => setEditPanel(editPanel === "questions" ? null : "questions")}
          className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink ring-1 ring-black/10 hover:bg-slate-50"
        >
          Edit questions
        </button>
      </div>

      {editPanel === "profile" ? (
        <form
          className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 xl:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveMember({ profile: profileForm }, "profile");
          }}
        >
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Name
            <input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-ink outline-none focus:border-brandPink" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Phone number
            <input value={profileForm.phoneNumber} onChange={(event) => setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-ink outline-none focus:border-brandPink" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Preferred call time
            <input type="time" value={profileForm.preferredCallTime} onChange={(event) => setProfileForm((current) => ({ ...current, preferredCallTime: event.target.value }))} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-ink outline-none focus:border-brandPink" />
          </label>
          <div className="flex gap-2 xl:col-span-3">
            <button type="submit" disabled={saving === "profile"} className="rounded-full bg-brandButtonBlue px-5 py-2 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:opacity-60">
              {saving === "profile" ? "Saving..." : "Save profile"}
            </button>
            <button type="button" onClick={() => setEditPanel(null)} className="rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-600 ring-1 ring-black/10 hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {editPanel === "questions" ? (
        <form
          className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveMember({ questionsToAsk: normalizeQuestions(questions) }, "questions");
          }}
        >
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Stored custom questions</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Edit the questions DailyCall should weave into future conversations. Save up to 10.</p>
            </div>
            <div className="grid gap-3">
              {questions.map((question, index) => (
                <div key={index} className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-black/5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Question {index + 1}
                    <input
                      value={question}
                      onChange={(event) => {
                        const nextQuestion = event.target.value;
                        setQuestions((current) => current.map((item, itemIndex) => (itemIndex === index ? nextQuestion : item)));
                      }}
                      className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-ink outline-none focus:border-brandPink"
                      placeholder="Ask how Sam's hockey tournament went."
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((current) => {
                        const nextQuestions = current.filter((_, itemIndex) => itemIndex !== index);
                        return nextQuestions.length > 0 ? nextQuestions : [""];
                      });
                    }}
                    className="w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-black/10 hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={questions.length >= 10}
              onClick={() => setQuestions((current) => [...current, ""])}
              className="w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-ink ring-1 ring-black/10 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add question
            </button>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving === "questions"} className="rounded-full bg-brandButtonBlue px-5 py-2 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:opacity-60">
              {saving === "questions" ? "Saving..." : "Save questions"}
            </button>
            <button type="button" onClick={() => setEditPanel(null)} className="rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-600 ring-1 ring-black/10 hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {message ? <p className="mt-4 rounded-2xl bg-sage/10 p-3 text-sm font-semibold text-sage">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Call history</p>
            <p className="mt-1 text-sm text-slate-600">Simple summaries from recent DailyCall check-ins.</p>
          </div>
          {nextCall ? <p className="text-sm font-semibold text-brandButtonBlue">Next call: {formatDateTime(nextCall.scheduledFor)}</p> : null}
        </div>
        {pastCalls.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {pastCalls.slice(0, 5).map((call) => (
              <article key={call.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">{formatFriendlyStatus(call.status)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{formatDateTime(call.scheduledFor)}</p>
                  </div>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-black/10">{formatFriendlyStatus(call.status)}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{getFriendlyCallSummary(call)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No past calls yet. Completed calls will appear here with the most recent at the top.</p>
        )}
      </section>
    </article>
  );
}

export function DashboardHome() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  useEffect(() => {
    const loading = state.status === "loading";
    document.body.dataset.dailycallDashboardLoading = loading ? "true" : "false";
    window.dispatchEvent(new CustomEvent("dailycall:dashboard-loading", { detail: { loading } }));
  }, [state.status]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const supabase = createBrowserSupabaseClient();
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;

        if (!accessToken) {
          router.replace("/login?next=/dashboard");
          return;
        }

        const response = await fetch("/api/dashboard/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = (await response.json().catch(() => null)) as { ok?: boolean; customer?: DashboardCustomer | null; error?: string } | null;

        if (!response.ok || !result?.ok) {
          throw new Error(result?.error ?? "Could not load dashboard.");
        }

        if (!cancelled) setState({ status: "ready", customer: result.customer ?? null });
      } catch (error) {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Could not load dashboard." });
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state.status === "loading") {
    return <DashboardSkeleton />;
  }

  if (state.status === "error") {
    return <section className="rounded-[2rem] bg-red-50 p-8 text-red-800 shadow-sm ring-1 ring-red-100">{state.message}</section>;
  }

  if (!state.customer) {
    return (
      <section className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">No trial yet</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink md:text-5xl">Finish setting up DailyCall.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Your login works. Start the 30-day trial to add a loved one and schedule calls. No credit card required.</p>
        <Link href="/signup" className="mt-6 inline-flex rounded-full bg-brandButtonBlue px-6 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover">
          Start free trial
        </Link>
      </section>
    );
  }

  const subscription = state.customer.subscriptions[0];

  function updateMember(updatedMember: DashboardMember) {
    setState((current) => {
      if (current.status !== "ready" || !current.customer) return current;

      return {
        status: "ready",
        customer: {
          ...current.customer,
          members: current.customer.members.map((member) => (member.id === updatedMember.id ? updatedMember : member)),
        },
      };
    });
  }

  return (
    <div className="grid gap-6">
      <DashboardOverview members={state.customer.members} />

      <section className="grid gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">Family dashboard</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">Loved ones</h2>
        </div>
        {state.customer.members.map((member) => (
          <MemberCard key={member.id} member={member} onUpdated={updateMember} />
        ))}
      </section>

      <section className="grid gap-3 rounded-[1.5rem] bg-white/70 p-4 shadow-sm ring-1 ring-black/5 md:grid-cols-3 md:p-5">
        <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trial status</p>
          <p className="mt-1 text-lg font-bold text-ink">{subscription ? formatSubscriptionStatus(subscription.status) : "Pending"}</p>
          <p className="mt-1 text-sm text-slate-600">Ends {formatDateWithDaysRemaining(subscription?.currentPeriodEndsAt ?? null)}</p>
        </article>
        <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Plan</p>
          <p className="mt-1 text-lg font-bold text-ink">{subscription ? formatSubscriptionPlan(subscription.plan) : "Trial"}</p>
          <p className="mt-1 text-sm text-slate-600">No credit card on file for trial signup.</p>
        </article>
        <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Minutes used</p>
          <p className="mt-1 text-lg font-bold text-ink">{state.customer.minutesUsed}</p>
          <p className="mt-1 text-sm text-slate-600">Total completed call time this trial.</p>
        </article>
      </section>

    </div>
  );
}
