"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type UpdateState = {
  status: "idle" | "loading" | "updated" | "error";
  message?: string;
};

export function UpdatePasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  async function updatePassword(formData: FormData) {
    setState({ status: "loading", message: "Updating password..." });

    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setState({ status: "error", message: "Use a password with at least 8 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setState({ status: "error", message: "Those passwords do not match." });
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setState({ status: "updated", message: "Your password has been updated." });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not update your password.",
      });
    }
  }

  return (
    <div className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Set a new password</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Choose a new password for your DailyCall dashboard.</p>

      <form action={updatePassword} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          New password
          <input name="password" type="password" minLength={8} required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="8+ characters" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Confirm password
          <input name="confirmPassword" type="password" minLength={8} required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Re-enter password" />
        </label>
        <button type="submit" disabled={state.status === "loading" || state.status === "updated"} className="rounded-full bg-brandButtonBlue px-6 py-3 text-sm font-bold text-cream shadow-sm transition hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-60">
          {state.status === "loading" ? "Updating..." : "Update password"}
        </button>
      </form>

      {state.message ? (
        <p className={`mt-4 rounded-2xl p-3 text-sm font-semibold ${state.status === "updated" ? "bg-sage/10 text-sage" : "bg-red-50 text-red-700"}`}>{state.message}</p>
      ) : null}

      {state.status === "updated" ? (
        <Link href="/dashboard" className="mt-5 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-ink/90">
          Go to dashboard
        </Link>
      ) : null}
    </div>
  );
}
