"use client";

import { useMemo, useRef, useState } from "react";

import { TestCallButtons } from "@/app/components/test-call-buttons";

type Status = "idle" | "connecting" | "connected" | "stopping" | "error";

type LogLine = {
  id: number;
  time: string;
  message: string;
};

type RealtimeClientSecretResponse = {
  value?: string;
  client_secret?: {
    value?: string;
  };
};

type SelectOption = {
  value: string;
  label: string;
};

type PacingProfile = "snappy" | "balanced" | "thoughtful";

const defaultInstructions = `# Role and Objective
You are DailyCall, a warm senior companion voice agent. This is a controlled browser test for evaluating OpenAI Realtime as a possible DailyCall voice backend.

# Personality and Tone
Sound soft, caring, understanding, and human. Use a warm companion tone suited for an older adult: gentle, familiar, unhurried in delivery, but quick to respond. Keep responses short, usually one sentence and no more than two. Avoid sounding like a customer support bot.

# Conversation Behavior
Use the snappiest natural turn-taking possible. Respond as soon as the person is done speaking; do not wait for extra silence. Do not add thinking filler, repeated acknowledgements, or long lead-ins. Ask one gentle question at a time. Leave room for the person to answer. If the person sounds confused, slow down your wording but keep the response prompt.

# DailyCall Context
DailyCall makes friendly daily check-in calls to older adults and sends families a concise wellbeing summary. In this test, focus on natural companionship, turn-taking, low dead air, and senior-friendly pacing.

# Safety
Do not diagnose, provide medical instructions, or make emergency decisions. If the user describes immediate danger or a medical emergency, calmly tell them to call emergency services or contact a trusted person right away.

# Preambles
Avoid filler, verbal hesitations, and "let me think" phrases. Start with the answer or the next warm question.`;

function nowLabel() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function extractEventSummary(event: unknown) {
  if (!event || typeof event !== "object") return "Received event";

  const record = event as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "event";

  if (type === "response.audio_transcript.delta" && typeof record.delta === "string") {
    return `assistant transcript: ${record.delta}`;
  }

  if (type === "conversation.item.input_audio_transcription.completed" && typeof record.transcript === "string") {
    return `user transcript: ${record.transcript}`;
  }

  if (type === "response.done") return "assistant response complete";
  if (type === "input_audio_buffer.speech_started") return "user speech started";
  if (type === "input_audio_buffer.speech_stopped") return "user speech stopped";
  if (type === "error") return `error: ${JSON.stringify(record.error ?? record)}`;

  return type;
}

function getClientSecret(data: RealtimeClientSecretResponse) {
  return data.value ?? data.client_secret?.value ?? "";
}

function pacingInstructions(profile: PacingProfile) {
  if (profile === "snappy") {
    return "Favor the fastest natural turn-taking. Start speaking as soon as the user stops; do not wait for extra silence. Keep replies to one short, caring sentence unless safety or clarity requires more.";
  }

  if (profile === "thoughtful") {
    return "Favor careful understanding over speed. It is okay to take a little longer when the user asks a complex question, but avoid unnecessary filler.";
  }

  return "Balance fast turn-taking with enough thoughtfulness to answer clearly. Keep replies concise and conversational.";
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
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

export function RealtimeTestClient() {
  const [status, setStatus] = useState<Status>("idle");
  const [voice, setVoice] = useState("marin");
  const [pacingProfile, setPacingProfile] = useState<PacingProfile>("snappy");
  const [reasoningEffort, setReasoningEffort] = useState("low");
  const [vadEagerness, setVadEagerness] = useState("low");
  const [instructions, setInstructions] = useState(defaultInstructions);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [firstAudioAt, setFirstAudioAt] = useState<number | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const firstAudioAtRef = useRef<number | null>(null);
  const logIdRef = useRef(0);

  const metrics = useMemo(() => {
    const connectMs = startedAt && connectedAt ? connectedAt - startedAt : null;
    const firstAudioMs = startedAt && firstAudioAt ? firstAudioAt - startedAt : null;
    return { connectMs, firstAudioMs };
  }, [connectedAt, firstAudioAt, startedAt]);

  function addLog(message: string) {
    const id = ++logIdRef.current;
    setLogs((current) => [{ id, time: nowLabel(), message }, ...current].slice(0, 80));
  }

  function changePacingProfile(profile: string) {
    const nextProfile = profile as PacingProfile;
    setPacingProfile(nextProfile);

    if (nextProfile === "snappy") {
      setReasoningEffort("low");
      setVadEagerness("high");
      return;
    }

    if (nextProfile === "thoughtful") {
      setReasoningEffort("medium");
      setVadEagerness("auto");
      return;
    }

    setReasoningEffort("low");
    setVadEagerness("medium");
  }

  function stopSession(nextStatus: Status = "idle") {
    setStatus((current) => (current === "idle" ? "idle" : "stopping"));

    dcRef.current?.close();
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    dcRef.current = null;
    pcRef.current = null;
    localStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setStatus(nextStatus);
    addLog("session stopped");
  }

  async function startSession() {
    if (status === "connecting" || status === "connected") return;

    setStatus("connecting");
    setStartedAt(Date.now());
    setConnectedAt(null);
    setFirstAudioAt(null);
    firstAudioAtRef.current = null;
    setLogs([]);
    addLog("requesting microphone access");

    try {
      const pc = new RTCPeerConnection();
      const dc = pc.createDataChannel("oai-events");
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream));

      pcRef.current = pc;
      dcRef.current = dc;
      localStreamRef.current = localStream;

      pc.ontrack = (event) => {
        if (!remoteAudioRef.current) return;
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => undefined);
        addLog("remote audio track received");
      };

      pc.onconnectionstatechange = () => {
        addLog(`peer connection: ${pc.connectionState}`);
        if (pc.connectionState === "connected") {
          setConnectedAt(Date.now());
          setStatus("connected");
        }
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("error");
        }
      };

      dc.onopen = () => {
        addLog("data channel open");
        dc.send(
          JSON.stringify({
            type: "session.update",
            session: {
              audio: {
                input: {
                  turn_detection: {
                    type: "semantic_vad",
                    eagerness: vadEagerness,
                    create_response: true,
                    interrupt_response: false,
                  },
                },
              },
            },
          }),
        );
        addLog(`semantic VAD set to ${vadEagerness} with model interruption disabled`);
      };

      dc.onmessage = (event) => {
        try {
          const realtimeEvent = JSON.parse(event.data) as { type?: string };

          if (realtimeEvent.type === "response.audio.delta" || realtimeEvent.type === "response.output_audio.delta") {
            if (!firstAudioAtRef.current) {
              firstAudioAtRef.current = Date.now();
              setFirstAudioAt(firstAudioAtRef.current);
              addLog("assistant audio started");
            }
            return;
          }

          addLog(extractEventSummary(realtimeEvent));
        } catch {
          addLog("received non-JSON realtime event");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const localSdp = pc.localDescription?.sdp ?? "";

      if (!localSdp.startsWith("v=0")) {
        throw new Error("Browser created an empty WebRTC offer. Please reload the page and try again.");
      }

      const tokenFormData = new FormData();
      tokenFormData.set("voice", voice);
      tokenFormData.set("reasoningEffort", reasoningEffort);
      tokenFormData.set("instructions", `${instructions}\n\n# Pacing Profile\n${pacingInstructions(pacingProfile)}`);

      addLog("creating OpenAI Realtime client secret");
      const tokenResponse = await fetch("/api/openai/realtime-test", {
        method: "POST",
        body: tokenFormData,
      });

      if (!tokenResponse.ok) {
        throw new Error(await tokenResponse.text());
      }

      const clientSecret = getClientSecret((await tokenResponse.json()) as RealtimeClientSecretResponse);

      if (!clientSecret) {
        throw new Error("OpenAI did not return a Realtime client secret.");
      }

      addLog(`creating OpenAI Realtime session (${localSdp.length} byte SDP offer)`);
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: localSdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text());
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(answer);
      addLog("session ready; speak into the microphone");
    } catch (error) {
      addLog(error instanceof Error ? error.message : "Unable to start realtime session.");
      stopSession("error");
    }
  }

  function sendGreeting() {
    if (dcRef.current?.readyState !== "open") {
      addLog("data channel is not open yet");
      return;
    }

    dcRef.current.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions: "Start the DailyCall test with a brief, soft, caring greeting and ask how the person is doing today. Keep it to one short sentence.",
        },
      }),
    );
    addLog("sent greeting request");
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="grid content-start gap-4 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink">Live browser voice test</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Uses WebRTC, your microphone, and OpenAI Realtime audio output.</p>
          </div>
          <span className="w-fit rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brandButtonBlue">{status}</span>
        </div>

        <audio ref={remoteAudioRef} autoPlay />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectControl
            label="Voice"
            value={voice}
            onChange={setVoice}
            options={[
              { value: "marin", label: "Marin - soft companion" },
              { value: "cedar", label: "Cedar - gentle caller" },
            ]}
          />
          <SelectControl
            label="Pacing"
            value={pacingProfile}
            onChange={changePacingProfile}
            options={[
              { value: "snappy", label: "Snappy" },
              { value: "balanced", label: "Balanced" },
              { value: "thoughtful", label: "Thoughtful" },
            ]}
          />
          <SelectControl
            label="Reasoning"
            value={reasoningEffort}
            onChange={setReasoningEffort}
            options={[
              { value: "minimal", label: "Minimal" },
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
          <SelectControl
            label="VAD eagerness"
            value={vadEagerness}
            onChange={setVadEagerness}
            options={[
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
              { value: "auto", label: "Auto" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startSession}
            disabled={status === "connecting" || status === "connected"}
            className="h-12 rounded-xl bg-brandButtonBlue px-5 text-sm font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start session
          </button>
          <button
            type="button"
            onClick={() => stopSession()}
            disabled={status === "idle"}
            className="h-12 rounded-xl bg-ink px-5 text-sm font-semibold text-cream shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop
          </button>
        </div>

        <button
          type="button"
          onClick={sendGreeting}
          disabled={status !== "connected"}
          className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-ink shadow-sm hover:border-brandPink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ask agent to greet first
        </button>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-bold text-ink">Phone path</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Calls through OpenAI Realtime over Twilio. Dashboard calls stay on ElevenLabs.</p>
          </div>
          <div className="mt-4">
            <TestCallButtons endpoint="/api/openai/realtime-test-call" caregiverName="DailyCall realtime test reviewer" onLog={addLog} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Connect time</p>
            <p className="mt-2 text-2xl font-bold text-ink">{metrics.connectMs === null ? "-" : `${metrics.connectMs} ms`}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">First audio</p>
            <p className="mt-2 text-2xl font-bold text-ink">{metrics.firstAudioMs === null ? "-" : `${metrics.firstAudioMs} ms`}</p>
          </div>
        </div>
      </section>

      <section className="grid content-start gap-4 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Prompt and event log</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Tune prompt, start a session, then watch VAD, transcript, and response events.</p>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Realtime instructions
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={12}
            className="min-h-72 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-5 text-ink outline-none focus:border-brandPink"
          />
        </label>

        <div className="max-h-96 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100">
          {logs.length ? (
            logs.map((line) => (
              <p key={line.id} className="border-b border-white/10 py-2 last:border-b-0">
                <span className="text-slate-400">{line.time}</span> {line.message}
              </p>
            ))
          ) : (
            <p className="text-slate-400">No events yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
