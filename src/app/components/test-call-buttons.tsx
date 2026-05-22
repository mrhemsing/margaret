"use client";

import { useState } from "react";

export const testCallTargets = [
  { label: "Matt", number: "+16043138398" },
  { label: "Chuck", number: "+13068802055" },
];

type TestCallTarget = (typeof testCallTargets)[number];

type CallState = {
  status: "idle" | "calling" | "success" | "error";
  message?: string;
};

type TestCallButtonsProps = {
  endpoint: string;
  caregiverName: string;
  disabled?: boolean;
  onLog?: (message: string) => void;
  buildPayload?: (target: TestCallTarget) => Record<string, unknown>;
  buttonClassName?: string;
};

export function TestCallButtons({ endpoint, caregiverName, disabled = false, onLog, buildPayload, buttonClassName }: TestCallButtonsProps) {
  const [callStates, setCallStates] = useState<Record<string, CallState>>({});

  async function startTestCall(target: TestCallTarget) {
    const buttonLabel = `Test Call (${target.label})`;

    setCallStates((current) => ({
      ...current,
      [target.number]: { status: "calling", message: `Calling ${target.label}...` },
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
          ...(buildPayload ? buildPayload(target) : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; result?: { sid?: string | null } } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? `${buttonLabel} failed.`);
      }

      const message = `${buttonLabel} started${payload.result?.sid ? ` (${payload.result.sid})` : ""}.`;
      setCallStates((current) => ({
        ...current,
        [target.number]: { status: "success", message },
      }));
      onLog?.(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${buttonLabel} failed.`;
      setCallStates((current) => ({
        ...current,
        [target.number]: { status: "error", message },
      }));
      onLog?.(message);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {testCallTargets.map((target) => {
        const state = callStates[target.number] ?? { status: "idle" };
        const isCalling = state.status === "calling";

        return (
          <div key={target.number}>
            <button
              type="button"
              onClick={() => startTestCall(target)}
              disabled={disabled || isCalling}
              className={
                buttonClassName ??
                "h-11 w-full whitespace-nowrap rounded-xl bg-brandPink px-4 text-sm font-semibold text-white shadow-sm hover:bg-brandPink/90 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {isCalling ? `Calling ${target.label}...` : `Test Call (${target.label})`}
            </button>
            {state.message ? (
              <p className={`mt-2 text-xs ${state.status === "error" ? "text-red-700" : state.status === "success" ? "text-sage" : "text-slate-500"}`}>
                {state.message}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
