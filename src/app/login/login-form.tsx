"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SocialSigninButtons } from "@/app/signup/social-signin-buttons";

type LoginState = {
  status: "idle" | "loading" | "error";
  message?: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [state, setState] = useState<LoginState>({ status: "idle" });

  async function login(formData: FormData) {
    setState({ status: "loading", message: "Logging in..." });

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not log in.",
      });
    }
  }

  return (
    <div className="grid overflow-hidden rounded-[2rem] bg-white/80 shadow-sm ring-1 ring-black/5 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.9fr)]">
      <div className="max-w-xl p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Log in to DailyCall</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Open your family dashboard, reports, transcripts, and call settings.</p>
        </div>

        <div className="mt-6">
          <SocialSigninButtons next={next} />
        </div>

        <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or use email
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form action={login} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Email
            <input name="email" type="email" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="jane@example.com" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Password
            <input name="password" type="password" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Your password" />
          </label>
          <button type="submit" disabled={state.status === "loading"} className="rounded-full bg-brandButtonBlue px-6 py-3 text-sm font-bold text-cream shadow-sm transition hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-60">
            {state.status === "loading" ? "Logging in..." : "Log in"}
          </button>
        </form>

        {state.status === "error" ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{state.message}</p> : null}

        <p className="mt-6 text-center text-sm text-slate-600">
          New to DailyCall? <Link href="/signup" className="font-bold text-brandButtonBlue hover:text-brandButtonBlueHover">Start your free trial</Link>
        </p>
      </div>
      <div className="relative hidden min-h-[34rem] overflow-hidden bg-brandNavy lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(90,167,223,0.55),transparent_34%),radial-gradient(circle_at_78%_72%,rgba(223,49,154,0.28),transparent_30%)]" />
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white/20 to-transparent" />
      </div>
    </div>
  );
}
