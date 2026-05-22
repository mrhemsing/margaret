"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getVoiceOption, voiceOptions } from "@/lib/voice/voice-options";

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
    photoUrl: string | null;
    preferredCallTime: string;
    preferredVoiceId: string;
    active: boolean;
    memory: {
      topicsToRevisit: string[];
    } | null;
    callAttempts: Array<{
      id: string;
      scheduledFor: string;
      startedAt: string | null;
      completedAt: string | null;
      status: string;
      summary: string | null;
      mood: string | null;
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

type EditPanel = "profile" | "questions" | "voice" | null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string, onTimeout?: () => void) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      onTimeout?.();
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatCheckInDateTime(value: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  return day + " · " + time;
}

function formatNextCallLine(value: string | null) {
  if (!value) return "Next call not scheduled yet";

  const callDate = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = callDate.toDateString() === today.toDateString();
  const nextDay = callDate.toDateString() === tomorrow.toDateString();
  const dayLabel = sameDay ? "today" : nextDay ? "tomorrow" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(callDate);
  const timeLabel = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(callDate);

  return `Next call: ${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}, ${timeLabel}`;
}

function formatPreferredCallTime(value: string | null | undefined) {
  if (!value) return "Not set";

  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;

  const hour = Number(match[1]);
  const displayHour = hour % 12 || 12;
  const suffix = hour >= 12 ? "PM" : "AM";

  return `${displayHour}:${match[2]} ${suffix}`;
}

function prepareMemberPhotoPreview(file: File) {
  return new Promise<{ file: File; previewUrl: string }>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("Please choose an image smaller than 10 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Could not prepare that photo."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not prepare that photo."));
              return;
            }

            const uploadFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
            resolve({ file: uploadFile, previewUrl: URL.createObjectURL(blob) });
          },
          "image/jpeg",
          0.82,
        );
      };
      image.onerror = () => reject(new Error("Could not read that photo."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
}

function formatUpdatedAgo(members: DashboardMember[]) {
  const timestamps = members.flatMap((member) => member.callAttempts.map((call) => call.completedAt ?? call.startedAt ?? call.scheduledFor));
  const latest = timestamps
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((first, second) => second - first)[0];

  if (!latest) return "Updated just now";

  const minutes = Math.max(1, Math.round((Date.now() - latest) / 60000));
  if (minutes < 60) return `Updated ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.round(hours / 24);
  return `Updated ${days} ${days === 1 ? "day" : "days"} ago`;
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
  return value === "ONE_CALL_DAILY" ? "Wellness" : "Companion";
}

function normalizeQuestions(value: string[]) {
  return value
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function formatCallDuration(call: DashboardMember["callAttempts"][number]) {
  if (!call.startedAt || !call.completedAt) return "Conversation time processing";

  const minutes = Math.max(1, Math.round((new Date(call.completedAt).getTime() - new Date(call.startedAt).getTime()) / 60000));
  if (minutes <= 3) return "Brief conversation";
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"} conversation`;
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

function formatCheckInStatus(value: string) {
  return value === "ANSWERED_OK" ? "Successful check-in" : formatFriendlyStatus(value);
}

function isBackendErrorText(value: string) {
  return /twilio|elevenlabs|openai|realtime|sip|call-id|response:\s*\d+|bridge|bridging|backend|provider|api|webhook|credential|configured|configuration|sid|amd|convai|voicemail-safe|second number|server|fetch failed/i.test(value);
}

function isCompletedStatus(value: string) {
  return ["ANSWERED_OK", "HELP_REQUESTED", "FOLLOW_UP_NEEDED"].includes(value);
}

function isNoConnectCall(call: DashboardMember["callAttempts"][number]) {
  const summary = call.summary ?? "";
  return call.status === "FAILED" || call.status === "NO_RESPONSE" || /could not be connected|couldn't connect|carrier issue|failed/i.test(summary);
}

function stripTechnicalDetails(value: string) {
  return value
    .replace(/SIP Call-ID:\s*\S+/gi, "")
    .replace(/SIP response:\s*\d+\.?/gi, "")
    .replace(/OpenAI Realtime SIP dial completed\.?/gi, "")
    .replace(/OpenAI Realtime call connected\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function warmFamilySummary(value: string) {
  const cleaned = stripTechnicalDetails(value);
  if (!cleaned) return "";

  return cleaned
    .replace(/\b(stated|said)\b/i, "shared")
    .replace(/\bthe user\b/gi, "your loved one")
    .replace(/\bpatient\b/gi, "your loved one");
}

function getFamilyCallOutcome(call: DashboardMember["callAttempts"][number]) {
  if (call.status === "SCHEDULED") {
    return {
      dotClassName: "bg-brandBlue",
      badgeClassName: "bg-brandBlue/10 text-brandButtonBlue ring-brandBlue/20",
      label: "Scheduled",
      text: "DailyCall is scheduled and ready.",
    };
  }

  if (call.status === "IN_PROGRESS") {
    return {
      dotClassName: "bg-brandBlue",
      badgeClassName: "bg-brandBlue/10 text-brandButtonBlue ring-brandBlue/20",
      label: "Calling now",
      text: "DailyCall is trying to connect right now.",
    };
  }

  if (isNoConnectCall(call)) {
    return {
      dotClassName: "bg-red-500",
      badgeClassName: "bg-red-50 text-red-700 ring-red-100",
      label: call.status === "NO_RESPONSE" ? "No answer" : "No connect",
      text: "Answered but couldn't connect — likely a carrier issue.",
    };
  }

  if (isCompletedStatus(call.status)) {
    const summary = call.summary && !isBackendErrorText(call.summary) ? warmFamilySummary(call.summary) : "";
    return {
      dotClassName: "bg-emerald-500",
      badgeClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      label: formatFriendlyStatus(call.status),
      text: summary ? `Connected · ${summary}` : "Connected · Brief check-in completed successfully.",
    };
  }

  const summary = call.summary && !isBackendErrorText(call.summary) ? warmFamilySummary(call.summary) : "";
  return {
    dotClassName: "bg-slate-400",
    badgeClassName: "bg-white text-slate-600 ring-black/10",
    label: formatFriendlyStatus(call.status),
    text: summary || "Call details will appear here after processing finishes.",
  };
}

function translateCallError(value: string) {
  return isBackendErrorText(value) ? "The call was answered but could not be connected successfully." : value;
}

function getFriendlyCallSummary(call: DashboardMember["callAttempts"][number]) {
  return getFamilyCallOutcome(call).text;
}

function getMemberStats(member: DashboardMember) {
  const pastCalls = getPastCalls(member);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const todayKey = now.toDateString();
  const callsThisMonth = pastCalls.filter((call) => {
    const scheduled = new Date(call.scheduledFor);
    return scheduled.getMonth() === month && scheduled.getFullYear() === year && isCompletedStatus(call.status);
  }).length;
  const missedToday = pastCalls.filter((call) => new Date(call.scheduledFor).toDateString() === todayKey && isNoConnectCall(call)).length;
  let streak = 0;

  for (const call of pastCalls) {
    if (isCompletedStatus(call.status)) {
      streak += 1;
      continue;
    }

    break;
  }

  return {
    streak,
    callsThisMonth,
    missedToday,
  };
}

function getConsecutiveNoConnectAlert(member: DashboardMember) {
  const failedRun: DashboardMember["callAttempts"] = [];

  for (const call of getPastCalls(member).filter((item) => item.status !== "SCHEDULED")) {
    if (isNoConnectCall(call)) {
      failedRun.push(call);
      continue;
    }

    break;
  }

  if (failedRun.length < 2) return null;

  const ordered = [...failedRun].sort((first, second) => new Date(first.scheduledFor).getTime() - new Date(second.scheduledFor).getTime());
  return {
    count: failedRun.length,
    start: ordered[0],
    end: ordered[ordered.length - 1],
  };
}

function moodToneClassName(mood: string | null) {
  if (!mood) return "bg-slate-200";
  if (/positive|good|calm|happy|upbeat|bright/i.test(mood)) return "bg-emerald-400";
  if (/low|sad|lonely|anxious|concern/i.test(mood)) return "bg-red-400";
  return "bg-amber-300";
}

function getMoodSparklineCalls(member: DashboardMember) {
  return getPastCalls(member)
    .filter((call) => isCompletedStatus(call.status))
    .slice(0, 7)
    .reverse();
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

function DashboardSkeleton({ view }: { view: "dashboard" | "settings" | "billing" }) {
  if (view === "settings") {
    return (
      <div className="grid min-w-0 gap-6" aria-label="Loading settings">
        <section className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
          <SkeletonBlock className="h-3 w-40" />
          <SkeletonBlock className="mt-4 h-8 w-36" />
          <SkeletonBlock className="mt-4 h-4 w-full max-w-xl" />
          <SkeletonBlock className="mt-2 h-4 w-full max-w-md" />
        </section>

        <section className="grid min-w-0 gap-4">
          <article className="min-w-0 overflow-hidden rounded-[1.5rem] bg-slate-50 p-4 shadow-[0_10px_28px_rgba(18,53,79,0.06)] ring-1 ring-black/5 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-4">
                <SkeletonBlock className="h-24 w-24 shrink-0 md:h-28 md:w-28" />
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-6 w-20" />
                  <SkeletonBlock className="mt-3 h-7 w-44" />
                  <SkeletonBlock className="mt-3 h-4 w-40" />
                  <SkeletonBlock className="mt-3 h-4 w-48 max-w-full" />
                </div>
              </div>
              <SkeletonBlock className="h-11 w-full md:w-40" />
            </div>

            <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="mt-3 h-5 w-32" />
                  <SkeletonBlock className="mt-3 h-4 w-40 max-w-full" />
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
              <SkeletonBlock className="h-11 w-full md:w-28" />
              <SkeletonBlock className="h-11 w-full md:w-36" />
              <SkeletonBlock className="h-11 w-full md:w-40" />
            </div>

            <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <SkeletonBlock className="h-4 w-36" />
              <div className="mt-4 grid gap-3">
                <SkeletonBlock className="h-12 w-full rounded-xl" />
                <SkeletonBlock className="h-12 w-full rounded-xl" />
              </div>
            </section>
          </article>
        </section>
      </div>
    );
  }

  if (view === "billing") {
    return (
      <div className="grid min-w-0 gap-6" aria-label="Loading billing">
        <section className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="mt-4 h-8 w-32" />
          <SkeletonBlock className="mt-4 h-4 w-full max-w-xl" />
        </section>
        <section className="grid min-w-0 gap-3 rounded-[1.5rem] bg-white/70 p-4 shadow-sm ring-1 ring-black/5 md:grid-cols-3 md:p-5">
          {[0, 1, 2].map((item) => (
            <article key={item} className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="mt-3 h-6 w-28" />
              <SkeletonBlock className="mt-3 h-4 w-44 max-w-full" />
            </article>
          ))}
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((item) => (
            <article key={item} className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="mt-3 h-4 w-full max-w-md" />
              <SkeletonBlock className="mt-2 h-4 w-48" />
            </article>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6" aria-label="Loading dashboard">
      <article className="min-w-0 overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5">
        <SkeletonBlock className="h-3 w-44" />
        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-white md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-4">
            <SkeletonBlock className="h-14 w-14 shrink-0" />
            <div className="min-w-0">
              <SkeletonBlock className="h-6 w-20" />
              <SkeletonBlock className="mt-3 h-7 w-44" />
              <SkeletonBlock className="mt-3 h-4 w-36" />
              <SkeletonBlock className="mt-2 h-4 w-56 max-w-full" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:justify-items-end">
            <SkeletonBlock className="h-11 w-full md:w-28" />
            <SkeletonBlock className="h-11 w-full md:w-28" />
          </div>
        </div>
      </article>

      <section className="grid min-w-0 gap-4">
        <article className="min-w-0 overflow-hidden rounded-[1.5rem] bg-[#e8f5f7] p-4 text-[#143746] shadow-sm ring-1 ring-[#c3dde3] md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="h-3 w-24 rounded-full bg-[#174a62]/20" />
              <div className="mt-4 grid gap-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-2 md:gap-3">
                    <div className="h-7 w-8 shrink-0 rounded-full bg-[#174a62]/15 md:w-12" />
                    <div className={`${item === 3 ? "w-56 max-w-[calc(100%-2.5rem)] md:w-72" : "w-52 max-w-[70%] md:w-64"} h-7 rounded-full bg-[#174a62]/15`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1 h-8 w-40 rounded-full bg-[#174a62]/10 md:mt-0" />
          </div>
        </article>
      </section>

      <section className="grid min-w-0 gap-4">
        <article className="min-w-0 overflow-hidden rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-black/5 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 gap-4">
              <SkeletonBlock className="h-14 w-14 shrink-0" />
              <div className="min-w-0">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-4 h-7 w-44" />
                <SkeletonBlock className="mt-4 h-4 w-56 max-w-full" />
              </div>
            </div>
            <SkeletonBlock className="h-11 w-full md:w-40" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-3 h-5 w-32" />
                <SkeletonBlock className="mt-3 h-4 w-40 max-w-full" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SkeletonBlock className="h-9 w-24" />
            <SkeletonBlock className="h-9 w-28" />
          </div>
          <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <SkeletonBlock className="h-4 w-28" />
            <div className="mt-4 grid gap-3">
              <SkeletonBlock className="h-20 w-full rounded-2xl" />
              <SkeletonBlock className="h-20 w-full rounded-2xl" />
            </div>
          </section>
        </article>
      </section>
    </div>
  );
}

function MemberPhoto({ member, className }: { member: DashboardMember; className: string }) {
  return member.photoUrl ? (
    <img src={member.photoUrl} alt="" className={className + " object-cover"} />
  ) : (
    <div className={className + " flex items-center justify-center bg-brandBlue/10 text-lg font-bold text-brandButtonBlue ring-1 ring-brandBlue/15"}>
      {getInitials(member.name)}
    </div>
  );
}

function MemberSummaryCard({ member, onUpdated }: { member: DashboardMember; onUpdated: (member: DashboardMember) => void }) {
  const [calling, setCalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextCall = getNextCall(member);

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
        throw new Error(translateCallError(result?.error ?? "Could not start the call."));
      }

      onUpdated(result.member);
      setMessage(`Calling ${result.member.name} now.`);
    } catch (callError) {
      setError(callError instanceof Error ? translateCallError(callError.message) : "Could not start the call.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5">
      <p className="px-1 text-sm font-semibold uppercase tracking-[0.24em] text-brandPink">Family Dashboard</p>
      <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-white md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 gap-4">
          <MemberPhoto member={member} className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0">
            <span className={"inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold " + (member.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600")}>
              <span className={"h-2 w-2 rounded-full " + (member.active ? "dashboard-status-dot bg-emerald-500" : "bg-slate-400")} />
              {member.active ? "Active" : "Paused"}
            </span>
            <h1 className="mt-2 break-words text-2xl font-bold text-ink">{member.name}</h1>
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{member.phoneNumber}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{nextCall ? formatNextCallLine(nextCall.scheduledFor) : "Next call not scheduled yet"}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:justify-items-end">
          <button
            type="button"
            onClick={() => void startManualCall()}
            disabled={calling || !member.active}
            className="inline-flex w-full max-w-full items-center justify-center rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {calling ? `Calling ${member.name}...` : "Call Now"}
          </button>
          <Link
            href="/dashboard/settings"
            className="inline-flex w-full max-w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-ink shadow-sm ring-1 ring-black/10 hover:bg-slate-50 md:w-auto"
          >
            Settings
          </Link>
        </div>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-sage/10 p-3 text-sm font-semibold text-sage">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </article>
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
  const statusLine = lastCall ? "Check-in completed" : activeMembers.length > 0 ? "Monitoring active" : "Monitoring paused";
  const moodLine = lastCall?.call.mood ? lastCall.call.mood : lastCall ? "Mood summary pending" : "Waiting for first completed call";
  const durationLine = lastCall ? formatCallDuration(lastCall.call) : "Conversation details will appear here";
  const nextLine = formatNextCallLine(nextCall?.call.scheduledFor ?? null);
  const updatedLine = formatUpdatedAgo(members);

  return (
    <section className="grid min-w-0 gap-4">
      <article className="min-w-0 overflow-hidden rounded-[1.5rem] bg-[#e8f5f7] p-4 text-[#143746] shadow-sm ring-1 ring-[#c3dde3] md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-[#4f7b86] md:text-base">Today</p>
            <div className="mt-4 grid gap-2 text-base leading-6 md:text-xl md:leading-8">
              <p className="flex items-start gap-1.5 md:gap-2"><span className="w-6 shrink-0 md:w-7">✅</span><span className="min-w-0">{statusLine}</span></p>
              <p className="flex items-start gap-1.5 md:gap-2"><span className="w-6 shrink-0 md:w-7">😊</span><span className="min-w-0">{moodLine}</span></p>
              <p className="flex items-start gap-1.5 md:gap-2"><span className="w-6 shrink-0 md:w-7">⏱️</span><span className="min-w-0">{durationLine}</span></p>
              <p className="flex items-start gap-1.5 md:gap-2"><span className="w-6 shrink-0 md:w-7">📅</span><span className="min-w-0">{nextLine}</span></p>
            </div>
          </div>
          <p className="mt-1 max-w-full self-start rounded-full bg-white/45 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4f7b86] ring-1 ring-[#d2e5ea] md:mt-0">{updatedLine}</p>
        </div>
      </article>
    </section>
  );
}

function SettingsMemberCard({ member, onUpdated }: { member: DashboardMember; onUpdated: (member: DashboardMember) => void }) {
  const [editPanel, setEditPanel] = useState<EditPanel>(null);
  const [profileForm, setProfileForm] = useState({
    name: member.name,
    phoneNumber: member.phoneNumber,
    photoUrl: member.photoUrl,
    preferredCallTime: member.preferredCallTime,
    preferredVoiceId: member.preferredVoiceId,
  });
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [questions, setQuestions] = useState(() => {
    const storedQuestions = normalizeQuestions(member.memory?.topicsToRevisit ?? []);
    return storedQuestions.length > 0 ? storedQuestions : [""];
  });
  const [saving, setSaving] = useState<EditPanel>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedQuestions = normalizeQuestions(member.memory?.topicsToRevisit ?? []);
    setQuestions(storedQuestions.length > 0 ? storedQuestions : [""]);
  }, [member.memory?.topicsToRevisit]);

  useEffect(() => {
    setProfileForm({
      name: member.name,
      phoneNumber: member.phoneNumber,
      photoUrl: member.photoUrl,
      preferredCallTime: member.preferredCallTime,
      preferredVoiceId: member.preferredVoiceId,
    });
    setSelectedPhotoFile(null);
    setRemovePhoto(false);
  }, [member.name, member.phoneNumber, member.photoUrl, member.preferredCallTime, member.preferredVoiceId]);

  const lastCompletedCall = getLastCompletedCall(member);
  const selectedVoice = getVoiceOption(member.preferredVoiceId);
  const avatarUrl = member.photoUrl ?? null;

  async function handlePhotoSelect(file: File | undefined) {
    if (!file) return;

    setMessage(null);
    setError(null);

    try {
      const preparedPhoto = await prepareMemberPhotoPreview(file);
      setSelectedPhotoFile(preparedPhoto.file);
      setRemovePhoto(false);
      setProfileForm((current) => ({ ...current, photoUrl: preparedPhoto.previewUrl }));
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Could not prepare that photo.");
    }
  }

  async function saveProfile() {
    setSaving("profile");
    setMessage(null);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) throw new Error("Please log in again.");

      if (selectedPhotoFile) {
        const formData = new FormData();
        formData.append("photo", selectedPhotoFile);

        const photoResponse = await fetch(`/api/dashboard/members/${member.id}/photo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        const photoResult = (await photoResponse.json().catch(() => null)) as { ok?: boolean; member?: DashboardMember; error?: string } | null;

        if (!photoResponse.ok || !photoResult?.ok || !photoResult.member) {
          throw new Error(photoResult?.error ?? "Could not upload photo.");
        }
      } else if (removePhoto) {
        const photoResponse = await fetch(`/api/dashboard/members/${member.id}/photo`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const photoResult = (await photoResponse.json().catch(() => null)) as { ok?: boolean; member?: DashboardMember; error?: string } | null;

        if (!photoResponse.ok || !photoResult?.ok || !photoResult.member) {
          throw new Error(photoResult?.error ?? "Could not remove photo.");
        }
      }

      const response = await fetch(`/api/dashboard/members/${member.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: {
            name: profileForm.name,
            phoneNumber: profileForm.phoneNumber,
            preferredCallTime: profileForm.preferredCallTime,
          },
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; member?: DashboardMember; error?: string } | null;

      if (!response.ok || !result?.ok || !result.member) {
        throw new Error(translateCallError(result?.error ?? "Could not save changes."));
      }

      onUpdated(result.member);
      setSelectedPhotoFile(null);
      setRemovePhoto(false);
      setMessage("Profile updated.");
      setEditPanel(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? translateCallError(saveError.message) : "Could not save changes.");
    } finally {
      setSaving(null);
    }
  }

  async function saveMember(payload: { profile?: Partial<typeof profileForm>; questionsToAsk?: string[] }, panel: Exclude<EditPanel, null>) {
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
        throw new Error(translateCallError(result?.error ?? "Could not save changes."));
      }

      onUpdated(result.member);
      if (panel === "questions") {
        const storedQuestions = normalizeQuestions(result.member.memory?.topicsToRevisit ?? []);
        setQuestions(storedQuestions.length > 0 ? storedQuestions : [""]);
      }
      setMessage(panel === "profile" ? "Profile updated." : panel === "voice" ? "Voice updated." : "Questions updated.");
      setEditPanel(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? translateCallError(saveError.message) : "Could not save changes.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.5rem] bg-slate-50 p-4 shadow-[0_10px_28px_rgba(18,53,79,0.06)] ring-1 ring-black/5 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brandBlue/10 text-3xl font-bold text-brandButtonBlue ring-1 ring-brandBlue/15 md:h-28 md:w-28">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(member.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={"inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold " + (member.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600")}>
                <span className={"h-2 w-2 rounded-full " + (member.active ? "dashboard-status-dot bg-emerald-500" : "bg-slate-400")} />
                {member.active ? "Active" : "Paused"}
              </span>
            </div>
            <h2 className="mt-2 break-words text-2xl font-bold text-ink">{member.name}</h2>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
              <span className="dashboard-activity-dot h-1.5 w-1.5 rounded-full bg-brandPink/70" aria-hidden="true" />
              Receiving daily calls
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{member.phoneNumber}</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex w-full max-w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-ink shadow-sm ring-1 ring-black/10 hover:bg-slate-50 md:w-auto"
        >
          View call history
        </Link>
      </div>

      <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-3">
        <div className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Latest check-in</p>
          <p className="mt-2 flex items-center gap-2 text-base font-bold text-ink">
            {lastCompletedCall ? (
              <>
                <span aria-hidden="true">✅</span>
                <span className="min-w-0 break-words">{formatCheckInStatus(lastCompletedCall.status)}</span>
              </>
            ) : (
              "No completed call yet"
            )}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{lastCompletedCall ? formatCheckInDateTime(lastCompletedCall.scheduledFor) : "A completed call will appear here."}</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Preferences</p>
          <p className="mt-2 text-base font-bold text-ink">Preferred time: {formatPreferredCallTime(member.preferredCallTime)}</p>
          <p className="mt-1 break-words text-sm leading-6 text-slate-600">{selectedVoice.name} voice ({selectedVoice.gender})</p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => setEditPanel(editPanel === "profile" ? null : "profile")}
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-bold text-ink shadow-[0_4px_12px_rgba(18,53,79,0.08)] ring-1 ring-brandBlue/20 hover:bg-slate-50 active:translate-y-px md:py-2"
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => setEditPanel(editPanel === "questions" ? null : "questions")}
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-bold text-ink shadow-[0_4px_12px_rgba(18,53,79,0.08)] ring-1 ring-brandBlue/20 hover:bg-slate-50 active:translate-y-px md:py-2"
            >
              Edit questions
            </button>
            <button
              type="button"
              onClick={() => setEditPanel(editPanel === "voice" ? null : "voice")}
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-bold text-ink shadow-[0_4px_12px_rgba(18,53,79,0.08)] ring-1 ring-brandBlue/20 hover:bg-slate-50 active:translate-y-px md:py-2"
            >
              Change voice
            </button>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Conversation focus</p>
          <p className="mt-2 break-words text-sm leading-6 text-slate-600">{selectedVoice.name} voice ({selectedVoice.gender}) · {member.memory?.topicsToRevisit?.[0] ?? "Warm daily check-in and family reassurance."}</p>
        </div>
      </div>

      {editPanel === "profile" ? (
        <form
          className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 xl:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile();
          }}
        >
          <div className="grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5 xl:col-span-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brandBlue/10 text-3xl font-bold text-brandButtonBlue ring-1 ring-brandBlue/15">
              {profileForm.photoUrl ? <img src={profileForm.photoUrl} alt="" className="h-full w-full object-cover" /> : getInitials(profileForm.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">Profile photo</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Upload a clear square or portrait photo. It will appear in Settings and dashboard cards.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="inline-flex w-fit cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-bold text-ink ring-1 ring-black/10 hover:bg-slate-50">
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      void handlePhotoSelect(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {profileForm.photoUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhotoFile(null);
                      setRemovePhoto(true);
                      setProfileForm((current) => ({ ...current, photoUrl: null }));
                    }}
                    className="w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-black/10 hover:text-ink"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>
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

      {editPanel === "voice" ? (
        <form
          className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveMember({ profile: { preferredVoiceId: profileForm.preferredVoiceId } }, "voice");
          }}
        >
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-slate-700">DailyCall voice</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Choose the companion voice your loved one hears on future calls.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
            {voiceOptions.map((voice) => (
              <label
                key={voice.id}
                className={
                  "grid gap-3 rounded-2xl border bg-white p-4 transition " +
                  (profileForm.preferredVoiceId === voice.id ? "border-brandButtonBlue ring-4 ring-brandBlue/20" : "border-slate-200")
                }
              >
                <img
                  src={voice.imagePath}
                  alt=""
                  className={
                    "aspect-square w-full rounded-2xl bg-white " +
                    (voice.imagePath.endsWith(".svg") ? "object-contain p-8 ring-1 ring-slate-100" : "object-cover")
                  }
                />
                <span className="flex items-start gap-3">
                  <input
                    name="preferredVoiceId"
                    type="radio"
                    value={voice.id}
                    checked={profileForm.preferredVoiceId === voice.id}
                    onChange={() => setProfileForm((current) => ({ ...current, preferredVoiceId: voice.id }))}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{voice.name}</span>
                    <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-brandPink">{voice.gender}</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-600">{voice.description}</span>
                  </span>
                </span>
                <audio controls controlsList="nodownload noplaybackrate" preload="none" className="h-10 w-full">
                  <source src={"/api/voice/sample?voiceId=" + encodeURIComponent(voice.id)} type="audio/mpeg" />
                </audio>
              </label>
            ))}
          </div>
          <div className="flex gap-2 lg:col-span-2">
            <button type="submit" disabled={saving === "voice"} className="rounded-full bg-brandButtonBlue px-5 py-2 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:opacity-60">
              {saving === "voice" ? "Saving..." : "Save voice"}
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
                <div key={index} className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-black/5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
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
                    className="w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-black/10 hover:text-ink md:self-end"
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

    </article>
  );
}

function MemberCard({ member, onUpdated, showSummary = true }: { member: DashboardMember; onUpdated: (member: DashboardMember) => void; showSummary?: boolean }) {
  const [calling, setCalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextCall = getNextCall(member);
  const pastCalls = getPastCalls(member);
  const lastCompletedCall = getLastCompletedCall(member);
  const stats = getMemberStats(member);
  const noConnectAlert = getConsecutiveNoConnectAlert(member);
  const moodSparklineCalls = getMoodSparklineCalls(member);
  const latestOutcome = lastCompletedCall ? getFamilyCallOutcome(lastCompletedCall) : null;

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
        throw new Error(translateCallError(result?.error ?? "Could not start the call."));
      }

      onUpdated(result.member);
      setMessage(`Calling ${result.member.name} now.`);
    } catch (callError) {
      setError(callError instanceof Error ? translateCallError(callError.message) : "Could not start the call.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.5rem] bg-slate-50 p-4 shadow-[0_10px_28px_rgba(18,53,79,0.06)] ring-1 ring-black/5 md:p-5">
      {showSummary ? <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 gap-4">
          <MemberPhoto member={member} className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0">
            <span className={"inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold " + (member.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600")}>
              <span className={"h-2 w-2 rounded-full " + (member.active ? "dashboard-status-dot bg-emerald-500" : "bg-slate-400")} />
              {member.active ? "Active" : "Paused"}
            </span>
            <h2 className="mt-2 break-words text-2xl font-bold text-ink">{member.name}</h2>
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{member.phoneNumber}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{nextCall ? formatNextCallLine(nextCall.scheduledFor) : "Next call not scheduled yet"}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:justify-items-end">
          <button
            type="button"
            onClick={() => void startManualCall()}
            disabled={calling || !member.active}
            className="inline-flex w-full max-w-full items-center justify-center rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {calling ? `Calling ${member.name}...` : "Call Now"}
          </button>
          <Link
            href="/dashboard/settings"
            className="inline-flex w-full max-w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-ink shadow-sm ring-1 ring-black/10 hover:bg-slate-50 md:w-auto"
          >
            Settings
          </Link>
        </div>
      </div> : null}

      <div className={(showSummary ? "mt-4 " : "") + "grid min-w-0 gap-3 md:grid-cols-3"}>
        {[
          ["Answer streak", `${stats.streak} ${stats.streak === 1 ? "call" : "calls"}`, "Consecutive successful check-ins"],
          ["Calls this month", stats.callsThisMonth.toString(), "Completed check-ins"],
          ["Missed today", stats.missedToday.toString(), stats.missedToday > 0 ? "Needs attention" : "No missed calls today"],
        ].map(([label, value, detail]) => (
          <div key={label} className={"min-w-0 rounded-2xl p-4 ring-1 " + (label === "Missed today" && stats.missedToday > 0 ? "bg-red-50 ring-red-100" : "bg-white ring-black/5")}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={"mt-1 text-2xl font-bold " + (label === "Missed today" && stats.missedToday > 0 ? "text-red-700" : "text-ink")}>{value}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{detail}</p>
          </div>
        ))}
      </div>

      {noConnectAlert ? (
        <section className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-red-700">Connection alert</p>
              <p className="mt-2 text-base font-bold text-ink">
                {noConnectAlert.count} calls were answered but couldn&apos;t connect.
              </p>
              <p className="mt-1 text-sm leading-6 text-red-800">
                Between {formatCheckInDateTime(noConnectAlert.start.scheduledFor)} and {formatCheckInDateTime(noConnectAlert.end.scheduledFor)}, DailyCall could not complete the connection. This is usually a carrier or routing issue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`#call-history-${member.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm ring-1 ring-red-100 hover:bg-red-50">
                View details
              </a>
              <a href="mailto:support@dailycall.care" className="rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-800">
                Contact support
              </a>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Today&apos;s check-in</p>
            {moodSparklineCalls.length > 0 ? (
              <div className="flex h-9 items-end gap-1" aria-label="7-day mood trend">
                {moodSparklineCalls.map((call, index) => (
                  <span
                    key={call.id}
                    className={"w-2 rounded-full " + moodToneClassName(call.mood)}
                    style={{ height: `${14 + Math.min(index, 6) * 3}px` }}
                    title={call.mood ?? "Mood pending"}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <p className="mt-2 flex items-center gap-2 text-base font-bold text-ink">
            {lastCompletedCall ? (
              <>
                <span aria-hidden="true">✅</span>
                <span className="min-w-0 break-words">{latestOutcome?.label ?? formatCheckInStatus(lastCompletedCall.status)}</span>
              </>
            ) : (
              "No completed call yet"
            )}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{lastCompletedCall ? getFriendlyCallSummary(lastCompletedCall) : "A completed call will appear here."}</p>
          {lastCompletedCall ? <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{formatCheckInDateTime(lastCompletedCall.scheduledFor)}</p> : null}
        </div>
        <div className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next scheduled call</p>
          <p className="mt-2 text-base font-bold text-ink">{nextCall ? formatDateTime(nextCall.scheduledFor) : "Not scheduled yet"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Schedule and voice settings live under Settings.</p>
        </div>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-sage/10 p-3 text-sm font-semibold text-sage">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <section id={`call-history-${member.id}`} className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Call history</p>
            <p className="mt-1 text-sm text-slate-600">Simple summaries from recent DailyCall check-ins.</p>
          </div>
          {nextCall ? <p className="text-sm font-semibold text-brandButtonBlue">Next call: {formatDateTime(nextCall.scheduledFor)}</p> : null}
        </div>
        {pastCalls.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {pastCalls.slice(0, 8).map((call) => {
              const outcome = getFamilyCallOutcome(call);

              return (
              <article key={call.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className={"mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full " + outcome.dotClassName} aria-hidden="true" />
                    <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{outcome.label}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{formatDateTime(call.scheduledFor)}</p>
                    </div>
                  </div>
                  <span className={"w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 " + outcome.badgeClassName}>{outcome.label}</span>
                </div>
                <p className="mt-3 text-base leading-7 text-slate-600 sm:text-sm sm:leading-6">{outcome.text}</p>
              </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No past calls yet. Completed calls will appear here with the most recent at the top.</p>
        )}
      </section>
    </article>
  );
}

export function DashboardHome({ view = "dashboard" }: { view?: "dashboard" | "settings" | "billing" }) {
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
        const session = await withTimeout(
          supabase.auth.getSession(),
          8000,
          "Login session check timed out. Please refresh or log in again.",
        );
        const accessToken = session.data.session?.access_token;

        if (!accessToken) {
          router.replace("/login?next=/dashboard");
          return;
        }

        const controller = new AbortController();
        const response = await withTimeout(
          fetch("/api/dashboard/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          }),
          12000,
          "Dashboard data took too long to load. Please refresh and try again.",
          () => controller.abort(),
        );
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
    return <DashboardSkeleton view={view} />;
  }

  if (state.status === "error") {
    return <section className="rounded-[2rem] bg-red-50 p-8 text-red-800 shadow-sm ring-1 ring-red-100">{state.message}</section>;
  }

  if (!state.customer) {
    return (
      <section className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">No trial yet</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink md:text-5xl">Finish setting up DailyCall.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Your login works. Start the 14-day trial to add a loved one and schedule calls. No credit card required.</p>
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
    <div className="grid min-w-0 gap-6">
      {view === "dashboard" ? (
        <>
          {state.customer.members[0] ? <MemberSummaryCard member={state.customer.members[0]} onUpdated={updateMember} /> : null}
          <DashboardOverview members={state.customer.members} />

          <section className="grid min-w-0 gap-4">
            {state.customer.members.map((member, index) => (
              <MemberCard key={member.id} member={member} onUpdated={updateMember} showSummary={index !== 0} />
            ))}
          </section>
        </>
      ) : view === "settings" ? (
        <>
          <section className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">Account settings</p>
            <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Settings</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Manage loved one details, call schedule, voice, and custom questions here. Call history stays on My dashboard.
            </p>
          </section>

          <section className="grid min-w-0 gap-4">
            {state.customer.members.map((member) => (
              <SettingsMemberCard key={member.id} member={member} onUpdated={updateMember} />
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">Billing</p>
            <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Billing</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Review plan, trial status, and usage here. Payment method and invoices can be wired to Stripe from this page.
            </p>
          </section>

          <section className="grid min-w-0 gap-3 rounded-[1.5rem] bg-white/70 p-4 shadow-sm ring-1 ring-black/5 md:grid-cols-3 md:p-5">
            <article className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trial status</p>
              <p className="mt-1 text-lg font-bold text-ink">{subscription ? formatSubscriptionStatus(subscription.status) : "Pending"}</p>
              <p className="mt-1 text-sm text-slate-600">Ends {formatDateWithDaysRemaining(subscription?.currentPeriodEndsAt ?? null)}</p>
            </article>
            <article className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Plan</p>
              <p className="mt-1 text-lg font-bold text-ink">{subscription ? formatSubscriptionPlan(subscription.plan) : "Trial"}</p>
              <p className="mt-1 text-sm text-slate-600">No credit card on file for trial signup.</p>
            </article>
            <article className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Minutes used</p>
              <p className="mt-1 text-lg font-bold text-ink">{state.customer.minutesUsed}</p>
              <p className="mt-1 text-sm text-slate-600">Total completed call time this trial.</p>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-bold text-ink">Payment method</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Stripe billing setup will live here when payments are turned on.</p>
            </article>
            <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-bold text-ink">Invoices</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Invoices and receipts will appear here after paid billing starts.</p>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
