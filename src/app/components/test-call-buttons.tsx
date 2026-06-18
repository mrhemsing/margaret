"use client";

import { useState } from "react";

export const testCallTargets = [
  { label: "Matt", number: "+16043138398" },
  { label: "Chuck", number: "+13068802055" },
];

type TestVoiceMode = { value: "expressive" | "clear"; label: string };

const defaultVoiceModes = [{ value: "expressive", label: "" }] as const satisfies readonly TestVoiceMode[];

export type TestCallTarget = (typeof testCallTargets)[number];

type CallState = {
  status: "idle" | "calling" | "success" | "error";
  message?: string;
};

type TestCallButtonsProps = {
  endpoint: string;
  caregiverName: string;
  disabled?: boolean;
  disabledMessage?: string;
  onLog?: (message: string) => void;
  buildPayload?: (target: TestCallTarget, voiceMode: TestVoiceMode) => Record<string, unknown>;
  voiceModes?: readonly TestVoiceMode[];
  buttonClassName?: string;
};

export function TestCallButtons({
  endpoint,
  caregiverName,
  disabled = false,
  disabledMessage,
  onLog,
  buildPayload,
  voiceModes = defaultVoiceModes,
  buttonClassName,
}: TestCallButtonsProps) {
  const [callStates, setCallStates] = useState<Record<string, CallState>>({});

  async function startTestCall(target: TestCallTarget, voiceMode: TestVoiceMode) {
    const stateKey = `${target.number}:${voiceMode.value}`;
    const labelSuffix = voiceMode.label ? ` - ${voiceMode.label}` : "";
    const buttonLabel = `Test Call (${target.label})${labelSuffix}`;

    setCallStates((current) => ({
      ...current,
      [stateKey]: { status: "calling", message: `Calling ${target.label}${voiceMode.label ? ` ${voiceMode.label}` : ""}...` },
    }));
    onLog?.(`starting ${buttonLabel}`);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNumber: target.number,
          memberName: target.label,
          caregiverName,
          voiceMode: voiceMode.value,
          ...(buildPayload ? buildPayload(target, voiceMode) : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; result?: { sid?: string | null } } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? `${buttonLabel} failed.`);
      }

      const message = `${buttonLabel} started${payload.result?.sid ? ` (${payload.result.sid})` : ""}.`;
      setCallStates((current) => ({
        ...current,
        [stateKey]: { status: "success", message },
      }));
      onLog?.(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${buttonLabel} failed.`;
      setCallStates((current) => ({
        ...current,
        [stateKey]: { status: "error", message },
      }));
      onLog?.(message);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {testCallTargets.flatMap((target) => voiceModes.map((voiceMode) => {
        const stateKey = `${target.number}:${voiceMode.value}`;
        const state = callStates[stateKey] ?? { status: "idle" };
        const isCalling = state.status === "calling";

        return (
          <div key={stateKey}>
            <button
              type="button"
              onClick={() => startTestCall(target, voiceMode)}
              disabled={disabled || isCalling}
              className={
                buttonClassName ??
                "h-11 w-full whitespace-nowrap rounded-xl bg-brandPink px-4 text-sm font-semibold text-white shadow-sm hover:bg-brandPink/90 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {isCalling ? `Calling ${target.label}...` : `Test Call (${target.label})${voiceMode.label ? ` - ${voiceMode.label}` : ""}`}
            </button>
            {disabled && disabledMessage ? <p className="mt-2 text-xs text-slate-500">{disabledMessage}</p> : null}
            {state.message ? (
              <p className={`mt-2 text-xs ${state.status === "error" ? "text-red-700" : state.status === "success" ? "text-sage" : "text-slate-500"}`}>
                {state.message}
              </p>
            ) : null}
          </div>
        );
      }))}
    </div>
  );
}
