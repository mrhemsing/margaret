import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import WebSocket from "ws";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

type BuildRealtimeInstructionsInput = {
  memberName: string;
  caregiverName: string;
  companionContext: string;
  currentContext: string;
  recentTopics: string[];
  topicsToRevisit: string[];
  avoidRepeating: string[];
};

type AcceptOpenAIRealtimeCallInput = BuildRealtimeInstructionsInput & {
  callId: string;
  voice: string;
};

type OpenAIRealtimeTranscriptTurn = {
  speaker: "DailyCall" | string;
  text: string;
};

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getOpenAIRealtimeConfig() {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return {
    apiKey: env.OPENAI_API_KEY,
    projectId: env.OPENAI_PROJECT_ID,
    model: env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2",
    defaultVoice: env.OPENAI_REALTIME_VOICE ?? "marin",
    reasoningEffort: env.OPENAI_REALTIME_REASONING_EFFORT ?? "low",
    vadEagerness: env.OPENAI_REALTIME_VAD_EAGERNESS ?? "high",
  };
}

export function getVoiceProvider() {
  return getServerEnv().VOICE_PROVIDER ?? "elevenlabs_twilio";
}

export function buildOpenAIRealtimeInstructions(input: BuildRealtimeInstructionsInput) {
  const recentTopics = dedupe(input.recentTopics).join(", ") || "none yet";
  const topicsToRevisit = dedupe(input.topicsToRevisit).join("; ") || "none yet";
  const avoidRepeating = dedupe(input.avoidRepeating).join("; ") || "Do not use a generic scripted wellness survey opening.";

  return `
# Role and Objective
You are DailyCall, a warm senior companion voice agent calling ${input.memberName}. Your job is to have a natural, short daily check-in conversation and help the family understand how the person is doing.

# Personality and Tone
Sound soft, caring, understanding, and human. Use a warm companion tone suited for an older adult: gentle, familiar, unhurried in delivery, but quick to respond. You are not a clinician, salesperson, support bot, or survey script. Keep responses short, usually one sentence and no more than two.

# Turn-Taking and Pacing
Use the snappiest natural turn-taking possible. Respond as soon as the person is done speaking; do not wait for extra silence. Avoid filler, verbal hesitations, repeated acknowledgements, and long lead-ins. Ask one gentle question at a time. If the person sounds confused, slow down your wording but keep the response prompt.

# DailyCall Memory
${input.companionContext}

# Current Context
${input.currentContext}

# Conversation Guidance
Recent topics already covered: ${recentTopics}.
Topics to revisit warmly: ${topicsToRevisit}.
Avoid repeating: ${avoidRepeating}.
Open with warmth and variety. Start with a brief greeting, then ask one easy, human question. Prefer short, caring responses over long explanations. Use preloaded current context only when it feels natural or when the person asks.

# Safety
Do not diagnose, provide medical instructions, or make emergency decisions. If the person describes immediate danger, a medical emergency, or feeling unsafe, calmly tell them to call emergency services or contact ${input.caregiverName} or another trusted person right away.

# After The Call
Pay attention to mood, notable moments, topics, possible memory updates, and follow-up needs. The app will use the transcript and events to create a concise family summary.
`.trim();
}

export function buildOpenAIRealtimeSipTwiml(input: {
  callSid: string;
  callAttemptId?: string | null;
}) {
  const env = getServerEnv();
  const { projectId } = getOpenAIRealtimeConfig();

  if (!projectId) {
    throw new Error("OPENAI_PROJECT_ID is not configured.");
  }

  const sipUri = `sip:${projectId}@sip.api.openai.com;transport=tls`;
  const baseUrl = env.PUBLIC_APP_URL ?? env.APP_URL;
  const dialAction = baseUrl
    ? `${baseUrl}/api/twilio/openai-sip-dial-status?callSid=${encodeURIComponent(input.callSid)}${
        input.callAttemptId ? `&callAttemptId=${encodeURIComponent(input.callAttemptId)}` : ""
      }`
    : null;

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    `<Dial answerOnBridge="true" timeout="20"${dialAction ? ` action="${xmlEscape(dialAction)}" method="POST"` : ""}>`,
    `<Sip>${xmlEscape(sipUri)}</Sip>`,
    "</Dial>",
    "</Response>",
  ].join("");
}

export async function createOpenAIRealtimeConferenceParticipant(input: {
  conferenceName: string;
  fromNumber: string;
  callAttemptId?: string | null;
  callToken?: string | null;
}) {
  const env = getServerEnv();
  const { projectId } = getOpenAIRealtimeConfig();

  if (!projectId) {
    throw new Error("OPENAI_PROJECT_ID is not configured.");
  }

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are not configured.");
  }

  const sipUri = new URL(`sip:${projectId}@sip.api.openai.com;transport=tls`);
  if (input.callAttemptId) {
    sipUri.searchParams.set("X-DailyCall-AttemptId", input.callAttemptId);
  }

  const baseUrl = env.PUBLIC_APP_URL ?? env.APP_URL;
  const statusCallback = baseUrl
    ? `${baseUrl}/api/twilio/openai-sip-dial-status?callAttemptId=${encodeURIComponent(input.callAttemptId ?? "")}`
    : null;
  const body = new URLSearchParams({
    From: input.fromNumber,
    To: sipUri.toString(),
    Label: "openai-realtime",
    EarlyMedia: "false",
    EndConferenceOnExit: "true",
  });

  if (statusCallback) {
    body.set("StatusCallback", statusCallback);
    body.set("StatusCallbackMethod", "POST");
    for (const event of ["initiated", "ringing", "answered", "completed"]) {
      body.append("StatusCallbackEvent", event);
    }
  }

  if (input.callToken) {
    body.set("CallToken", input.callToken);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Conferences/${encodeURIComponent(
      input.conferenceName,
    )}/Participants.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const payload = (await response.json().catch(() => null)) as { sid?: string; message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `Twilio OpenAI SIP conference participant failed with status ${response.status}`);
  }

  return payload;
}

export function buildOpenAIRealtimeConferenceTwiml(input: { conferenceName: string }) {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    "<Dial>",
    `<Conference beep="false" waitUrl="" startConferenceOnEnter="true" endConferenceOnExit="true">${xmlEscape(input.conferenceName)}</Conference>`,
    "</Dial>",
    "</Response>",
  ].join("");
}

export async function acceptOpenAIRealtimeCall(input: AcceptOpenAIRealtimeCallInput) {
  const config = getOpenAIRealtimeConfig();
  const instructions = buildOpenAIRealtimeInstructions(input);
  const response = await fetch(`${OPENAI_REALTIME_CALLS_URL}/${encodeURIComponent(input.callId)}/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "dailycall-openai-realtime",
    },
    body: JSON.stringify({
      type: "realtime",
      model: config.model,
      instructions,
      reasoning: {
        effort: config.reasoningEffort,
      },
      max_output_tokens: 320,
      audio: {
        input: {
          transcription: {
            model: "gpt-realtime-whisper",
            language: "en",
            delay: "minimal",
          },
          noise_reduction: null,
          turn_detection: {
            type: "server_vad",
            threshold: 0.65,
            prefix_padding_ms: 300,
            silence_duration_ms: 700,
            create_response: true,
            interrupt_response: false,
          },
        },
        output: {
          voice: input.voice || config.defaultVoice,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `OpenAI Realtime call accept failed with status ${response.status}`);
  }
}

function extractHeader(headers: unknown, name: string) {
  if (!Array.isArray(headers)) return null;

  const match = headers.find((header) => {
    if (!header || typeof header !== "object") return false;
    const record = header as Record<string, unknown>;
    return typeof record.name === "string" && record.name.toLowerCase() === name.toLowerCase();
  }) as Record<string, unknown> | undefined;

  return typeof match?.value === "string" ? match.value : null;
}

export function extractOpenAISipHeader(event: unknown, name: string) {
  if (!event || typeof event !== "object") return null;
  const data = (event as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return null;
  return extractHeader((data as Record<string, unknown>).sip_headers, name);
}

function formatOpenAIRealtimeTranscript(turns: OpenAIRealtimeTranscriptTurn[]) {
  return turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n\n");
}

function extractEventTranscript(event: Record<string, unknown>, memberName: string): OpenAIRealtimeTranscriptTurn | null {
  if (event.type === "conversation.item.input_audio_transcription.completed" && typeof event.transcript === "string") {
    return { speaker: memberName, text: event.transcript.trim() };
  }

  if (event.type === "response.output_audio_transcript.done" && typeof event.transcript === "string") {
    return { speaker: "DailyCall", text: event.transcript.trim() };
  }

  return null;
}

async function updateCallFromRealtimeEvents(input: {
  db: PrismaClient;
  callAttemptId: string;
  memberName: string;
  turns: OpenAIRealtimeTranscriptTurn[];
  events: Record<string, unknown>[];
  completed?: boolean;
}) {
  const transcript = formatOpenAIRealtimeTranscript(input.turns);

  await input.db.callAttempt.update({
    where: { id: input.callAttemptId },
    data: {
      status: input.completed ? "ANSWERED_OK" : "IN_PROGRESS",
      completedAt: input.completed ? new Date() : undefined,
      transcript: transcript || undefined,
      summary: transcript
        ? `OpenAI Realtime call captured ${input.turns.length} transcript turn${input.turns.length === 1 ? "" : "s"}.`
        : undefined,
      conversationRaw: {
        provider: "openai_realtime",
        events: input.events.slice(-80),
      } as Prisma.InputJsonValue,
      syncedAt: new Date(),
    },
  });
}

export function startOpenAIRealtimeCallMonitor(input: {
  callId: string;
  callAttemptId: string;
  memberName: string;
}) {
  const config = getOpenAIRealtimeConfig();
  const events: Record<string, unknown>[] = [];
  const turns: OpenAIRealtimeTranscriptTurn[] = [];
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(input.callId)}`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions: "Start the DailyCall check-in with a brief, soft, caring greeting and ask how they are doing today. Keep it to one short sentence.",
        },
      }),
    );
  });

  ws.on("message", (data) => {
    try {
      const event = JSON.parse(data.toString()) as Record<string, unknown>;
      events.push(event);

      const turn = extractEventTranscript(event, input.memberName);
      if (turn?.text) {
        turns.push(turn);
        void updateCallFromRealtimeEvents({
          db: prisma,
          callAttemptId: input.callAttemptId,
          memberName: input.memberName,
          turns,
          events,
        }).catch((error) => console.error("Failed to persist OpenAI Realtime transcript event", error));
      }
    } catch (error) {
      console.error("Failed to parse OpenAI Realtime event", error);
    }
  });

  ws.on("close", () => {
    void updateCallFromRealtimeEvents({
      db: prisma,
      callAttemptId: input.callAttemptId,
      memberName: input.memberName,
      turns,
      events,
      completed: true,
    }).catch((error) => console.error("Failed to finalize OpenAI Realtime call", error));
  });

  ws.on("error", (error) => {
    console.error("OpenAI Realtime monitor error", error);
  });

  return ws;
}
