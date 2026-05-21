import type { Prisma } from "@prisma/client";

import { getServerEnv } from "@/lib/env";
import { buildOpenAIRealtimeInstructions } from "@/lib/voice/openai-realtime";

export type HybridTranscriptTurn = {
  speaker: "DailyCall" | string;
  text: string;
};

type GenerateHybridReplyInput = {
  memberName: string;
  caregiverName: string;
  companionContext: string;
  currentContext: string;
  recentTopics: string[];
  topicsToRevisit: string[];
  avoidRepeating: string[];
  transcript: HybridTranscriptTurn[];
};

type OpenAIResponsesPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

export function formatHybridTranscript(turns: HybridTranscriptTurn[]) {
  return turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n\n");
}

export function getHybridTranscript(raw: Prisma.JsonValue | null | undefined): HybridTranscriptTurn[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const turns = (raw as Record<string, unknown>).hybridTranscript;
  if (!Array.isArray(turns)) return [];

  return turns
    .map((turn) => {
      if (!turn || typeof turn !== "object") return null;
      const record = turn as Record<string, unknown>;
      const speaker = typeof record.speaker === "string" && record.speaker.trim() ? record.speaker.trim() : null;
      const text = typeof record.text === "string" && record.text.trim() ? record.text.trim() : null;
      return speaker && text ? { speaker, text } : null;
    })
    .filter((turn): turn is HybridTranscriptTurn => Boolean(turn));
}

function extractResponseText(payload: OpenAIResponsesPayload) {
  if (payload.output_text?.trim()) return payload.output_text.trim();

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .find((text) => text?.trim())
      ?.trim() ?? null
  );
}

export async function generateHybridOpenAIReply(input: GenerateHybridReplyInput) {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const instructions = [
    buildOpenAIRealtimeInstructions(input),
    "This call is using a text-to-speech bridge. Return only the exact words DailyCall should say next.",
    "No markdown, labels, stage directions, bullet points, emojis, or SSML.",
    "Keep the reply short enough for phone playback: one natural sentence, or two only when necessary.",
  ].join("\n\n");

  const transcript = input.transcript.length
    ? formatHybridTranscript(input.transcript.slice(-10))
    : "No conversation yet. Start with a brief, soft, caring greeting and ask how they are doing today.";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "dailycall-openai-elevenlabs-hybrid",
    },
    body: JSON.stringify({
      model: env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
      instructions,
      input: transcript,
      max_output_tokens: 90,
      store: false,
    }),
  });

  const payload = (await response.json().catch(() => null)) as OpenAIResponsesPayload | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI hybrid text response failed with status ${response.status}`);
  }

  const text = payload ? extractResponseText(payload) : null;

  if (!text) {
    throw new Error("OpenAI hybrid text response did not include speech text.");
  }

  return text.replace(/\s+/g, " ").trim();
}

export async function synthesizeElevenLabsSpeech(input: { text: string; voiceId: string }) {
  const env = getServerEnv();

  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_64&optimize_streaming_latency=4`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: input.text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.82,
          speed: 1,
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `ElevenLabs speech synthesis failed with status ${response.status}`);
  }

  return response;
}
