"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { formatNorthAmericanPhoneInput } from "@/lib/phone";
import { defaultVoiceId, voiceOptions } from "@/lib/voice/voice-options";

type DemoFormStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success" }
  | { state: "error"; message: string };

type UtmParams = Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content", string>>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const storageKey = "dailycall_demo_utm";
const demoCompletionDelayMs = 3_000;

function getDigits(value: string) {
  return value.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
}

function readStoredUtms() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.sessionStorage.getItem(storageKey) ?? "{}") as UtmParams;
  } catch {
    return {};
  }
}

function trackEvent(name: string, params?: Record<string, unknown>) {
  window.fbq?.("track", name, params);

  if (name === "Lead") {
    window.gtag?.("event", "demo_submitted", params);
  }

  if (name === "CompleteRegistration") {
    window.gtag?.("event", "demo_completed", params);
  }
}

export function DemoLandingForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState(defaultVoiceId);
  const [status, setStatus] = useState<DemoFormStatus>({ state: "idle" });
  const [utms, setUtms] = useState<UtmParams>({});
  const [showPostDemoCta, setShowPostDemoCta] = useState(false);

  const phoneDigits = useMemo(() => getDigits(phoneNumber), [phoneNumber]);
  const isSubmitting = status.state === "loading" || status.state === "success";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextUtms: UtmParams = {};

    for (const key of utmKeys) {
      const value = params.get(key);
      if (value) nextUtms[key] = value;
    }

    const storedUtms = readStoredUtms();
    const mergedUtms = { ...storedUtms, ...nextUtms };

    if (Object.keys(mergedUtms).length > 0) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(mergedUtms));
    }

    setUtms(mergedUtms);
  }, []);

  useEffect(() => {
    if (status.state !== "success") return;

    const timeout = window.setTimeout(() => {
      trackEvent("CompleteRegistration", { value: 1, source: "ad_landing" });
      setShowPostDemoCta(true);
    }, demoCompletionDelayMs);

    return () => window.clearTimeout(timeout);
  }, [status.state]);

  async function submitDemoCall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (phoneDigits.length !== 10) {
      setStatus({ state: "error", message: "Please enter a 10-digit phone number" });
      return;
    }

    const formData = new FormData(event.currentTarget);

    setStatus({ state: "loading" });
    setShowPostDemoCta(false);

    try {
      const response = await fetch("/api/calls/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          firstName: formData.get("firstName"),
          preferredVoiceId: formData.get("preferredVoiceId"),
          company: formData.get("company"),
          source: "ad_landing",
          utm: utms,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "We could not start the demo call. Please try again.");
      }

      trackEvent("Lead", { value: 1, source: "ad_landing" });
      setStatus({ state: "success" });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "We could not start the demo call. Please try again.",
      });
    }
  }

  if (status.state === "success") {
    return (
      <div className="grid gap-5">
        <div className="rounded-2xl border border-brandBlue/20 bg-white p-5 shadow-sm">
          <p className="text-xl font-bold text-ink">Calling you now</p>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Your phone should ring within 30 seconds. If you don&apos;t see a call, check that your phone isn&apos;t on silent.
          </p>
        </div>
        {showPostDemoCta ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-bold text-ink">Want to set this up for your parent?</p>
            <div className="mt-4 grid gap-3">
              <Link
                href="/signup"
                onClick={() => window.gtag?.("event", "cta_clicked_post_demo", { cta: "trial", source: "ad_landing" })}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-brandButtonBlue px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-brandButtonBlueHover"
              >
                Start your 14-day free trial
              </Link>
              <p className="text-center text-sm font-medium leading-5 text-slate-500">
                Free for 14 days. No credit card needed. <span className="block">Cancel anytime.</span>
              </p>
              <Link
                href="/"
                onClick={() => window.gtag?.("event", "cta_clicked_post_demo", { cta: "learn_more", source: "ad_landing" })}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-brandButtonBlue transition hover:border-brandBlue/50 hover:text-ink"
              >
                See how it works and pricing
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submitDemoCall} className="grid gap-2.5 sm:gap-3" noValidate>
      <div className="hidden">
        <label htmlFor="demo-company">Company</label>
        <input id="demo-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="grid gap-2 text-sm font-bold text-ink">
        <span>
          First name <span className="font-normal text-slate-400">(so the call can greet you)</span>
        </span>
        <input
          name="firstName"
          type="text"
          autoComplete="given-name"
          placeholder="Mary"
          maxLength={40}
          onChange={() => {
            if (status.state === "error") setStatus({ state: "idle" });
          }}
          className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-4 text-[17px] font-semibold text-ink shadow-sm outline-none transition placeholder:text-slate-300 focus:border-brandButtonBlue focus:ring-4 focus:ring-brandBlue/20 sm:min-h-14"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink">
        Phone number
        <input
          name="phoneNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phoneNumber}
          onChange={(event) => {
            setPhoneNumber(formatNorthAmericanPhoneInput(event.currentTarget.value));
            if (status.state === "error") setStatus({ state: "idle" });
          }}
          aria-invalid={status.state === "error"}
          aria-describedby="demo-phone-help"
          placeholder="(555) 555-0123"
          className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-4 text-[17px] font-semibold text-ink shadow-sm outline-none transition placeholder:text-slate-300 focus:border-brandButtonBlue focus:ring-4 focus:ring-brandBlue/20 sm:min-h-14"
        />
        <span id="demo-phone-help" className="text-sm font-medium leading-5 text-slate-500 sm:leading-6">
          We don&apos;t save your number for marketing.
        </span>
      </label>
      {status.state === "error" ? <p className="text-sm font-semibold text-red-700">{status.message}</p> : null}
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-ink">Choose a demo voice</legend>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {voiceOptions.map((voice) => (
            <label
              key={voice.id}
              className={
                "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-2xl border bg-white p-2.5 shadow-sm transition sm:gap-3 sm:p-3 " +
                (selectedVoiceId === voice.id ? "border-brandButtonBlue ring-4 ring-brandBlue/20" : "border-slate-200")
              }
            >
              <Image
                src={voice.imagePath}
                alt=""
                width={48}
                height={48}
                className="h-10 w-10 shrink-0 rounded-xl bg-white object-cover sm:h-12 sm:w-12"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{voice.gender}</span>
                <span className="mt-0.5 hidden text-xs font-semibold leading-5 text-slate-500 sm:block">{voice.name}</span>
              </span>
              <input
                name="preferredVoiceId"
                type="radio"
                value={voice.id}
                checked={selectedVoiceId === voice.id}
                onChange={() => setSelectedVoiceId(voice.id)}
                className="sr-only"
              />
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-brandButtonBlue px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:bg-slate-300 sm:mt-2 sm:min-h-14"
      >
        {status.state === "loading" ? (
          <span className="inline-flex items-center gap-2">
            Calling you now
            <span className="loading-dots" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </span>
        ) : (
          "Call me now"
        )}
      </button>
      <p className="text-center text-sm leading-5 text-slate-500 sm:leading-6">
        We&apos;ll call within 30 seconds.
      </p>
    </form>
  );
}
