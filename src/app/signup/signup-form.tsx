"use client";

import { SubscriptionPlan } from "@prisma/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { planOptions, trialLengthDays } from "@/lib/plans";
import { formatNorthAmericanPhoneInput, normalizeNorthAmericanPhone } from "@/lib/phone";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { defaultVoiceId, voiceOptions } from "@/lib/voice/voice-options";
import { SocialSigninButtons } from "./social-signin-buttons";

type CheckoutState = {
  status: "idle" | "loading" | "error";
  message?: string;
};

const areaCodeTimezones: Record<string, { value: string; label: string }> = {
  // Pacific
  206: { value: "America/Los_Angeles", label: "Pacific Time" },
  209: { value: "America/Los_Angeles", label: "Pacific Time" },
  213: { value: "America/Los_Angeles", label: "Pacific Time" },
  236: { value: "America/Los_Angeles", label: "Pacific Time" },
  250: { value: "America/Los_Angeles", label: "Pacific Time" },
  253: { value: "America/Los_Angeles", label: "Pacific Time" },
  310: { value: "America/Los_Angeles", label: "Pacific Time" },
  323: { value: "America/Los_Angeles", label: "Pacific Time" },
  360: { value: "America/Los_Angeles", label: "Pacific Time" },
  408: { value: "America/Los_Angeles", label: "Pacific Time" },
  415: { value: "America/Los_Angeles", label: "Pacific Time" },
  425: { value: "America/Los_Angeles", label: "Pacific Time" },
  503: { value: "America/Los_Angeles", label: "Pacific Time" },
  604: { value: "America/Los_Angeles", label: "Pacific Time" },
  619: { value: "America/Los_Angeles", label: "Pacific Time" },
  650: { value: "America/Los_Angeles", label: "Pacific Time" },
  702: { value: "America/Los_Angeles", label: "Pacific Time" },
  778: { value: "America/Los_Angeles", label: "Pacific Time" },
  805: { value: "America/Los_Angeles", label: "Pacific Time" },
  818: { value: "America/Los_Angeles", label: "Pacific Time" },
  858: { value: "America/Los_Angeles", label: "Pacific Time" },
  971: { value: "America/Los_Angeles", label: "Pacific Time" },

  // Mountain
  303: { value: "America/Denver", label: "Mountain Time" },
  306: { value: "America/Regina", label: "Central Time (Saskatchewan)" },
  403: { value: "America/Denver", label: "Mountain Time" },
  406: { value: "America/Denver", label: "Mountain Time" },
  435: { value: "America/Denver", label: "Mountain Time" },
  480: { value: "America/Phoenix", label: "Mountain Time (Arizona)" },
  520: { value: "America/Phoenix", label: "Mountain Time (Arizona)" },
  602: { value: "America/Phoenix", label: "Mountain Time (Arizona)" },
  623: { value: "America/Phoenix", label: "Mountain Time (Arizona)" },
  780: { value: "America/Denver", label: "Mountain Time" },
  801: { value: "America/Denver", label: "Mountain Time" },
  825: { value: "America/Denver", label: "Mountain Time" },
  928: { value: "America/Phoenix", label: "Mountain Time (Arizona)" },

  // Central
  204: { value: "America/Chicago", label: "Central Time" },
  214: { value: "America/Chicago", label: "Central Time" },
  224: { value: "America/Chicago", label: "Central Time" },
  281: { value: "America/Chicago", label: "Central Time" },
  312: { value: "America/Chicago", label: "Central Time" },
  314: { value: "America/Chicago", label: "Central Time" },
  316: { value: "America/Chicago", label: "Central Time" },
  361: { value: "America/Chicago", label: "Central Time" },
  414: { value: "America/Chicago", label: "Central Time" },
  469: { value: "America/Chicago", label: "Central Time" },
  512: { value: "America/Chicago", label: "Central Time" },
  612: { value: "America/Chicago", label: "Central Time" },
  615: { value: "America/Chicago", label: "Central Time" },
  651: { value: "America/Chicago", label: "Central Time" },
  713: { value: "America/Chicago", label: "Central Time" },
  737: { value: "America/Chicago", label: "Central Time" },
  773: { value: "America/Chicago", label: "Central Time" },
  817: { value: "America/Chicago", label: "Central Time" },
  832: { value: "America/Chicago", label: "Central Time" },
  847: { value: "America/Chicago", label: "Central Time" },
  901: { value: "America/Chicago", label: "Central Time" },
  952: { value: "America/Chicago", label: "Central Time" },

  // Eastern
  201: { value: "America/New_York", label: "Eastern Time" },
  202: { value: "America/New_York", label: "Eastern Time" },
  212: { value: "America/New_York", label: "Eastern Time" },
  215: { value: "America/New_York", label: "Eastern Time" },
  226: { value: "America/New_York", label: "Eastern Time" },
  289: { value: "America/New_York", label: "Eastern Time" },
  305: { value: "America/New_York", label: "Eastern Time" },
  313: { value: "America/New_York", label: "Eastern Time" },
  321: { value: "America/New_York", label: "Eastern Time" },
  343: { value: "America/New_York", label: "Eastern Time" },
  404: { value: "America/New_York", label: "Eastern Time" },
  416: { value: "America/New_York", label: "Eastern Time" },
  437: { value: "America/New_York", label: "Eastern Time" },
  514: { value: "America/New_York", label: "Eastern Time" },
  518: { value: "America/New_York", label: "Eastern Time" },
  519: { value: "America/New_York", label: "Eastern Time" },
  561: { value: "America/New_York", label: "Eastern Time" },
  613: { value: "America/New_York", label: "Eastern Time" },
  647: { value: "America/New_York", label: "Eastern Time" },
  705: { value: "America/New_York", label: "Eastern Time" },
  716: { value: "America/New_York", label: "Eastern Time" },
  718: { value: "America/New_York", label: "Eastern Time" },
  781: { value: "America/New_York", label: "Eastern Time" },
  905: { value: "America/New_York", label: "Eastern Time" },
  917: { value: "America/New_York", label: "Eastern Time" },

  // Atlantic / Newfoundland
  506: { value: "America/Halifax", label: "Atlantic Time" },
  709: { value: "America/St_Johns", label: "Newfoundland Time" },
  782: { value: "America/Halifax", label: "Atlantic Time" },
  902: { value: "America/Halifax", label: "Atlantic Time" },
};

const timezoneOptions = [
  { value: "America/St_Johns", label: "Newfoundland Time" },
  { value: "America/Halifax", label: "Atlantic Time" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Regina", label: "Central Time - Saskatchewan" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Phoenix", label: "Mountain Time - Arizona" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
];

function detectTimezoneFromNorthAmericanPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10})/, "");
  const areaCode = digits.slice(0, 3);
  return areaCode.length === 3 ? areaCodeTimezones[areaCode] ?? null : null;
}

export function SignupForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SubscriptionPlan.ONE_CALL_DAILY);
  const [enabledCallTimes, setEnabledCallTimes] = useState([true, true, true]);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({ status: "idle" });
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [accountCheckStatus, setAccountCheckStatus] = useState<"idle" | "checking" | "done">("idle");
  const [detectedTimezone, setDetectedTimezone] = useState<{ value: string; label: string } | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState("America/Los_Angeles");
  const [timezoneEdited, setTimezoneEdited] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState(defaultVoiceId);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      const supabase = createBrowserSupabaseClient();
      const user = await supabase.auth.getUser();
      const email = user.data.user?.email ?? null;

      if (!cancelled) {
        setAccountEmail(email);
      }

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        if (!cancelled) setAccountCheckStatus("done");
        return;
      }

      if (!cancelled) setAccountCheckStatus("checking");

      const response = await fetch("/api/dashboard/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; customer?: unknown } | null;

      if (!cancelled) {
        setHasExistingAccount(Boolean(response.ok && result?.ok && result.customer));
        setAccountCheckStatus("done");
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accountEmail) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("step") !== "2") return;

    setCurrentStep(1);
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [accountEmail]);

  async function signOutForNewSignup() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  const wizardSteps = [
    { eyebrow: "Step 1 of 4", title: "Your account", fields: accountEmail ? ["customerName", "customerPhone", "customerCountry"] : ["customerEmail", "accountPassword", "customerName", "customerPhone", "customerCountry"] },
    { eyebrow: "Step 2 of 4", title: "Plan and schedule", fields: ["plan", "parentName", "parentPhone", "timezone", "preferredCallTimes"] },
    { eyebrow: "Step 3 of 4", title: "Make calls feel familiar", fields: ["preferredVoiceId", "preferredTone"] },
    { eyebrow: "Step 4 of 4", title: "Review and start trial", fields: [] },
  ];

  function validateCurrentStep() {
    const form = formRef.current;
    if (!form) return true;

    const fields = wizardSteps[currentStep]?.fields ?? [];
    for (const field of fields) {
      const controls = Array.from(form.elements.namedItem(field) instanceof RadioNodeList ? (form.elements.namedItem(field) as RadioNodeList) : [form.elements.namedItem(field)]).filter(Boolean) as HTMLInputElement[];
      if (field === "plan" || field === "preferredVoiceId" || field === "preferredCallTimes") {
        if (!controls.some((control) => !control.disabled && ((control.type === "radio" || control.type === "checkbox") ? control.checked : Boolean(control.value)))) {
          setStepError("Choose an option before continuing.");
          return false;
        }
        continue;
      }

      const control = controls.find((item) => !item.disabled);
      if (!control || !control.value.trim()) {
        control?.focus();
        setStepError("Fill in the required fields before continuing.");
        return false;
      }

      if (control.type === "email" && !control.checkValidity()) {
        control.focus();
        setStepError("Enter a valid email address before continuing.");
        return false;
      }

      if (control.type === "tel") {
        const normalized = normalizeNorthAmericanPhone(control.value);
        if (!normalized || normalized.replace(/\D/g, "").length < 11) {
          control.focus();
          setStepError("Enter a 10-digit US or Canadian phone number with area code.");
          return false;
        }
      }

      if (field === "accountPassword" && control.value.length < 8) {
        control.focus();
        setStepError("Use a password with at least 8 characters.");
        return false;
      }
    }

    setStepError(null);
    return true;
  }

  function goToNextStep() {
    if (!validateCurrentStep()) return;
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToPreviousStep() {
    setStepError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

    const customerCountry = String(formData.get("customerCountry") ?? "CA");

    const payload = {
      supabaseUserId,
      customerName,
      customerEmail,
      customerPhone: normalizeNorthAmericanPhone(String(formData.get("customerPhone") ?? "")),
      customerCountry,
      parentName: String(formData.get("parentName") ?? ""),
      parentPhone: normalizeNorthAmericanPhone(String(formData.get("parentPhone") ?? "")),
      timezone: String(formData.get("timezone") ?? selectedTimezone),
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
      preferredVoiceId: String(formData.get("preferredVoiceId") ?? selectedVoiceId),
      ritualPreference: formData
        .getAll("ritualPreference")
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(", "),
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
    <form ref={formRef} action={startCheckout} className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
      <div className="grid gap-6">
        {accountEmail && accountCheckStatus === "checking" ? (
          <section className="rounded-3xl bg-brandBlue/10 p-5 text-sm font-semibold text-slate-600 ring-1 ring-brandBlue/15">
            Checking your account...
          </section>
        ) : null}

        {accountEmail && accountCheckStatus === "checking" ? null : accountEmail && hasExistingAccount ? (
          <section className="grid gap-4 rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">Account connected</p>
            <h2 className="text-2xl font-bold text-ink">You&apos;re already signed up.</h2>
            <p className="text-sm leading-6 text-slate-600">
              You&apos;re logged in as <strong className="font-bold text-ink">{accountEmail}</strong>. Go to your dashboard to manage your trial, loved one profile, and call settings.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="rounded-full bg-brandButtonBlue px-6 py-3 text-center text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover">
                Go to dashboard
              </Link>
              <button type="button" onClick={signOutForNewSignup} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-black/5 hover:text-ink">
                Log out to start a different signup
              </button>
            </div>
          </section>
        ) : (
          <>
        <div className="grid gap-4 rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage">{wizardSteps[currentStep].eyebrow}</p>
              <h2 className="mt-1 text-2xl font-bold text-ink">{wizardSteps[currentStep].title}</h2>
            </div>
            <p className="text-sm font-bold text-slate-500">{currentStep + 1}/{wizardSteps.length}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-brandButtonBlue transition-all" style={{ width: `${((currentStep + 1) / wizardSteps.length) * 100}%` }} />
          </div>
        </div>

        <fieldset className={`${currentStep === 0 ? "grid" : "hidden"} gap-4 rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15`}>
          <h2 className="text-xl font-bold text-ink">{accountEmail ? "Dashboard login connected" : "Create your dashboard login"}</h2>
          <p className="text-sm leading-6 text-slate-600">
            {accountEmail ? (
              <>
                You&apos;re signed in as <strong className="font-bold text-ink">{accountEmail}</strong>. Continue below to start the trial.
              </>
            ) : (
              "Use this to access reports, transcripts, call settings, and billing after signup."
            )}
          </p>
          {accountEmail ? <input name="customerEmail" type="hidden" value={accountEmail} /> : null}
          {!accountEmail ? (
            <>
              <SocialSigninButtons next="/signup?step=2" />
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or use email
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Email for login and billing
                  <input name="customerEmail" type="email" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="jane@example.com" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Password
                  <input name="accountPassword" type="password" minLength={8} autoComplete="new-password" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="8+ characters" />
                </label>
              </div>
              <p className="text-sm leading-6 text-slate-500 md:text-xs md:leading-5">No credit card is needed for the {trialLengthDays}-day trial. Password is only needed if you are not using Google.</p>
            </>
          ) : null}
        </fieldset>

        <fieldset className={`${currentStep === 0 ? "grid" : "hidden"} gap-4`}>
          <legend className="mb-2 text-xl font-bold text-ink">Adult child / family contact</legend>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Your name
            <input name="customerName" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Jane Caregiver" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Your mobile number for reports and alerts
            <input
              name="customerPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              minLength={10}
              pattern="[+]?[-().\s\d]{10,}"
              title="Enter a 10-digit US or Canadian phone number with area code."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink"
              placeholder="(604) 123-4567"
              onChange={(event) => {
                event.currentTarget.value = formatNorthAmericanPhoneInput(event.currentTarget.value);
              }}
            />
            <span className="text-sm font-normal leading-6 text-slate-500 md:text-xs md:leading-5">Use a 10-digit US or Canadian number with area code. You do not need to enter 1.</span>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Billing country
            <select name="customerCountry" defaultValue="CA" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink">
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
            <span className="text-sm font-normal leading-6 text-slate-500 md:text-xs md:leading-5">DailyCall is initially available only in Canada and the United States.</span>
          </label>
        </fieldset>

        <fieldset className={`${currentStep === 1 ? "grid" : "hidden"} gap-4`}>
          <legend className="mb-2 text-xl font-bold text-ink">Parent receiving calls</legend>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Parent name
            <input name="parentName" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink" placeholder="Eleanor" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Loved one&apos;s phone number to call
            <input
              name="parentPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              minLength={10}
              pattern="[+]?[-().\s\d]{10,}"
              title="Enter a 10-digit US or Canadian phone number with area code."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink"
              placeholder="(206) 123-4567"
              onChange={(event) => {
                event.currentTarget.value = formatNorthAmericanPhoneInput(event.currentTarget.value);
                const nextTimezone = detectTimezoneFromNorthAmericanPhone(event.currentTarget.value);
                setDetectedTimezone(nextTimezone);

                if (nextTimezone && !timezoneEdited) {
                  setSelectedTimezone(nextTimezone.value);
                }
              }}
            />
          </label>
        </fieldset>

        <fieldset className={`${currentStep === 2 ? "grid" : "hidden"} gap-4`}>
          <div>
            <legend className="mb-2 text-xl font-bold text-ink">Choose a voice</legend>
            <p className="text-sm leading-6 text-slate-600">
              Pick the voice your loved one will hear. You can change this later in <strong className="font-bold text-ink">My Dashboard</strong>.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {voiceOptions.map((voice) => (
              <label
                key={voice.id}
                className={
                  "grid gap-3 rounded-2xl border bg-white p-4 transition " +
                  (selectedVoiceId === voice.id ? "border-brandButtonBlue ring-4 ring-brandBlue/20" : "border-slate-200")
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
                    checked={selectedVoiceId === voice.id}
                    onChange={() => setSelectedVoiceId(voice.id)}
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
        </fieldset>

        <fieldset className={`${currentStep === 2 ? "grid" : "hidden"} gap-4 rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15`}>
          <div>
            <legend className="text-xl font-bold text-ink">Help us make the calls feel personal</legend>
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

          <label className={`grid gap-2 text-sm font-semibold ${selectedPlan === SubscriptionPlan.THREE_CALLS_DAILY ? "text-slate-700" : "text-slate-500"}`}>
            Custom questions you wish someone would ask them
            <textarea
              name="questionsToAsk"
              rows={3}
              disabled={selectedPlan !== SubscriptionPlan.THREE_CALLS_DAILY}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink disabled:bg-slate-100 disabled:text-slate-400 disabled:placeholder:text-slate-400"
              placeholder="Ask about her childhood in Winnipeg. Ask what music she played with Robert."
            />
            <span className="text-sm font-normal leading-6 text-slate-500 md:text-xs md:leading-5">
              {selectedPlan === SubscriptionPlan.THREE_CALLS_DAILY ? "Included with Companion." : "Available with Companion."}
            </span>
          </label>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-700 md:max-w-[calc(50%-0.5rem)]">
              Preferred tone
              <select name="preferredTone" defaultValue="warm_patient" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink">
                <option value="warm_patient">Warm and patient</option>
                <option value="light_funny">Light and funny</option>
                <option value="calm_reassuring">Calm and reassuring</option>
                <option value="gentle_spiritual">Gentle / spiritual</option>
              </select>
            </label>
            <div className="grid gap-2 text-sm font-semibold text-slate-700">
              <p>Recurring interests</p>
              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 font-normal text-ink sm:grid-cols-2">
                {[
                  ["Morning coffee chat", "morning_coffee_chat"],
                  ["Evening wind-down", "evening_wind_down"],
                  ["Memory lane stories", "memory_lane_stories"],
                  ["Trivia or light games", "trivia_light_games"],
                  ["Music chat", "music_chat"],
                  ["Prayer / reflection", "prayer_reflection"],
                ].map(([label, value]) => (
                  <label key={value} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    <input
                      name="ritualPreference"
                      type="checkbox"
                      value={label}
                      defaultChecked={value === "morning_coffee_chat"}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-brandButtonBlue focus:ring-brandPink"
                    />
                    <span className="min-w-0">{label}</span>
                  </label>
                ))}
              </div>
              <span className="text-sm font-normal leading-6 text-slate-500 md:text-xs md:leading-5">Choose any recurring topics they may enjoy during calls.</span>
            </div>
          </div>
        </fieldset>

        <fieldset className={`${currentStep === 1 ? "grid" : "hidden"} gap-4`}>
          <div>
            <legend className="text-xl font-bold text-ink">Choose your trial experience</legend>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your {trialLengthDays}-day trial is free. No credit card today. Choose the experience you want to try — you can change plans before billing starts.
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
                  Free for {trialLengthDays} days
                </span>
                <span className="mt-3 block text-sm font-normal leading-6 text-slate-500 md:text-xs md:leading-5">{plan.detail}</span>
                <span className="mt-2 block text-sm font-semibold leading-6 text-slate-500 md:text-xs md:leading-5">
                  Trial includes {plan.trialMinutes} minutes. Then {plan.monthlyMinutes} minutes/month.
                </span>
                <span className="mt-3 block text-sm font-semibold leading-6 text-slate-500 md:text-xs md:leading-5">After trial: {plan.price} / mo</span>
              </label>
            ))}
          </div>

          <div className="grid gap-3">
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
                        aria-label={`${callTime.label} preferred time`}
                        className="time-input w-full min-w-0 rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-base font-normal text-ink outline-none focus:border-brandPink disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink">
                        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.75-13h-1.5v5.25l4.35 2.61.75-1.23-3.6-2.13V7Z" />
                      </svg>
                    </div>
                  </div>
                ))}
                <p className="text-sm font-normal leading-6 text-slate-500 md:text-xs md:leading-5 xl:col-span-3">Companion can include up to three preferred daily call windows. Uncheck any call slots you do not want.</p>
              </div>
            ) : (
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Preferred call time
                <div className="relative">
                  <input name="preferredCallTimes" type="time" defaultValue="09:00" className="time-input w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-12 font-normal text-ink outline-none focus:border-brandPink" />
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink">
                    <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.75-13h-1.5v5.25l4.35 2.61.75-1.23-3.6-2.13V7Z" />
                  </svg>
                </div>
              </label>
            )}
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Call timezone
              <select
                name="timezone"
                value={selectedTimezone}
                onChange={(event) => {
                  setSelectedTimezone(event.target.value);
                  setTimezoneEdited(true);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal text-ink outline-none focus:border-brandPink"
              >
                {timezoneOptions.map((timezone) => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600 ring-1 ring-slate-200 md:text-xs md:leading-5">
              {detectedTimezone
                ? `Detected from loved one's phone number: ${detectedTimezone.label}`
                : "Enter the loved one's phone number above and we'll suggest a timezone from the area code. You can change it if needed."}
            </p>
          </div>
        </fieldset>

        {currentStep === 3 ? (
          <section className="grid gap-4 rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15">
            <h2 className="text-xl font-bold text-ink">Ready to start the free trial</h2>
            <p className="text-sm leading-6 text-slate-600">
              Your account, loved one&apos;s call details, plan, schedule, and personalization are ready. No credit card today.
            </p>
          </section>
        ) : null}

        <div className={`${currentStep === 3 ? "grid" : "hidden"} gap-4 md:grid-cols-[auto_1fr] md:items-center`}>
          <p className="order-1 rounded-2xl bg-brandBlue/10 p-4 text-sm font-semibold leading-6 text-ink ring-1 ring-brandBlue/15 md:order-2">
            Your {trialLengthDays}-day trial is free. No credit card today. You can change plans before billing starts.
          </p>

          <button
            type="submit"
            disabled={checkoutState.status === "loading"}
            className="order-2 rounded-full bg-brandButtonBlue px-6 py-4 font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:bg-slate-400 md:order-1 md:min-w-48"
          >
            {checkoutState.status === "loading" ? "Starting free trial..." : "Start free trial"}
          </button>
        </div>

        {checkoutState.message ? (
          <p className={`text-sm ${checkoutState.status === "error" ? "text-red-700" : "text-slate-500"}`}>
            {checkoutState.message}
          </p>
        ) : null}

        {stepError ? <p className="text-sm font-semibold text-red-700">{stepError}</p> : null}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={currentStep === 0 || checkoutState.status === "loading"}
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          {currentStep < wizardSteps.length - 1 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="rounded-full bg-brandButtonBlue px-6 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover"
            >
              Continue
            </button>
          ) : null}
        </div>
          </>
        )}
      </div>
    </form>
  );
}
