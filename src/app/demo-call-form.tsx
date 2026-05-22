"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";

import { formatNorthAmericanPhoneInput } from "@/lib/phone";
import { defaultVoiceId, voiceOptions } from "@/lib/voice/voice-options";

type DemoStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

function isValidPhoneNumber(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  return digits.length >= 10 && digits.length <= 15 && /^[+]?[-().\s\d]+$/.test(trimmed);
}

export function DemoCallForm() {
  const [status, setStatus] = useState<DemoStatus>({ state: "idle" });
  const [selectedVoiceId, setSelectedVoiceId] = useState(defaultVoiceId);

  async function submitDemoCall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const phoneNumber = String(formData.get("phoneNumber") ?? "");

    if (!isValidPhoneNumber(phoneNumber)) {
      setStatus({ state: "error", message: "Please enter a valid phone number with area code." });
      return;
    }

    setStatus({ state: "loading" });

    try {
      const response = await fetch("/api/calls/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          firstName: formData.get("firstName"),
          preferredVoiceId: formData.get("preferredVoiceId"),
          company: formData.get("company"),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "We could not start the demo call. Please try again.");
      }

      form.reset();
      setSelectedVoiceId(defaultVoiceId);
      setStatus({ state: "success", message: "Demo call started. Your phone should ring shortly." });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "We could not start the demo call. Please try again.",
      });
    }
  }

  return (
    <form onSubmit={submitDemoCall} className="grid gap-3 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5 md:h-full md:min-h-[360px] md:content-center">
      <div className="hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Your first name
        <input
          name="firstName"
          type="text"
          autoComplete="given-name"
          placeholder="Name"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brandButtonBlue focus:ring-4 focus:ring-brandBlue/20"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Phone number for the demo call
        <input
          name="phoneNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          minLength={10}
          pattern="[+]?[-().\\s\\d]{10,}"
          title="Enter a valid phone number with area code."
          placeholder="(604) 123-4567"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brandButtonBlue focus:ring-4 focus:ring-brandBlue/20"
          onChange={(event) => {
            event.currentTarget.value = formatNorthAmericanPhoneInput(event.currentTarget.value);
          }}
        />
      </label>
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-ink">Choose a demo voice</legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {voiceOptions.map((voice) => (
            <label
              key={voice.id}
              className={
                "flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3 transition " +
                (selectedVoiceId === voice.id ? "border-brandButtonBlue ring-4 ring-brandBlue/20" : "border-slate-200")
              }
            >
              <Image
                src={voice.imagePath}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-2xl bg-white object-cover"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{voice.gender}</span>
                <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">{voice.name}</span>
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
        disabled={status.state === "loading"}
        className="rounded-full bg-brandButtonBlue px-5 py-3 font-semibold text-cream shadow-sm transition hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.state === "loading" ? "Starting demo call..." : "Call me with a demo"}
      </button>
      <p className="text-xs leading-5 text-slate-500">
        Free 1-minute demo call. No app, no commitment. We don’t share or save your info for marketing, and you won’t receive solicitations. Standard carrier rates may apply.
      </p>
      {status.state === "success" ? <p className="rounded-2xl bg-brandBlue/10 p-3 text-sm font-semibold text-ink">{status.message}</p> : null}
      {status.state === "error" ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{status.message}</p> : null}
    </form>
  );
}
