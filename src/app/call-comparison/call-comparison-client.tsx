"use client";

import { TestCallButtons, type TestCallTarget } from "@/app/components/test-call-buttons";
import { defaultVoiceId } from "@/lib/voice/voice-options";

const comparisonIntroTemplate =
  "Hi {name}, it is DailyCall. How are you doing today?";

const comparisonRows = [
  {
    title: "ElevenLabs Flash v2.5 bridge",
    badge: "Custom Bridge",
    production: false,
    subtitle: "Latest low-latency ElevenLabs Flash TTS lane available to our comparison stack.",
    stack: "Twilio Media Stream, OpenAI realtime STT, OpenAI text, ElevenLabs TTS model eleven_flash_v2_5",
    bestPractice: "Use as the fast TTS bridge baseline: measure first audio, barge-in recovery, and whether the chained STT -> text -> TTS loop feels less caring than native speech-to-speech.",
    observability: "Capture Twilio CallSid, media stream start/stop, transcript deltas, OpenAI response timing, ElevenLabs synthesis timing, hangup reason, and summary handoff.",
    endpoint: "/api/bridge-test/call",
    caregiverName: "DailyCall ElevenLabs Flash v2.5 comparison reviewer",
    modelLabel: "eleven_flash_v2_5",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "ElevenLabs V3 Conversational (no snapshot)",
    badge: "Native Agent",
    production: true,
    subtitle: "Current production DailyCall lane, optimized for fast connection with no weather/news/sports snapshot.",
    stack: "Twilio, ElevenLabs native Agent, ElevenLabs ASR/turn-taking, TTS model eleven_v3_conversational, LLM gemini-3.5-flash",
    bestPractice: "Keep this as the production comfort baseline: judge warmth, expressive voice quality, interruption handling, senior patience, and whether agent settings stay easy to operate.",
    observability: "Capture Twilio CallSid, ElevenLabs conversation ID, transcript text-only availability, agent version, turn timing, disconnect details, hangup reason, and summary handoff.",
    endpoint: "/api/elevenlabs-test/call",
    caregiverName: "DailyCall ElevenLabs V3 comparison reviewer",
    modelLabel: "eleven_v3_conversational + gemini-3.5-flash",
    buildPayload: (target: TestCallTarget) => ({
      preferredVoiceId: defaultVoiceId,
      firstMessage: buildIntro(target.label),
      currentContextMode: "none",
    }),
  },
  {
    title: "ElevenLabs V3 Conversational (with snapshot)",
    badge: "Native Agent",
    production: false,
    subtitle: "Same current ElevenLabs/Gemini lane, but preloads weather, light news, and NHL context for this test call.",
    stack: "Twilio, ElevenLabs native Agent, ElevenLabs ASR/turn-taking, TTS model eleven_v3_conversational, LLM gemini-3.5-flash, pre-call current-context snapshot",
    bestPractice: "Use only for A/B testing: compare connection lag against whether current-event follow-ups improve enough to justify any delay.",
    observability: "Capture request-to-ring delay, Twilio CallSid, ElevenLabs conversation ID, whether current facts are used correctly, turn timing, disconnect details, and summary handoff.",
    endpoint: "/api/elevenlabs-test/call",
    caregiverName: "DailyCall ElevenLabs V3 snapshot comparison reviewer",
    modelLabel: "eleven_v3_conversational + gemini-3.5-flash + current-context snapshot",
    buildPayload: (target: TestCallTarget) => ({
      preferredVoiceId: defaultVoiceId,
      firstMessage: buildIntro(target.label),
      currentContextMode: "snapshot",
    }),
  },
  {
    title: "OpenAI Realtime SIP",
    badge: "Controlled SIP",
    production: false,
    subtitle: "Latest OpenAI speech-to-speech Realtime lane for patient senior calls and direct transcript events.",
    stack: "Twilio SIP, gpt-realtime primary lane, gpt-realtime-2 A/B lane, low reasoning, gpt-4o-transcribe-latest or gpt-4o-transcribe, optional gpt-realtime-whisper comparison, semantic VAD, Marin voice",
    bestPractice: "Run a 20-call A/B against the production lane before promotion. Start with low reasoning, semantic VAD, short caring replies, warm AI disclosure, and a fixed opener.",
    observability: "Capture SIP IDs, Twilio CallSid, OpenAI call/session ID, VAD events, transcript deltas, tool calls, response starts/stops, interruptions, hangup reason, escalation outcome, and summary handoff.",
    endpoint: "/api/openai/realtime-test-call",
    caregiverName: "DailyCall OpenAI Realtime comparison reviewer",
    modelLabel: "gpt-realtime / gpt-realtime-2 + gpt-4o-transcribe-latest",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "Gemini Live native audio",
    badge: "Custom Bridge",
    production: false,
    subtitle: "Recommended Gemini native-audio lane for model-agnostic comparison.",
    stack: "Twilio Media Stream, Gemini Live model gemini-2.5-flash-native-audio-preview-12-2025",
    bestPractice: "Use as the model-diversity check: compare natural turn-taking, long-call stability, and how well native audio handles senior pauses and corrections.",
    observability: "Capture Twilio CallSid, media stream lifecycle, Gemini session ID if available, transcript/checkpoint events, interruption timing, hangup reason, and summary handoff.",
    endpoint: "/api/gemini-live-bridge/call",
    caregiverName: "DailyCall Gemini Live comparison reviewer",
    modelLabel: "gemini-2.5-flash-native-audio-preview-12-2025",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "Cartesia low-latency bridge",
    badge: "Custom Bridge",
    production: false,
    subtitle: "Best Cartesia voice path for low-latency bridge testing.",
    stack: "Twilio Media Stream, OpenAI transcription/text, Cartesia TTS model sonic-3.5",
    bestPractice: "Use as the low-latency voice-quality bridge: score audio realism, phone-band clarity, response pacing, and whether the text loop loses emotional nuance.",
    observability: "Capture Twilio CallSid, media stream lifecycle, transcription timing, OpenAI response timing, Cartesia synthesis timing, hangup reason, and summary handoff.",
    endpoint: "/api/cartesia-test/call",
    caregiverName: "DailyCall Cartesia comparison reviewer",
    modelLabel: "sonic-3.5",
    buildPayload: (target: TestCallTarget) => ({
      transcript: buildIntro(target.label),
      modelId: "sonic-3.5",
      voiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    }),
  },
  {
    title: "Deepgram + Cartesia bridge",
    badge: "Custom Bridge",
    production: false,
    subtitle: "Production telephony pipeline candidate with dedicated voice-agent STT.",
    stack: "Twilio Media Stream, Deepgram STT model flux-general-en, OpenAI text, Cartesia TTS model sonic-3.5",
    bestPractice: "Use as the best custom bridge candidate: score live transcription under background TV/noise, correction handling, and whether STT confidence supports safety notes.",
    observability: "Capture Twilio CallSid, Deepgram stream/session ID, interim/final transcript deltas, OpenAI response timing, Cartesia synthesis timing, hangup reason, and escalation outcome.",
    endpoint: "/api/deepgram-cartesia-bridge/call",
    caregiverName: "DailyCall Deepgram Cartesia comparison reviewer",
    modelLabel: "flux-general-en + sonic-3.5",
    buildPayload: (target: TestCallTarget) => ({
      transcript: buildIntro(target.label),
      modelId: "sonic-3.5",
      voiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    }),
  },
  {
    title: "Cartesia Line agent",
    badge: "Native Agent",
    production: false,
    subtitle: "Cartesia's native agent path for comparison against the custom Sonic bridge.",
    stack: "Cartesia Agents API 2026-03-01, configured Cartesia Line agent",
    bestPractice: "Use to decide whether Cartesia's hosted agent can beat the custom Sonic bridge on operational simplicity without losing DailyCall memory and safety control.",
    observability: "Capture Twilio CallSid if present, Cartesia agent/conversation ID, transcript availability, turn timing, hangup reason, and summary handoff.",
    endpoint: "/api/cartesia-agent-test/call",
    caregiverName: "DailyCall Cartesia native agent comparison reviewer",
    modelLabel: "configured Cartesia Line agent",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "Hume EVI",
    badge: "Native Agent",
    production: false,
    subtitle: "Hume's hosted empathic voice interface over Twilio.",
    stack: "Twilio, Hume EVI 3, configured EVI voice",
    bestPractice: "Use as the empathic benchmark: score emotional attunement on loneliness, sadness, and ambiguous distress before judging raw latency.",
    observability: "Capture Twilio CallSid, Hume chat/session ID, transcript/emotion signals if available, turn timing, hangup reason, escalation outcome, and summary handoff.",
    endpoint: "/api/hume-evi-test/call",
    caregiverName: "DailyCall Hume EVI comparison reviewer",
    modelLabel: "Hume EVI 3",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
] as const;

const latestRealtimeChecks = [
  "Run 20-call A/B tests: OpenAI Realtime against the current production lane with the same opener, target, and senior scenarios.",
  "Compare gpt-realtime and gpt-realtime-2 separately before changing default traffic.",
  "Use gpt-4o-transcribe-latest or gpt-4o-transcribe for transcript-driven safety notes; keep gpt-realtime-whisper as a comparison lane if enabled.",
  "Evaluate GPT-Realtime-Translate for multilingual families before adding it to production call flows.",
  "Compare ElevenLabs Flash v2.5 and V3 Conversational separately before judging the native ElevenLabs lane.",
  "Use low reasoning for normal check-ins; reserve medium/high for harder safety or caregiver workflows.",
  "Score VAD on long pauses, soft speech, corrections, background TV, and false 'are you still there?' moments.",
  "Verify the spoken AI disclosure feels warm but clear.",
  "Record latency, first-audio time, interruption rate, summary accuracy, escalation correctness, and caller comfort.",
];

const callTraceChecks = [
  "Twilio CallSid plus SIP/call/session IDs from the voice provider.",
  "VAD events, transcript deltas, response start/stop timing, interruption events, and tool calls.",
  "Hangup reason, failed-call reason, voicemail/AMD result, escalation outcome, and final summary handoff.",
  "Privacy-safe retention: redact sensitive notes where possible and keep raw traces limited to test calls.",
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
  const productionRow = comparisonRows.find((row) => row.production);

  return (
    <section className="grid gap-5">
      {productionRow ? (
        <div className="rounded-[2rem] bg-brandButtonBlue p-6 text-white shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">current production</p>
          <h2 className="mt-2 text-2xl font-bold">{productionRow.title}</h2>
          <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-white/90">
            {productionRow.stack}
          </p>
        </div>
      ) : null}

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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">call trace requirements</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Minimum observability for test calls</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            {callTraceChecks.map((check) => (
              <li key={check} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                {check}
              </li>
            ))}
          </ul>
        </section>
      </div>

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

      <div className="grid gap-5 lg:grid-cols-2">
        {comparisonRows.map((row) => (
          <article
            key={row.title}
            className={`grid content-between gap-5 rounded-[2rem] p-6 shadow-sm ${
              row.production
                ? "bg-brandButtonBlue/10 ring-2 ring-brandButtonBlue"
                : "bg-white/85 ring-1 ring-black/5"
            }`}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">comparison lane</p>
                {row.production ? (
                  <span className="rounded-full bg-brandButtonBlue px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                    Current production
                  </span>
                ) : null}
                <span className="rounded-full bg-brandButtonBlue/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brandButtonBlue">
                  {row.badge}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-ink">{row.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{row.subtitle}</p>
              <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-200">
                {row.stack}
              </p>
              <p className="mt-2 rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-ink ring-1 ring-slate-200">
                Model: {row.modelLabel}
              </p>
              <p className="mt-2 rounded-2xl bg-sage/10 p-3 text-xs font-semibold leading-5 text-slate-700 ring-1 ring-sage/25">
                Best practice: {row.bestPractice}
              </p>
              <p className="mt-2 rounded-2xl bg-white p-3 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-200">
                Trace: {row.observability}
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
