"use client";

import { TestCallButtons, type TestCallTarget } from "@/app/components/test-call-buttons";
import { defaultVoiceId } from "@/lib/voice/voice-options";

const comparisonIntroTemplate =
  "Hi {name}, it is DailyCall. How are you doing today?";

const comparisonRows = [
  {
    title: "ElevenLabs Conversational",
    badge: "Native Agent",
    subtitle: "Current native ElevenLabs outbound-call baseline.",
    stack: "Twilio, ElevenLabs Agent, ElevenLabs ASR/turn-taking, ElevenLabs TTS",
    endpoint: "/api/elevenlabs-test/call",
    caregiverName: "DailyCall ElevenLabs comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      preferredVoiceId: defaultVoiceId,
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "OpenAI Realtime SIP",
    badge: "Controlled SIP",
    subtitle: "Latest OpenAI Realtime candidate for patient senior calls and direct transcript events.",
    stack: "Twilio SIP, gpt-realtime-2, low reasoning, gpt-realtime-whisper, VAD tuning, Marin voice",
    endpoint: "/api/openai/realtime-test-call",
    caregiverName: "DailyCall OpenAI Realtime comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "Gemini Live native audio",
    badge: "Custom Bridge",
    subtitle: "Recommended Gemini native-audio lane for model-agnostic comparison.",
    stack: "Twilio Media Stream, Gemini 2.5 Flash Native Audio",
    endpoint: "/api/gemini-live-bridge/call",
    caregiverName: "DailyCall Gemini Live comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "Cartesia low-latency bridge",
    badge: "Custom Bridge",
    subtitle: "Best Cartesia voice path for low-latency bridge testing.",
    stack: "Twilio Media Stream, OpenAI transcription/text, Cartesia Sonic 3.5",
    endpoint: "/api/cartesia-test/call",
    caregiverName: "DailyCall Cartesia comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      transcript: buildIntro(target.label),
      modelId: "sonic-3.5",
      voiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    }),
  },
  {
    title: "Deepgram + Cartesia bridge",
    badge: "Custom Bridge",
    subtitle: "Production telephony pipeline candidate with dedicated voice-agent STT.",
    stack: "Twilio Media Stream, Deepgram Flux, OpenAI text, Cartesia Sonic 3.5",
    endpoint: "/api/deepgram-cartesia-bridge/call",
    caregiverName: "DailyCall Deepgram Cartesia comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      transcript: buildIntro(target.label),
      modelId: "sonic-3.5",
      voiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    }),
  },
  {
    title: "Cartesia Line agent",
    badge: "Native Agent",
    subtitle: "Cartesia's native agent path for comparison against the custom Sonic bridge.",
    stack: "Twilio, Cartesia Line agent",
    endpoint: "/api/cartesia-agent-test/call",
    caregiverName: "DailyCall Cartesia native agent comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "Hume EVI",
    badge: "Native Agent",
    subtitle: "Hume's hosted empathic voice interface over Twilio.",
    stack: "Twilio, Hume EVI 3, Ava Song voice",
    endpoint: "/api/hume-evi-test/call",
    caregiverName: "DailyCall Hume EVI comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
] as const;

const latestRealtimeChecks = [
  "A/B OpenAI Realtime against the current strongest baseline with the same opener and phone target.",
  "Use low reasoning for normal check-ins; reserve medium/high for harder safety or caregiver workflows.",
  "Track live transcript quality from gpt-realtime-whisper before trusting summaries or safety triggers.",
  "Score VAD on long pauses, soft speech, corrections, background TV, and false 'are you still there?' moments.",
  "Verify the spoken AI disclosure feels warm but clear.",
  "Record latency, interruption rate, summary accuracy, escalation correctness, and caller comfort.",
];

const seniorScenarioSet = [
  "Long pause before answering",
  "Correction of a family name",
  "Medication mention",
  "Loneliness or sadness",
  "Background TV/noise",
  "Emergency ambiguity",
];

function buildIntro(name: string) {
  return comparisonIntroTemplate.replace("{name}", name);
}

export function CallComparisonClient() {
  return (
    <section className="grid gap-5">
      <div className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandButtonBlue">shared opener</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Same first line for every test</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          {comparisonIntroTemplate.replace("{name}", "Matt")}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandButtonBlue">latest realtime test plan</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">What to score on every comparison call</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            {latestRealtimeChecks.map((check) => (
              <li key={check} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                {check}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">senior-call scenarios</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Use these before promoting a voice lane</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {seniorScenarioSet.map((scenario) => (
              <p key={scenario} className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-5 text-slate-600 ring-1 ring-slate-200">
                {scenario}
              </p>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The OpenAI lane should only move forward if it beats the current baseline on natural pacing, transcript reliability, and caregiver-safe summaries.
          </p>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {comparisonRows.map((row) => (
          <article key={row.title} className="grid content-between gap-5 rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">comparison lane</p>
                <span className="rounded-full bg-brandButtonBlue/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brandButtonBlue">
                  {row.badge}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-ink">{row.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{row.subtitle}</p>
              <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-200">
                {row.stack}
              </p>
            </div>

            <TestCallButtons
              endpoint={row.endpoint}
              caregiverName={row.caregiverName}
              buildPayload={row.buildPayload}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
