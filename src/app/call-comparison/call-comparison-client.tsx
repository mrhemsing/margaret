"use client";

import { TestCallButtons, type TestCallTarget } from "@/app/components/test-call-buttons";
import { defaultVoiceId, evaluationElevenLabsTtsModel, productionElevenLabsTtsModel } from "@/lib/voice/voice-options";

const comparisonIntroTemplate =
  "Hi {name}, it is DailyCall. How are you doing today?";

const technologySnapshot = [
  {
    label: "OpenAI Realtime",
    value: "GPT-Realtime-2",
    detail: "128K context, adjustable reasoning effort, stronger interruption recovery, preambles, parallel tools, SIP, live translation, and streaming STT.",
  },
  {
    label: "OpenAI pricing",
    value: "$32 in / $64 out",
    detail: "Audio tokens per 1M for GPT-Realtime-2. GPT-Realtime-Translate is $0.034/min; GPT-Realtime-Whisper is $0.017/min.",
  },
  {
    label: "Google Gemini Live",
    value: "Native audio",
    detail: "Low-latency voice and vision with barge-in, tools, transcripts, proactive audio, affective dialog, and live translation.",
  },
  {
    label: "ElevenLabs",
    value: "Operational baseline",
    detail: "Keep production comparisons centered on Conversational AI plus Twilio while watching SIP logs, trunking, analytics, RAG chunks, and agent controls.",
  },
] as const;

const marketCompetitors = [
  {
    name: "JoyCalls",
    category: "Direct phone companion",
    offer: "Nationwide AI phone companion from ONSCREEN with daily or weekly check-ins, reminders, games, summaries, alerts, and caregiver web-app insights.",
    pricing: "$9.99/$19.99/$29.99 per month with a 7-day trial; Premium includes up to five active scheduled calls and 180 minutes/month.",
    watch: "Strongest direct benchmark for public launch clarity, plan ladder, and family peace-of-mind copy.",
    source: "JoyCalls / ONSCREEN, refreshed Jun 18, 2026",
  },
  {
    name: "AloneAssist",
    category: "Direct phone check-in",
    offer: "Daily wellness call plus shared family dashboard, care circle, SMS/email summaries, and escalation rules.",
    pricing: "Plans from $9.99/mo; public launch coverage also cites $14.99/mo or $120/year with 14-day no-card trial.",
    watch: "New low-price, family-dashboard competitor. Pressure point: DailyCall must feel warmer and more complete.",
    source: "AloneAssist, refreshed Jun 18, 2026",
  },
  {
    name: "CareCall",
    category: "Daily safety check-in",
    offer: "Automated daily check-in calls, friendly conversations, care-circle notifications, reminders, local info, and multilingual support.",
    pricing: "$20/mo after a 14-day no-card trial.",
    watch: "Most safety/check-in oriented. DailyCall should beat it on warmth, memory, and caregiver trust.",
    source: "CareCall, refreshed Jun 18, 2026",
  },
  {
    name: "ElderVoice",
    category: "Direct phone companion",
    offer: "AI companion calls and check-ins with weekly summaries, reminders, and transparent consumer plans.",
    pricing: "$19/mo weekly check-in plan; 7-day free trial; no contracts.",
    watch: "Clear pricing and setup copy. Use as the benchmark for explaining missed calls and family summaries.",
    source: "ElderVoice, refreshed Jun 18, 2026",
  },
  {
    name: "inTouch Family",
    category: "Direct family companion",
    offer: "Daily AI phone conversations, 24/7 availability, family insights, mood/engagement signals, and story/legacy positioning.",
    pricing: "Public coverage still points to about $29.90/mo.",
    watch: "Strong emotional buyer framing. DailyCall needs equal warmth without sounding like outsourced family contact.",
    source: "inTouch Family, refreshed Jun 18, 2026",
  },
  {
    name: "Meela",
    category: "Phone companion / care teams",
    offer: "Phone-based AI companion for older adults with no app or hardware, scheduled or on-demand conversation, memory, and caregiver insights.",
    pricing: "Pricing not clearly public; current positioning leans care organizations plus family trust.",
    watch: "Best FAQ/privacy benchmark. Match its clarity on consent, limits, and what families do or do not see.",
    source: "Meela, refreshed Jun 18, 2026",
  },
  {
    name: "SeniorTalk",
    category: "Multichannel companion",
    offer: "Phone, smart-speaker beta, SMS, WhatsApp, and Messenger companions with persona choice and multilingual support.",
    pricing: "$14.90/mo for messengers; $24.90/mo for calls + SMS with 180 voice minutes; 30-day trial.",
    watch: "Good persona and multichannel pressure, but less purely family-check-in focused than DailyCall.",
    source: "SeniorTalk, refreshed Jun 18, 2026",
  },
  {
    name: "Ato",
    category: "Hardware companion",
    offer: "Screen-free voice-first AI companion device with family app, cognitive engagement, connection, and worldwide shipping.",
    pricing: "$179 device, shown against $200, plus 1-month free membership then $29/mo.",
    watch: "Hardware makes it a different buying motion. DailyCall should win on no device, fast setup, and any phone.",
    source: "Ato, refreshed Jun 18, 2026",
  },
] as const;

const comparisonRows = [
  {
    title: "ElevenLabs Flash v2.5 bridge",
    badge: "Custom Bridge",
    production: false,
    subtitle: "Low-latency ElevenLabs Flash TTS lane for checking whether a chained bridge can beat native agents on speed.",
    stack: `Twilio Media Stream, OpenAI realtime STT or gpt-4o-transcribe-latest, OpenAI text, ElevenLabs TTS model ${productionElevenLabsTtsModel}`,
    bestPractice: "Use as the fast TTS bridge baseline: measure first audio, barge-in recovery, phone-band clarity, and whether the chained STT -> text -> TTS loop loses emotional nuance.",
    observability: "Capture Twilio CallSid, media stream start/stop, transcript deltas, OpenAI response timing, ElevenLabs synthesis timing, hangup reason, and summary handoff.",
    endpoint: "/api/bridge-test/call",
    caregiverName: "DailyCall ElevenLabs Flash v2.5 comparison reviewer",
    modelLabel: productionElevenLabsTtsModel,
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "ElevenLabs production agent (no snapshot)",
    badge: "Native Agent",
    production: true,
    subtitle: "Current production DailyCall lane, optimized for fast connection with no weather/news/sports snapshot.",
    stack: `Twilio, ElevenLabs Conversational AI, ElevenLabs ASR/turn-taking, TTS model ${productionElevenLabsTtsModel}, LLM gemini-3.5-flash`,
    bestPractice: "Keep this as the production comfort baseline: judge warmth, expressive voice quality, interruption handling, senior patience, and whether agent settings remain easy to operate.",
    observability: "Capture Twilio CallSid, ElevenLabs conversation ID, transcript text-only availability, agent version, SIP/trunk logs when available, turn timing, disconnect details, hangup reason, and summary handoff.",
    endpoint: "/api/elevenlabs-test/call",
    caregiverName: "DailyCall ElevenLabs production comparison reviewer",
    modelLabel: `${productionElevenLabsTtsModel} + gemini-3.5-flash`,
    buildPayload: (target: TestCallTarget) => ({
      preferredVoiceId: defaultVoiceId,
      firstMessage: buildIntro(target.label),
      currentContextMode: "none",
    }),
  },
  {
    title: "ElevenLabs production agent (with snapshot)",
    badge: "Native Agent",
    production: false,
    subtitle: "Same current ElevenLabs/Gemini lane, but preloads weather, light news, and NHL context for this test call.",
    stack: `Twilio, ElevenLabs Conversational AI, ElevenLabs ASR/turn-taking, TTS model ${productionElevenLabsTtsModel}, LLM gemini-3.5-flash, pre-call current-context snapshot`,
    bestPractice: "Use only for A/B testing: compare connection lag against whether current-event follow-ups improve enough to justify any delay.",
    observability: "Capture request-to-ring delay, Twilio CallSid, ElevenLabs conversation ID, whether current facts are used correctly, SIP/trunk logs when available, turn timing, disconnect details, and summary handoff.",
    endpoint: "/api/elevenlabs-test/call",
    caregiverName: "DailyCall ElevenLabs production snapshot comparison reviewer",
    modelLabel: `${productionElevenLabsTtsModel} + gemini-3.5-flash + current-context snapshot`,
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
    subtitle: "Latest OpenAI speech-to-speech lane for patient senior calls, direct transcript events, tools, and production SIP testing.",
    stack: "Twilio SIP, gpt-realtime production-compatible lane, gpt-realtime-2 A/B lane, low reasoning by default, optional medium/high for harder workflows, server VAD with configurable eagerness, Marin voice",
    bestPractice: "Run a 20-call A/B against production before promotion. Start with low reasoning, server VAD, short caring replies, warm AI disclosure, and fixed senior-call scripts for interruptions, pauses, corrections, distress, and medication-adjacent refusals.",
    observability: "Capture SIP IDs, Twilio CallSid, OpenAI call/session ID, reasoning setting, VAD events, transcript deltas, preambles, tool calls, response starts/stops, interruptions, hangup reason, escalation outcome, token/minute cost, and summary handoff.",
    endpoint: "/api/openai/realtime-test-call",
    caregiverName: "DailyCall OpenAI Realtime comparison reviewer",
    modelLabel: "gpt-realtime / GPT-Realtime-2",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "Gemini Live native audio",
    badge: "Custom Bridge",
    production: false,
    subtitle: "Current Gemini native-audio lane for model-agnostic comparison against OpenAI and ElevenLabs.",
    stack: "Twilio Media Stream, Gemini Live native-audio model, WebSocket bridge, barge-in, tool use, audio transcripts, proactive audio, affective dialog, live translation",
    bestPractice: "Use as the model-diversity check: compare natural turn-taking, long-call stability, affective dialog on loneliness, live-translation potential, and how well native audio handles senior pauses and corrections.",
    observability: "Capture Twilio CallSid, media stream lifecycle, Gemini session ID if available, transcript/checkpoint events, barge-in/interruption timing, tool events, hangup reason, and summary handoff.",
    endpoint: "/api/gemini-live-bridge/call",
    caregiverName: "DailyCall Gemini Live comparison reviewer",
    modelLabel: "Gemini Live native audio",
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
  "Compare gpt-realtime and GPT-Realtime-2 separately before changing default traffic.",
  "Use Realtime voice-session transcripts for the speech-to-speech lane; test GPT-Realtime-Whisper only in transcription sessions where turn detection is omitted or null.",
  "Evaluate GPT-Realtime-Translate for multilingual families before adding translation to production call flows.",
  `Compare ElevenLabs Flash v2.5 bridge and ${evaluationElevenLabsTtsModel} separately before judging the ElevenLabs lane.`,
  "Use low reasoning for normal check-ins; reserve medium/high/xhigh for harder safety, tool, or caregiver workflows.",
  "Score VAD on long pauses, soft speech, corrections, background TV, false 'are you still there?' moments, and interruption recovery.",
  "Verify the spoken AI disclosure feels warm but clear.",
  "Record latency, first-audio time, interruption rate, summary accuracy, escalation correctness, caller comfort, and estimated cost per 10-minute call.",
];

const callTraceChecks = [
  "Twilio CallSid plus SIP/call/session IDs from the voice provider.",
  "VAD events, transcript deltas, response start/stop timing, interruption events, preambles, reasoning setting, and tool calls.",
  "Hangup reason, failed-call reason, voicemail/AMD result, escalation outcome, and final summary handoff.",
  "Privacy-safe retention: redact sensitive notes where possible and keep raw traces limited to test calls.",
];

const seniorScenarioSet = [
  "Interruption recovery",
  "Long silence before answering",
  "Repeated story",
  "Hearing-confusion repair",
  "Correction of a family name",
  "Medication-adjacent refusal",
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

      <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandButtonBlue">technology snapshot</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Latest watch items to keep in the comparison loop</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {technologySnapshot.map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-ink">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
          Last refreshed Jun 18, 2026 from OpenAI Realtime docs/release/pricing/VAD, ElevenLabs changelog, Google Gemini Live docs, Cartesia docs, and Hume docs.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandButtonBlue">market competitors</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Senior companion products to keep in view</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Use this as the positioning scoreboard. These cards do not start calls or change any production/demo voice path.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {marketCompetitors.map((competitor) => (
            <article key={competitor.name} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-ink">{competitor.name}</h3>
                <span className="rounded-full bg-brandButtonBlue/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brandButtonBlue">
                  {competitor.category}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{competitor.offer}</p>
              <p className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold leading-5 text-slate-700 ring-1 ring-slate-200">
                Pricing: {competitor.pricing}
              </p>
              <p className="mt-2 rounded-xl bg-sage/10 p-3 text-xs font-semibold leading-5 text-slate-700 ring-1 ring-sage/25">
                Watch: {competitor.watch}
              </p>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{competitor.source}</p>
            </article>
          ))}
        </div>
      </section>

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
