import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { summarizeConversationForFamily } from "@/lib/voice/conversation-insights";

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
const DEFAULT_OPENAI_REALTIME_MODEL = "gpt-realtime-2";
const DEFAULT_OPENAI_REALTIME_VAD_EAGERNESS = "low";
const OPENAI_REALTIME_SIP_TURN_MODE = "manual_server_vad_transcript_no_barge";
const OPENAI_REALTIME_SIP_VAD = {
  threshold: 0.75,
  prefixPaddingMs: 300,
  silenceDurationMs: 650,
};

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

function buildOpenAISipDialAction(input: { baseUrl?: string | null; callSid?: string | null; callAttemptId?: string | null }) {
  if (!input.baseUrl) return null;
  const actionUrl = new URL("/api/twilio/openai-sip-dial-status", input.baseUrl);
  if (input.callSid) {
    actionUrl.searchParams.set("callSid", input.callSid);
  }
  if (input.callAttemptId) {
    actionUrl.searchParams.set("callAttemptId", input.callAttemptId);
  }
  return actionUrl.toString();
}

function getOpenAIRealtimeConfig() {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return {
    apiKey: env.OPENAI_API_KEY,
    projectId: env.OPENAI_PROJECT_ID,
    model: env.OPENAI_REALTIME_MODEL ?? DEFAULT_OPENAI_REALTIME_MODEL,
    defaultVoice: env.OPENAI_REALTIME_VOICE ?? "marin",
    reasoningEffort: env.OPENAI_REALTIME_REASONING_EFFORT ?? "low",
    vadEagerness: env.OPENAI_REALTIME_VAD_EAGERNESS ?? DEFAULT_OPENAI_REALTIME_VAD_EAGERNESS,
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
You are DailyCall, a familiar senior companion voice agent calling ${input.memberName}. If you use a name, use only "${input.memberName}" unless the person corrects you. Do not infer a name from family notes, dates, months, events, or topics. Your job is to have a natural daily check-in conversation and help the family understand how the person is doing.

# Personality and Tone
Sound caring, clear, familiar, and human. Use a calm companion tone suited for an older adult: familiar, unhurried in delivery, but quick to respond. You are not a clinician, salesperson, support bot, or survey script. Keep responses short, usually one sentence and no more than two.

# Turn-Taking and Pacing
Use natural phone turn-taking. Respond after the person is done speaking; do not interrupt them. Avoid filler, verbal hesitations, repeated acknowledgements, stock positivity openers, and long lead-ins. Do not start replies with tone labels, coaching words, or canned positivity like "Slow...", "Happy...", "Glad...", "Great...", "Warm...", or "Gentle..."; those words are instructions for you, not words to say aloud. Ask one simple question at a time. If the person sounds confused, use clearer wording but keep the response prompt.

# Call Length and Ending
Keep individual replies short, but let the person talk as long as they want. Do not steer the conversation toward ending, wrap up early, or say goodbye just because the basic check-in is complete. Only close when the person clearly says they need to go, does not want to talk, stops responding after appropriate no-response checks, or reaches a demo-specific time limit.

# DailyCall Memory
${input.companionContext}

# Current Context
${input.currentContext}

# Conversation Guidance
Recent topics already covered: ${recentTopics}.
Topics to revisit if natural: ${topicsToRevisit}.
Avoid repeating: ${avoidRepeating}.
Open with variety. Start with a brief greeting, then ask one easy, human question. Prefer short, caring responses over long explanations. Use preloaded current context only when it feels natural or when the person asks.

# Safety
Do not diagnose, provide medical instructions, or make emergency decisions. If the person describes immediate danger, a medical emergency, or feeling unsafe, calmly tell them to call emergency services or contact ${input.caregiverName} or another trusted person right away.

# After The Call
Pay attention to mood, notable moments, topics, possible memory updates, and follow-up needs. The app will use the transcript and events to create a concise family summary.
`.trim();
}

export function buildOpenAIRealtimeSipTwiml(input: {
  callSid?: string | null;
  callAttemptId?: string | null;
}) {
  const env = getServerEnv();
  const { projectId } = getOpenAIRealtimeConfig();

  if (!projectId) {
    throw new Error("OPENAI_PROJECT_ID is not configured.");
  }

  const sipUri = new URL(`sip:${projectId}@sip.api.openai.com;transport=tls`);
  if (input.callSid) {
    sipUri.searchParams.set("X-DailyCall-CallSid", input.callSid);
  }
  if (input.callAttemptId) {
    sipUri.searchParams.set("X-DailyCall-AttemptId", input.callAttemptId);
  }
  const baseUrl = env.PUBLIC_APP_URL ?? env.APP_URL;
  const dialAction = buildOpenAISipDialAction({ baseUrl, callSid: input.callSid, callAttemptId: input.callAttemptId });

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    `<Dial timeout="20"${dialAction ? ` action="${xmlEscape(dialAction)}" method="POST"` : ""}>`,
    `<Sip>${xmlEscape(sipUri.toString())}</Sip>`,
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
            threshold: OPENAI_REALTIME_SIP_VAD.threshold,
            prefix_padding_ms: OPENAI_REALTIME_SIP_VAD.prefixPaddingMs,
            silence_duration_ms: OPENAI_REALTIME_SIP_VAD.silenceDurationMs,
            create_response: false,
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
  metrics: Record<string, unknown>;
  completed?: boolean;
}) {
  const transcript = formatOpenAIRealtimeTranscript(input.turns);
  const existing = await input.db.callAttempt.findUnique({
    where: { id: input.callAttemptId },
    select: { conversationRaw: true },
  });
  const existingRaw =
    existing?.conversationRaw && typeof existing.conversationRaw === "object" && !Array.isArray(existing.conversationRaw)
      ? (existing.conversationRaw as Record<string, unknown>)
      : {};

  await input.db.callAttempt.update({
    where: { id: input.callAttemptId },
    data: {
      status: input.completed ? "ANSWERED_OK" : "IN_PROGRESS",
      completedAt: input.completed ? new Date() : undefined,
      transcript: transcript || undefined,
      summary: transcript
        ? summarizeConversationForFamily({ memberName: input.memberName, transcript })
        : undefined,
      conversationRaw: {
        ...existingRaw,
        provider: "openai_realtime",
        openAISipMode: OPENAI_REALTIME_SIP_TURN_MODE,
        events: input.events.slice(-80),
        realtimeMetrics: input.metrics,
      } as Prisma.InputJsonValue,
      syncedAt: new Date(),
    },
  });
}

export function startOpenAIRealtimeCallMonitor(input: {
  callId: string;
  callAttemptId: string;
  memberName: string;
  initialPrompt?: string | null;
}) {
  const config = getOpenAIRealtimeConfig();
  const events: Record<string, unknown>[] = [];
  const turns: OpenAIRealtimeTranscriptTurn[] = [];
  const metrics: Record<string, unknown> = {
    monitorOpenedAt: null,
    openerSentAt: null,
    firstAudioDeltaAt: null,
    responseDoneAt: null,
    speechStartedCount: 0,
    speechStoppedCount: 0,
    manualResponseCount: 0,
    transcriptResponseCount: 0,
    ignoredSpeechDuringResponseCount: 0,
    errorCount: 0,
  };
  process.env.WS_NO_BUFFER_UTIL = "1";
  void import("ws")
    .then(({ default: WebSocket }) => {
      const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(input.callId)}`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });
      let openerSent = false;
      let responseInProgress = false;
      let openerComplete = false;
      let activeResponseKind: "opener" | "reply" | null = null;
      let pendingUserResponse = false;
      let lastUserTranscript = "";

      function setTurnDetection(enabled: boolean) {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              audio: {
                input: {
                  turn_detection: enabled
                    ? {
                        type: "server_vad",
                        threshold: OPENAI_REALTIME_SIP_VAD.threshold,
                        prefix_padding_ms: OPENAI_REALTIME_SIP_VAD.prefixPaddingMs,
                        silence_duration_ms: OPENAI_REALTIME_SIP_VAD.silenceDurationMs,
                        create_response: false,
                        interrupt_response: false,
                      }
                    : null,
                },
              },
            },
          }),
        );
      }

      function createResponse(kind: "opener" | "reply", instructions?: string, maxOutputTokens = 110) {
        if (responseInProgress || ws.readyState !== WebSocket.OPEN) return false;
        responseInProgress = true;
        activeResponseKind = kind;
        metrics.manualResponseCount = Number(metrics.manualResponseCount ?? 0) + 1;
        setTurnDetection(false);
        ws.send(
          JSON.stringify({
            type: "response.create",
            response: {
              ...(instructions ? { instructions } : {}),
              max_output_tokens: maxOutputTokens,
            },
          }),
        );
        return true;
      }

      function sendOpener() {
        if (openerSent || ws.readyState !== WebSocket.OPEN) return;
        openerSent = true;
        metrics.openerSentAt = new Date().toISOString();
        createResponse(
          "opener",
          input.initialPrompt
            ? `Say exactly this opening line and nothing else, then wait for the person to respond: ${input.initialPrompt}`
            : "Say exactly: Hi, it is DailyCall. How are you doing today?",
          80,
        );
      }

      function maybeRespondToUser() {
        if (!openerComplete || !pendingUserResponse || responseInProgress || ws.readyState !== WebSocket.OPEN) return;
        pendingUserResponse = false;
        metrics.transcriptResponseCount = Number(metrics.transcriptResponseCount ?? 0) + 1;
        createResponse(
          "reply",
          [
            "Reply briefly to the person's last message.",
            "Use one short sentence.",
            "Ask one simple follow-up only if it is needed to keep the conversation moving.",
            `Do not overuse the person's name. Last user transcript: ${lastUserTranscript}`,
          ].join(" "),
          110,
        );
      }

      ws.on("open", () => {
        metrics.monitorOpenedAt = new Date().toISOString();
        setTurnDetection(true);
        setTimeout(sendOpener, 500);
      });

      ws.on("message", (data) => {
        try {
          const event = JSON.parse(data.toString()) as Record<string, unknown>;
          events.push(event);
          if (event.type === "session.created" || event.type === "session.updated") {
            sendOpener();
          }
          if (event.type === "response.output_audio.delta" && !metrics.firstAudioDeltaAt) {
            metrics.firstAudioDeltaAt = new Date().toISOString();
          }
          if (event.type === "response.done") {
            metrics.responseDoneAt = new Date().toISOString();
            responseInProgress = false;
            if (activeResponseKind === "opener") {
              openerComplete = true;
            }
            activeResponseKind = null;
            setTurnDetection(true);
            maybeRespondToUser();
          }
          if (event.type === "input_audio_buffer.speech_started") {
            metrics.speechStartedCount = Number(metrics.speechStartedCount ?? 0) + 1;
            if (responseInProgress) {
              metrics.ignoredSpeechDuringResponseCount = Number(metrics.ignoredSpeechDuringResponseCount ?? 0) + 1;
            }
          }
          if (event.type === "input_audio_buffer.speech_stopped") {
            metrics.speechStoppedCount = Number(metrics.speechStoppedCount ?? 0) + 1;
          }
          if (event.type === "error") {
            metrics.errorCount = Number(metrics.errorCount ?? 0) + 1;
          }

          const turn = extractEventTranscript(event, input.memberName);
          if (turn?.text) {
            turns.push(turn);
            if (turn.speaker !== "DailyCall") {
              lastUserTranscript = turn.text;
              pendingUserResponse = true;
              maybeRespondToUser();
            }
            void updateCallFromRealtimeEvents({
              db: prisma,
              callAttemptId: input.callAttemptId,
              memberName: input.memberName,
              turns,
              events,
              metrics,
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
          metrics,
          completed: true,
        }).catch((error) => console.error("Failed to finalize OpenAI Realtime call", error));
      });

      ws.on("error", (error) => {
        console.error("OpenAI Realtime monitor error", error);
      });
    })
    .catch((error) => {
      console.error("Failed to start OpenAI Realtime monitor", error);
    });
}
