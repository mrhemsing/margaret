"use client";

import { useRef, useState } from "react";

import { TestCallButtons } from "@/app/components/test-call-buttons";
import type { VoiceOption } from "@/lib/voice/voice-options";

type LogLine = {
  id: number;
  time: string;
  message: string;
};

const defaultFirstMessage =
  "Hi Matt, this is DailyCall calling through the ElevenLabs test path. I am just checking the voice quality and timing. How are you doing today?";

function nowLabel() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-0 pr-12 font-normal text-ink outline-none focus:border-brandPink"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
        >
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </span>
    </label>
  );
}

export function ElevenLabsTestClient({ configured, voices }: { configured: boolean; voices: readonly VoiceOption[] }) {
  const [voiceId, setVoiceId] = useState<string>(voices[0]?.id ?? "");
  const [firstMessage, setFirstMessage] = useState(defaultFirstMessage);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logIdRef = useRef(0);

  function addLog(message: string) {
    const id = ++logIdRef.current;
    setLogs((current) => [{ id, time: nowLabel(), message }, ...current].slice(0, 20));
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandButtonBlue">voice agent test</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">ElevenLabs direct path</h2>
          </div>
          <span className={["rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", configured ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"].join(" ")}>
            {configured ? "configured" : "missing config"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SelectControl
            label="Voice"
            value={voiceId}
            onChange={setVoiceId}
            options={voices.map((voice) => ({
              label: `${voice.name} - ${voice.gender}`,
              value: voice.id,
            }))}
          />
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Sample
            <audio controls src={`/api/voice/sample?voiceId=${encodeURIComponent(voiceId)}`} className="h-12 w-full" />
          </label>
        </div>

        <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
          First message
          <textarea
            value={firstMessage}
            onChange={(event) => setFirstMessage(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 font-normal leading-7 text-ink outline-none focus:border-brandPink"
          />
        </label>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <TestCallButtons
            endpoint="/api/elevenlabs-test/call"
            caregiverName="DailyCall ElevenLabs test reviewer"
            disabled={!configured}
            onLog={addLog}
            buildPayload={() => ({
              preferredVoiceId: voiceId,
              firstMessage: firstMessage.trim(),
            })}
          />
          <p className="mt-3 text-xs leading-5 text-slate-600">
            Uses ElevenLabs direct outbound calling with a 90-second safety cap. Dashboard calls stay unchanged.
          </p>
          {!configured ? <p className="mt-3 text-sm font-semibold text-red-700">Set ElevenLabs outbound-call credentials before running a test call.</p> : null}
        </div>
      </div>

      <aside className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">test notes</p>
        <h2 className="mt-2 text-xl font-bold text-ink">What to listen for</h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
          <li>Answer-to-first-audio delay on the real phone path.</li>
          <li>Warmth, clarity, and senior-friendly pacing.</li>
          <li>Whether the selected voice stays natural during back-and-forth.</li>
          <li>How it compares with Cartesia, Realtime, and Bridge tests.</li>
        </ul>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="text-sm font-bold text-ink">Recent runs</p>
          <div className="mt-3 grid gap-2">
            {logs.length ? (
              logs.map((line) => (
                <p key={line.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  <span className="font-bold text-slate-800">{line.time}</span> {line.message}
                </p>
              ))
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No test calls started yet.</p>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
