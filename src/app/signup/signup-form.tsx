"use client";

import { SubscriptionPlan } from "@prisma/client";
import { useEffect, useState } from "react";

import { planOptions } from "@/lib/plans";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SocialSigninButtons } from "./social-signin-buttons";

type CheckoutState = {
  status: "idle" | "loading" | "error";
  message?: string;
};

export function SignupForm() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SubscriptionPlan.ONE_CALL_DAILY);
  const [enabledCallTimes, setEnabledCallTimes] = useState([true, true, true]);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({ status: "idle" });
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      const supabase = createBrowserSupabaseClient();
      const user = await supabase.auth.getUser();

      if (!cancelled) {
        setAccountEmail(user.data.user?.email ?? null);
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout(formData: FormData) {
    setCheckoutState({ status: "loading", message: "Creating your free trial..." });

    let supabaseUserId: string | undefined;
    const accountPassword = String(formData.get("accountPassword") ?? "");
    const customerEmail = String(formData.get("customerEmail") ?? accountEmail ?? "");
    const customerName = String(formData.get("customerName") ?? "");

    try {
      const supabase = createBrowserSupabaseClient();
      const currentUser = await supabase.auth.getUser();
      supabaseUserId = currentUser.data.user?.id;

      if (!supabaseUserId) {
        if (!accountPassword) {
          setCheckoutState({
            status: "error",
            message: "Create a password or use Google, Apple, or Facebook before starting the trial.",
          });
          return;
        }

        const signup = await supabase.auth.signUp({
          email: customerEmail,
          password: accountPassword,
          options: { data: { full_name: customerName } },
        });

        if (signup.error) throw signup.error;

        if (!signup.data.session) {
          setCheckoutState({
            status: "error",
            message: "Check your email to confirm your account, then log in to finish starting the trial.",
          });
          return;
        }

        supabaseUserId = signup.data.user?.id;
      }
    } catch (error) {
      setCheckoutState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not create account.",
      });
      return;
    }

    const preferredCallTimes = formData
      .getAll("preferredCallTimes")
      .map((value) => String(value).trim())
      .filter(Boolean);

    const payload = {
      supabaseUserId,
      customerName,
      customerEmail,
      customerPhone: String(formData.get("customerPhone") ?? ""),
      customerCountry: String(formData.get("customerCountry") ?? "CA"),
      parentName: String(formData.get("parentName") ?? ""),
      parentPhone: String(formData.get("parentPhone") ?? ""),
      preferredCallTime: preferredCallTimes[0] ?? "09:00",
      preferredCallTimes,
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
      const supabase = createBrowserSupabaseClient();
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        throw new Error("Please log in again before starting the trial.");
      }

      const response = await fetch("/api/signup/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as { ok?: boolean; dashboardUrl?: string; error?: string } | null;

      if (!response.ok || !result?.ok || !result.dashboardUrl) {
        throw new Error(result?.error ?? "Could not start trial.");
      }

      window.location.href = result.dashboardUrl;
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
        <fieldset className="grid gap-4 rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15">
          <h2 className="text-xl font-bold text-ink">1. {accountEmail ? "Dashboard login connected" : "Create your dashboard login"}</h2>
          <p className="text-sm leading-6 text-slate-600">
            {accountEmail
              ? `You're signed in as ${accountEmail}. Continue below to start the trial.`
              : "Use this to access reports, transcripts, call settings, and billing after signup."}
          </p>
          {accountEmail ? <input name="customerEmail" type="hidden" value={accountEmail} /> : null}
          {!accountEmail ? (
            <>
              <SocialSigninButtons />
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or use email
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Email for login and billing
                  <input name="customerEmail" type="email" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="jane@example.com" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Password
                  <input name="accountPassword" type="password" minLength={8} autoComplete="new-password" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="8+ characters" />
                </label>
              </div>
              <p className="text-xs leading-5 text-slate-500">No credit card is needed for the 30-day trial. Password is only needed if you are not using Google.</p>
            </>
          ) : null}
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="mb-2 text-xl font-bold text-ink">2. Adult child / family contact</legend>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Your name
            <input name="customerName" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Jane Caregiver" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Mobile number for reports and alerts
            <input name="customerPhone" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="+1 604 555 0100" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Billing country
            <select name="customerCountry" defaultValue="CA" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink">
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
            <span className="text-xs font-normal leading-5 text-slate-500">Dailycall is initially available only in Canada and the United States.</span>
          </label>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="mb-2 text-xl font-bold text-ink">3. Parent receiving calls</legend>
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
            <legend className="text-xl font-bold text-ink">4. Help us make the calls feel personal</legend>
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

          {selectedPlan === SubscriptionPlan.THREE_CALLS_DAILY ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Custom questions you wish someone would ask them
              <textarea name="questionsToAsk" rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Ask about her childhood in Winnipeg. Ask what music she played with Robert." />
              <span className="text-xs font-normal leading-5 text-slate-500">Included with Companion Plus.</span>
            </label>
          ) : null}

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
          <div>
            <legend className="text-xl font-bold text-ink">5. Choose your trial experience</legend>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your 30-day trial is free. No credit card today. Choose the experience you want to try — you can change plans before billing starts.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {planOptions.map((plan) => (
              <label
                key={plan.value}
                className={`rounded-2xl border bg-white p-4 text-sm font-semibold text-ink transition ${
                  selectedPlan === plan.value ? "border-brandButtonBlue ring-4 ring-brandBlue/20" : "border-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    name="plan"
                    type="radio"
                    className="h-4 w-4 shrink-0"
                    checked={selectedPlan === plan.value}
                    onChange={() => setSelectedPlan(plan.value)}
                  />
                  <span>{plan.label}</span>
                </span>
                <span className="mt-2 inline-flex rounded-full bg-sage/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sage">
                  Free for 30 days
                </span>
                <span className="mt-3 block text-xs font-normal leading-5 text-slate-500">{plan.detail}</span>
                <span className="mt-3 block text-xs font-semibold text-slate-500">After trial: {plan.price} CAD/USD / mo</span>
              </label>
            ))}
          </div>

          {selectedPlan === SubscriptionPlan.THREE_CALLS_DAILY ? (
            <div className="grid gap-3 rounded-3xl bg-brandBlue/10 p-4 ring-1 ring-brandBlue/15 xl:grid-cols-3">
              {[
                { label: "Call 1", defaultValue: "09:00" },
                { label: "Call 2", defaultValue: "13:00" },
                { label: "Call 3", defaultValue: "17:00" },
              ].map((callTime, index) => (
                <div key={callTime.label} className={`min-w-0 rounded-2xl bg-white p-3 ring-1 ring-slate-200 ${enabledCallTimes[index] ? "" : "opacity-60"}`}>
                  <label className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={enabledCallTimes[index]}
                      onChange={(event) => {
                        const nextEnabled = [...enabledCallTimes];
                        nextEnabled[index] = event.target.checked;
                        setEnabledCallTimes(nextEnabled);
                      }}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-brandButtonBlue focus:ring-brandPink"
                    />
                    <span>{callTime.label}</span>
                  </label>
                  <div className="relative">
                    <input
                      name="preferredCallTimes"
                      type="time"
                      defaultValue={callTime.defaultValue}
                      disabled={!enabledCallTimes[index]}
                      required={enabledCallTimes[index] && enabledCallTimes.filter(Boolean).length === 1}
                      aria-label={`${callTime.label} preferred time`}
                      className="time-input w-full min-w-0 rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-base font-normal text-ink outline-none focus:border-brandPink disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink">
                      <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.75-13h-1.5v5.25l4.35 2.61.75-1.23-3.6-2.13V7Z" />
                    </svg>
                  </div>
                </div>
              ))}
              <p className="text-xs font-normal leading-5 text-slate-500 xl:col-span-3">Companion Plus can include up to three preferred daily call windows. Uncheck any call slots you do not want.</p>
            </div>
          ) : (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Preferred call time
              <div className="relative">
                <input name="preferredCallTimes" type="time" defaultValue="09:00" required className="time-input w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-12 font-normal text-ink outline-none focus:border-brandPink" />
                <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink">
                  <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.75-13h-1.5v5.25l4.35 2.61.75-1.23-3.6-2.13V7Z" />
                </svg>
              </div>
            </label>
          )}
        </fieldset>

        <p className="rounded-2xl bg-brandBlue/10 p-4 text-sm font-semibold leading-6 text-ink ring-1 ring-brandBlue/15">
          Your 30-day trial is free. No credit card today. You can change plans before billing starts.
        </p>

        <button
          type="submit"
          disabled={checkoutState.status === "loading"}
          className="rounded-full bg-brandButtonBlue px-6 py-4 font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {checkoutState.status === "loading" ? "Starting free trial..." : "Start free trial"}
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
