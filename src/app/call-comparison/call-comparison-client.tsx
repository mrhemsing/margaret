"use client";

import { TestCallButtons, type TestCallTarget } from "@/app/components/test-call-buttons";
import { defaultVoiceId } from "@/lib/voice/voice-options";

const comparisonIntroTemplate =
  "Hi {name}, this is DailyCall with your quick check-in. I am here if anything is on your mind, or if you would just like a short chat. How are you doing today?";

const comparisonRows = [
  {
    title: "ElevenLabs Conversational AI",
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
    title: "ElevenLabs streaming bridge",
    badge: "Custom Bridge",
    subtitle: "Custom bridge matching the Cartesia architecture.",
    stack: "Twilio Media Stream, OpenAI transcription/text, ElevenLabs Flash v2.5",
    endpoint: "/api/bridge-test/call",
    caregiverName: "DailyCall ElevenLabs bridge comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "OpenAI Realtime SIP",
    badge: "Direct SIP",
    subtitle: "Single-provider realtime voice path.",
    stack: "Twilio SIP, gpt-realtime-2, gpt-realtime-whisper, Marin voice",
    endpoint: "/api/openai/realtime-test-call",
    caregiverName: "DailyCall OpenAI Realtime comparison reviewer",
    buildPayload: (target: TestCallTarget) => ({
      firstMessage: buildIntro(target.label),
    }),
  },
  {
    title: "OpenAI Realtime bridge",
    badge: "Custom Bridge",
    subtitle: "Custom Twilio Media Stream bridge for apples-to-apples bridge testing.",
    stack: "Twilio Media Stream, gpt-realtime-2 speech-to-speech, Marin voice",
    endpoint: "/api/openai-realtime-bridge/call",
    caregiverName: "DailyCall OpenAI Realtime bridge comparison reviewer",
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
] as const;

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

            <TestCallButtons endpoint={row.endpoint} caregiverName={row.caregiverName} buildPayload={row.buildPayload} />
          </article>
        ))}
      </div>
    </section>
  );
}
