"use client";

import { useRef, useState } from "react";

type TestStatus = "idle" | "loading" | "ready" | "error";

type LogLine = {
  id: number;
  time: string;
  message: string;
};

const defaultTranscript =
  "Hi Margaret, this is DailyCall with your quick check-in. I am here if anything is on your mind, or if you would just like a short chat. How are you doing today?";

const voiceOptions = [
  { label: "Barbershop Man", value: "694f9389-aac1-45b6-b726-9d9369183238" },
  { label: "DailyCall candidate", value: "a0e99841-438c-4a64-b679-ae501e7d6091" },
];

const modelOptions = [
  { label: "Sonic 2", value: "sonic-2" },
  { label: "Sonic 3", value: "sonic-3" },
];

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

export function CartesiaTestClient({ configured }: { configured: boolean }) {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [message, setMessage] = useState<string | null>(configured ? null : "Set CARTESIA_API_KEY before running a sample.");
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [modelId, setModelId] = useState("sonic-2");
  const [voiceId, setVoiceId] = useState(voiceOptions[0].value);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [upstreamMs, setUpstreamMs] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logIdRef = useRef(0);

  function addLog(nextMessage: string) {
    const id = ++logIdRef.current;
    setLogs((current) => [{ id, time: nowLabel(), message: nextMessage }, ...current].slice(0, 20));
  }

  async function runTest() {
    if (!configured) {
      setStatus("error");
      setMessage("CARTESIA_API_KEY is not configured on the server.");
      return;
    }

    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript) {
      setStatus("error");
      setMessage("Enter a test phrase first.");
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setStatus("loading");
    setMessage(null);
    setElapsedMs(null);
    setUpstreamMs(null);
    addLog(`Starting ${modelId} sample.`);
    const startedAt = performance.now();

    try {
      const response = await fetch("/api/cartesia-test/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: trimmedTranscript, modelId, voiceId }),
      });
      const nextElapsedMs = Math.round(performance.now() - startedAt);

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Cartesia sample failed.");
      }

      const blob = await response.blob();
      const nextAudioUrl = URL.createObjectURL(blob);
      const nextUpstreamMs = Number(response.headers.get("x-cartesia-upstream-ms"));

      setAudioUrl(nextAudioUrl);
      setElapsedMs(nextElapsedMs);
      setUpstreamMs(Number.isFinite(nextUpstreamMs) ? nextUpstreamMs : null);
      setStatus("ready");
      addLog(`Audio ready in ${nextElapsedMs}ms${Number.isFinite(nextUpstreamMs) ? `, provider ${nextUpstreamMs}ms` : ""}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Cartesia sample failed.");
      addLog(error instanceof Error ? error.message : "Cartesia sample failed.");
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandButtonBlue">tts smoke test</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Generate a Cartesia sample</h2>
          </div>
          <span className={["rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", configured ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"].join(" ")}>
            {configured ? "configured" : "missing key"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SelectControl label="Model" value={modelId} options={modelOptions} onChange={setModelId} />
          <SelectControl label="Voice" value={voiceId} options={voiceOptions} onChange={setVoiceId} />
        </div>

        <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
          Test phrase
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 font-normal leading-7 text-ink outline-none focus:border-brandPink"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runTest}
            disabled={status === "loading"}
            className="rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brandBlue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Generating..." : "Generate sample"}
          </button>
          {elapsedMs !== null ? <span className="text-sm font-semibold text-slate-600">Round trip: {elapsedMs}ms</span> : null}
          {upstreamMs !== null ? <span className="text-sm font-semibold text-slate-600">Cartesia: {upstreamMs}ms</span> : null}
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">{message}</p> : null}

        {audioUrl ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-bold text-ink">Latest sample</p>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        ) : null}
      </div>

      <aside className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">test notes</p>
        <h2 className="mt-2 text-xl font-bold text-ink">What to listen for</h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
          <li>First-audio speed compared with ElevenLabs Flash.</li>
          <li>Warmth and patience for older adult calls.</li>
          <li>Whether the opener sounds clear over phone-quality audio.</li>
          <li>Any artifacts on names, pauses, or gentle phrasing.</li>
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
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No samples generated yet.</p>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
