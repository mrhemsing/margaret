"use client";

import { useState } from "react";

type SubmitState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
};

export function SupportContactForm() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  async function submitSupportRequest(formData: FormData) {
    setSubmitState({ status: "loading", message: "Sending your message..." });

    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      topic: String(formData.get("topic") ?? "before_signing_up"),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error ?? "Could not send your message.");
      }

      setSubmitState({
        status: "success",
        message: "Thanks. We received your message and will reply by email.",
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not send your message.",
      });
    }
  }

  return (
    <form action={submitSupportRequest} className="mt-8 grid gap-5 rounded-[2rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Contact support</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Send a question before signing up or get help with an existing account.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Name
          <input name="name" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Jane Caregiver" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Email
          <input name="email" type="email" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="jane@example.com" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Phone optional
          <input name="phone" type="tel" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="(604) 123-4567" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Topic
          <select name="topic" defaultValue="before_signing_up" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink">
            <option value="before_signing_up">Before signing up</option>
            <option value="existing_account">Existing account</option>
            <option value="billing">Billing</option>
            <option value="call_issue">Call issue</option>
            <option value="privacy_safety">Privacy or safety</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        What can we help with?
        <textarea name="message" required minLength={10} rows={5} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Tell us what you need help with." />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={submitState.status === "loading"} className="rounded-full bg-brandButtonBlue px-6 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitState.status === "loading" ? "Sending..." : "Send message"}
        </button>
      </div>

      {submitState.message ? (
        <p className={`text-sm font-semibold ${submitState.status === "error" ? "text-red-700" : "text-sage"}`}>
          {submitState.message}
        </p>
      ) : null}
    </form>
  );
}
