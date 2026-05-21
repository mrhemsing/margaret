"use client";

import { useState } from "react";

const testNumbers = [
  { label: "Matt", number: "+16043138398" },
  { label: "Chuck", number: "+13068802055" },
];

type CallState = {
  status: "idle" | "calling" | "success" | "error";
  message?: string;
};

export function CallTestPanel() {
  const [callStates, setCallStates] = useState<Record<string, CallState>>({});

  async function startTestCall(number: string, label: string) {
    setCallStates((current) => ({
      ...current,
      [number]: { status: "calling", message: `Calling ${label}...` },
    }));

    try {
      const response = await fetch("/api/calls/outbound-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNumber: number,
          memberName: label,
          caregiverName: "DailyCall test reviewer",
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Call request failed");
      }

      setCallStates((current) => ({
        ...current,
        [number]: { status: "success", message: "Call started" },
      }));
    } catch (error) {
      setCallStates((current) => ({
        ...current,
        [number]: {
          status: "error",
          message: error instanceof Error ? error.message : "Call failed",
        },
      }));
    }
  }

  return (
    <section className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sage">Voice agent test</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Call to test</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Trigger a live outbound check-in call from the DailyCall voice agent.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {testNumbers.map((testNumber) => {
          const state = callStates[testNumber.number] ?? { status: "idle" };
          const isCalling = state.status === "calling";

          return (
            <article key={testNumber.number} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-semibold text-ink">{testNumber.label}</p>
                <p className="mt-1 font-mono text-sm text-slate-500">{testNumber.number}</p>
                <button
                  type="button"
                  onClick={() => startTestCall(testNumber.number, testNumber.label)}
                  disabled={isCalling}
                  className="mt-4 w-full rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
                >
                  {isCalling ? "Calling..." : "Call to test"}
                </button>
              </div>
              {state.message ? (
                <p
                  className={`mt-3 text-sm ${
                    state.status === "error" ? "text-red-700" : state.status === "success" ? "text-sage" : "text-slate-500"
                  }`}
                >
                  {state.message}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

