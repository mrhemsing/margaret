"use client";

import { SubscriptionPlan } from "@prisma/client";
import { useState } from "react";

import { planOptions } from "@/lib/plans";

type CheckoutState = {
  status: "idle" | "loading" | "error";
  message?: string;
};

export function SignupForm() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SubscriptionPlan.ONE_CALL_DAILY);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({ status: "idle" });

  async function startCheckout(formData: FormData) {
    setCheckoutState({ status: "loading", message: "Creating secure checkout..." });

    const payload = {
      customerName: String(formData.get("customerName") ?? ""),
      customerEmail: String(formData.get("customerEmail") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      parentName: String(formData.get("parentName") ?? ""),
      parentPhone: String(formData.get("parentPhone") ?? ""),
      preferredCallTime: String(formData.get("preferredCallTime") ?? "09:00"),
      familyContext: String(formData.get("familyContext") ?? ""),
      pets: String(formData.get("pets") ?? ""),
      hobbies: String(formData.get("hobbies") ?? ""),
      routines: String(formData.get("routines") ?? ""),
      favoriteTopics: String(formData.get("favoriteTopics") ?? ""),
      topicsToAvoid: String(formData.get("topicsToAvoid") ?? ""),
      importantEvents: String(formData.get("importantEvents") ?? ""),
      questionsToAsk: String(formData.get("questionsToAsk") ?? ""),
      preferredTone: String(formData.get("preferredTone") ?? "warm_patient"),
      ritualPreference: String(formData.get("ritualPreference") ?? "morning_chat"),
      plan: selectedPlan,
    };

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as { ok?: boolean; checkoutUrl?: string; error?: string } | null;

      if (!response.ok || !result?.ok || !result.checkoutUrl) {
        throw new Error(result?.error ?? "Could not start checkout.");
      }

      window.location.href = result.checkoutUrl;
    } catch (error) {
      setCheckoutState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not start checkout.",
      });
    }
  }

  return (
    <form action={startCheckout} className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
      <div className="grid gap-6">
        <fieldset className="grid gap-4">
          <legend className="text-xl font-bold text-ink">1. Adult child / family contact</legend>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Your name
            <input name="customerName" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Jane Caregiver" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Email for account and billing
            <input name="customerEmail" type="email" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="jane@example.com" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Mobile number for reports and alerts
            <input name="customerPhone" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="+1 604 555 0100" />
          </label>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="text-xl font-bold text-ink">2. Parent receiving calls</legend>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Parent name
            <input name="parentName" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Eleanor" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Phone number to call
            <input name="parentPhone" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="+1 306 555 0100" />
          </label>
        </fieldset>

        <fieldset className="grid gap-4 rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15">
          <div>
            <legend className="text-xl font-bold text-ink">3. Help us make the calls feel personal</legend>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Optional, but powerful: the more you share, the more familiar, warm, and natural the daily calls will feel.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Family names and relationships
            <textarea name="familyContext" rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Jane is her daughter. Sam is her grandson. Her late husband was Robert." />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Pets
              <input name="pets" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Molly the dog, Oscar the cat" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Hobbies and interests
              <input name="hobbies" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="gardening, hockey, jazz, church, puzzles" />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Daily routines or rituals
            <textarea name="routines" rows={2} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Coffee at 9, watches Jeopardy, evening walk, Sunday church." />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Favorite conversation topics
              <textarea name="favoriteTopics" rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Family stories, old music, garden, grandkids, recipes." />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Topics to avoid or handle gently
              <textarea name="topicsToAvoid" rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Avoid politics. Be gentle around grief or memory loss." />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Important upcoming events or things to ask about
            <textarea name="importantEvents" rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Ask how Sam’s hockey tournament went. Doctor appointment next Tuesday. Birthday on June 4." />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Questions you wish someone would ask them
            <textarea name="questionsToAsk" rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Ask about her childhood in Winnipeg. Ask what music she played with Robert." />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Preferred tone
              <select name="preferredTone" defaultValue="warm_patient" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink">
                <option value="warm_patient">Warm and patient</option>
                <option value="light_funny">Light and funny</option>
                <option value="calm_reassuring">Calm and reassuring</option>
                <option value="gentle_spiritual">Gentle / spiritual</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Recurring call ritual
              <select name="ritualPreference" defaultValue="morning_chat" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink">
                <option value="morning_chat">Morning coffee chat</option>
                <option value="evening_wind_down">Evening wind-down</option>
                <option value="memory_lane">Memory lane stories</option>
                <option value="trivia_games">Trivia or light games</option>
                <option value="music_chat">Music chat</option>
                <option value="prayer_reflection">Prayer / reflection</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="text-xl font-bold text-ink">4. Schedule and plan</legend>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Preferred call time
            <input name="preferredCallTime" type="time" defaultValue="09:00" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            {planOptions.map((plan) => (
              <label key={plan.value} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-ink">
                <input
                  name="plan"
                  type="radio"
                  className="mr-2"
                  checked={selectedPlan === plan.value}
                  onChange={() => setSelectedPlan(plan.value)}
                />
                <span>{plan.label}</span>
                <span className="mt-2 block text-lg font-bold text-ink">{plan.price}<span className="text-xs font-medium text-slate-500"> / mo</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={checkoutState.status === "loading"}
          className="rounded-full bg-brandButtonBlue px-6 py-4 font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {checkoutState.status === "loading" ? "Opening checkout..." : "Continue to secure payment"}
        </button>

        {checkoutState.message ? (
          <p className={`text-sm ${checkoutState.status === "error" ? "text-red-700" : "text-slate-500"}`}>
            {checkoutState.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
