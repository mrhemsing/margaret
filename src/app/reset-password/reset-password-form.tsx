"use client";

import Link from "next/link";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ResetState = {
  status: "idle" | "loading" | "sent" | "error";
  message?: string;
};

export function ResetPasswordForm() {
  const [state, setState] = useState<ResetState>({ status: "idle" });

  async function requestReset(formData: FormData) {
    setState({ status: "loading", message: "Sending reset email..." });

    const email = String(formData.get("email") ?? "").trim();

    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password/update")}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) throw error;

      setState({
        status: "sent",
        message: "Check your email for a secure link to set a new password.",
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not send a password reset email.",
      });
    }
  }

  return (
    <div className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Enter the email for your DailyCall account. We&apos;ll send a secure link to create a new password.</p>

      <form action={requestReset} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Email
          <input name="email" type="email" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="jane@example.com" />
        </label>
        <button type="submit" disabled={state.status === "loading"} className="rounded-full bg-brandButtonBlue px-6 py-3 text-sm font-bold text-cream shadow-sm transition hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-60">
          {state.status === "loading" ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {state.message ? (
        <p className={`mt-4 rounded-2xl p-3 text-sm font-semibold ${state.status === "sent" ? "bg-sage/10 text-sage" : "bg-red-50 text-red-700"}`}>{state.message}</p>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered it? <Link href="/login" className="font-bold text-brandButtonBlue hover:text-brandButtonBlueHover">Back to login</Link>
      </p>
    </div>
  );
}
