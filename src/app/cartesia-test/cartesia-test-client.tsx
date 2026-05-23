"use client";

import { useRef, useState } from "react";

import { TestCallButtons } from "@/app/components/test-call-buttons";

type TestStatus = "idle" | "loading" | "ready" | "error";

type LogLine = {
  id: number;
  time: string;
  message: string;
};

const defaultTranscript =
  "Hi there, this is DailyCall with your quick check-in. I am here if anything is on your mind, or if you would just like a short chat. How are you doing today?";

const voiceOptions = [
  { name: "Sarah - Mindful Woman", description: "(soothing female)", value: "694f9389-aac1-45b6-b726-9d9369183238" },
  { name: "Katie - Friendly Fixer", description: "(clear female)", value: "f786b574-daa5-4673-aa0c-cbe3e8534c02" },
  { name: "Jacqueline - Reassuring Agent", description: "(empathetic female)", value: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc" },
  { name: "Caroline - Southern Guide", description: "(slow friendly female)", value: "f9836c6e-a0bd-460e-9d3c-f7299fa60f94" },
  { name: "Skylar - Friendly Guide", description: "(customer care female)", value: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4" },
  { name: "Greg - Supporter", description: "(deep male)", value: "a0e99841-438c-4a64-b679-ae501e7d6091" },
  { name: "Rupert - Caring Dad", description: "(warm mature male)", value: "0ad65e7f-006c-47cf-bd31-52279d487913" },
];

const modelOptions = [
  { label: "Sonic 3.5", value: "sonic-3.5" },
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

function VoiceControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = voiceOptions.find((option) => option.value === value) ?? voiceOptions[0];

  return (
    <div className="grid gap-2 text-sm font-semibold text-slate-700">
      Voice
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left font-normal text-ink outline-none focus:border-brandPink"
        >
          <span className="min-w-0">
            <span className="block truncate">{selectedOption.name}</span>
            <span className="block truncate text-slate-500">{selectedOption.description}</span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-ink">
            <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>

        {isOpen ? (
          <div
            role="listbox"
            aria-label="Voice"
            className="absolute left-0 right-0 z-[80] mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl"
          >
            {voiceOptions.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition",
                    selected ? "bg-brandPink/10 text-ink" : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{option.name}</span>
                    <span className="block font-normal text-slate-500">{option.description}</span>
                  </span>
                  <span className={["h-4 w-4 shrink-0 rounded-full border", selected ? "border-brandPink bg-brandPink" : "border-slate-300"].join(" ")} />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CartesiaTestClient({ configured, callConfigured }: { configured: boolean; callConfigured: boolean }) {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [message, setMessage] = useState<string | null>(configured ? null : "Set CARTESIA_API_KEY before running a sample.");
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [modelId, setModelId] = useState("sonic-3.5");
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
          <VoiceControl value={voiceId} onChange={setVoiceId} />
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

        <div className="mt-5">
          <button
            type="button"
            onClick={runTest}
            disabled={status === "loading"}
            className="rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brandBlue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Generating..." : "Generate sample"}
          </button>
          {elapsedMs !== null || upstreamMs !== null ? (
            <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
              {elapsedMs !== null ? <span>Round trip: {elapsedMs}ms</span> : null}
              {upstreamMs !== null ? <span>Cartesia: {upstreamMs}ms</span> : null}
            </div>
          ) : null}
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">{message}</p> : null}

        {audioUrl ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-bold text-ink">Latest sample</p>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <TestCallButtons
            endpoint="/api/cartesia-test/call"
            caregiverName="DailyCall Cartesia test reviewer"
            disabled={!callConfigured}
            onLog={addLog}
            buildPayload={(target) => ({
              transcript: `Hi ${target.label}, this is DailyCall with your quick check-in. I am here if anything is on your mind, or if you would just like a short chat. How are you doing today?`,
              modelId,
              voiceId,
            })}
          />
          <p className="mt-3 text-xs leading-5 text-slate-600">
            Starts a live phone test so you can talk with an OpenAI text loop speaking through the selected Cartesia voice. This does not change dashboard calls.
          </p>
          {!callConfigured ? <p className="mt-3 text-sm font-semibold text-red-700">Set Cartesia and Twilio credentials before running a test call.</p> : null}
        </div>
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
