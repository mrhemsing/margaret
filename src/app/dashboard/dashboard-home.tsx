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

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatPlan(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DashboardHome() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState>({ status: "loading" });

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

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (state.status === "loading") {
    return <section className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">Loading your dashboard...</section>;
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

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">Family dashboard</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink md:text-5xl">Welcome, {state.customer.fullName}.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Manage your DailyCall trial, loved one profile, reports, and call history.</p>
          </div>
          <button type="button" onClick={signOut} className="w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-black/5 hover:text-ink">
            Sign out
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trial status</p>
          <p className="mt-2 text-2xl font-bold text-ink">{subscription ? formatPlan(subscription.status) : "Pending"}</p>
          <p className="mt-1 text-sm text-slate-600">Ends {formatDate(subscription?.currentPeriodEndsAt ?? null)}</p>
        </article>
        <article className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Plan</p>
          <p className="mt-2 text-2xl font-bold text-ink">{subscription ? formatPlan(subscription.plan) : "Trial"}</p>
          <p className="mt-1 text-sm text-slate-600">No credit card on file for trial signup.</p>
        </article>
        <article className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Minutes used</p>
          <p className="mt-2 text-2xl font-bold text-ink">{state.customer.minutesUsed}</p>
          <p className="mt-1 text-sm text-slate-600">Total completed call time this trial.</p>
        </article>
      </section>

      <section className="grid gap-4">
        {state.customer.members.map((member) => (
          <article key={member.id} className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sage">Loved one</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">{member.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{member.phoneNumber} · Preferred call time: {member.preferredCallTime}</p>
              </div>
              <span className="w-fit rounded-full bg-sage/15 px-3 py-1 text-sm font-bold text-sage">{member.active ? "Active" : "Paused"}</span>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-ink">Recent calls</p>
              {member.callAttempts.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {member.callAttempts.map((call) => (
                    <li key={call.id}>{formatDate(call.scheduledFor)} · {formatPlan(call.status)}{call.summary ? ` — ${call.summary}` : ""}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No calls yet. Scheduled calls will appear here once the trial is running.</p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
