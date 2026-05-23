import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import next from "next";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import WebSocket, { WebSocketServer } from "ws";

const projectDir = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectDir);

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || process.env.CARTESIA_STREAM_APP_PORT || 3003);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

const DAILYCALL_PROMPT = fs.readFileSync(path.join(projectDir, "agent-prompt-dailycaller.txt"), "utf8");

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function getCartesiaConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const config = raw.cartesiaConfig;
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  if (!config.modelId || !config.voiceId) return null;
  return {
    modelId: String(config.modelId),
    voiceId: String(config.voiceId),
  };
}

function getElevenLabsConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const config = raw.elevenLabsConfig;
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  if (!config.voiceId) return null;
  return {
    voiceId: String(config.voiceId),
    modelId: String(config.modelId || "eleven_flash_v2_5"),
  };
}

function getInitialPrompt(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return typeof raw.initialPrompt === "string" && raw.initialPrompt.trim() ? raw.initialPrompt.trim() : null;
}

function getTranscript(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Array.isArray(raw.hybridTranscript)) return [];
  return raw.hybridTranscript
    .map((turn) => {
      if (!turn || typeof turn !== "object") return null;
      const speaker = typeof turn.speaker === "string" ? turn.speaker.trim() : "";
      const text = typeof turn.text === "string" ? turn.text.trim() : "";
      return speaker && text ? { speaker, text } : null;
    })
    .filter(Boolean);
}

function formatTranscript(turns) {
  return turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n\n");
}

function fillPrompt(input) {
  return DAILYCALL_PROMPT
    .replaceAll("{{member_name}}", input.memberName)
    .replaceAll("{{caregiver_name}}", input.caregiverName)
    .replaceAll("{{companion_context}}", input.companionContext)
    .replaceAll("{{recent_topics}}", input.recentTopics)
    .replaceAll("{{topics_to_revisit}}", input.topicsToRevisit)
    .replaceAll("{{avoid_repeating}}", input.avoidRepeating);
}

function buildInstructions(input) {
  return [
    fillPrompt(input),
    `This call is running through a streaming ${input.bridgeProvider} bridge.`,
    "Return only the exact words DailyCall should say next. No labels, markdown, bullets, SSML, or stage directions.",
    "Keep each turn brief and responsive: usually one sentence, two only when necessary.",
  ].join("\n\n");
}

async function loadCallSession(callAttemptId) {
  const callAttempt = await prisma.callAttempt.findUnique({
    where: { id: callAttemptId },
    include: { member: { include: { customer: true, memory: true } } },
  });

  if (!callAttempt) throw new Error(`Call attempt not found: ${callAttemptId}`);
  const cartesiaConfig = getCartesiaConfig(callAttempt.conversationRaw);
  if (!cartesiaConfig) throw new Error(`Cartesia config not found for call attempt: ${callAttemptId}`);

  const memory = callAttempt.member.memory;
  const companionBits = [
    `You are calling ${callAttempt.member.name}. Sound like a familiar, warm daily companion, not a clinical checklist.`,
    memory?.moodSummary ? `Recent mood: ${memory.moodSummary}.` : null,
    memory?.favoriteTopics ? `Known hobbies/interests: ${memory.favoriteTopics}.` : null,
    memory?.routines ? `Known routines: ${memory.routines}.` : null,
    memory?.healthNotes ? `Health/context notes: ${memory.healthNotes}.` : null,
    memory?.followUpTopics ? `Topics to revisit warmly: ${memory.followUpTopics}.` : null,
    "Keep turn spacing responsive; do not add long dead-air pauses unless the senior is truly silent.",
  ].filter(Boolean);

  return {
    callAttempt,
    cartesiaConfig,
    turns: getTranscript(callAttempt.conversationRaw),
    initialPrompt: getInitialPrompt(callAttempt.conversationRaw),
    instructions: buildInstructions({
      memberName: callAttempt.member.name,
      caregiverName: callAttempt.member.customer.fullName || "your family",
      companionContext: companionBits.join("\n"),
      recentTopics: "none yet",
      topicsToRevisit: memory?.followUpTopics || "none yet",
      avoidRepeating: "Do not use a generic scripted wellness survey opening.",
      bridgeProvider: "Cartesia",
    }),
  };
}

async function loadElevenLabsCallSession(callAttemptId) {
  const callAttempt = await prisma.callAttempt.findUnique({
    where: { id: callAttemptId },
    include: { member: { include: { customer: true, memory: true } } },
  });

  if (!callAttempt) throw new Error(`Call attempt not found: ${callAttemptId}`);
  const elevenLabsConfig = getElevenLabsConfig(callAttempt.conversationRaw);
  if (!elevenLabsConfig) throw new Error(`ElevenLabs config not found for call attempt: ${callAttemptId}`);

  const memory = callAttempt.member.memory;
  const companionBits = [
    `You are calling ${callAttempt.member.name}. Sound like a familiar, warm daily companion, not a clinical checklist.`,
    memory?.moodSummary ? `Recent mood: ${memory.moodSummary}.` : null,
    memory?.favoriteTopics ? `Known hobbies/interests: ${memory.favoriteTopics}.` : null,
    memory?.routines ? `Known routines: ${memory.routines}.` : null,
    memory?.healthNotes ? `Health/context notes: ${memory.healthNotes}.` : null,
    memory?.followUpTopics ? `Topics to revisit warmly: ${memory.followUpTopics}.` : null,
    "Keep turn spacing responsive; do not add long dead-air pauses unless the senior is truly silent.",
  ].filter(Boolean);

  return {
    callAttempt,
    elevenLabsConfig,
    turns: getTranscript(callAttempt.conversationRaw),
    initialPrompt: getInitialPrompt(callAttempt.conversationRaw),
    instructions: buildInstructions({
      memberName: callAttempt.member.name,
      caregiverName: callAttempt.member.customer.fullName || "your family",
      companionContext: companionBits.join("\n"),
      recentTopics: "none yet",
      topicsToRevisit: memory?.followUpTopics || "none yet",
      avoidRepeating: "Do not use a generic scripted wellness survey opening.",
      bridgeProvider: "ElevenLabs",
    }),
  };
}

async function loadOpenAIRealtimeCallSession(callAttemptId) {
  const callAttempt = await prisma.callAttempt.findUnique({
    where: { id: callAttemptId },
    include: { member: { include: { customer: true, memory: true } } },
  });

  if (!callAttempt) throw new Error(`Call attempt not found: ${callAttemptId}`);

  const memory = callAttempt.member.memory;
  const companionBits = [
    `You are calling ${callAttempt.member.name}. Sound like a familiar, warm daily companion, not a clinical checklist.`,
    memory?.moodSummary ? `Recent mood: ${memory.moodSummary}.` : null,
    memory?.favoriteTopics ? `Known hobbies/interests: ${memory.favoriteTopics}.` : null,
    memory?.routines ? `Known routines: ${memory.routines}.` : null,
    memory?.healthNotes ? `Health/context notes: ${memory.healthNotes}.` : null,
    memory?.followUpTopics ? `Topics to revisit warmly: ${memory.followUpTopics}.` : null,
    "Keep turn spacing responsive; do not add long dead-air pauses unless the senior is truly silent.",
  ].filter(Boolean);

  return {
    callAttempt,
    turns: getTranscript(callAttempt.conversationRaw),
    initialPrompt: getInitialPrompt(callAttempt.conversationRaw),
    instructions: buildInstructions({
      memberName: callAttempt.member.name,
      caregiverName: callAttempt.member.customer.fullName || "your family",
      companionContext: companionBits.join("\n"),
      recentTopics: "none yet",
      topicsToRevisit: memory?.followUpTopics || "none yet",
      avoidRepeating: "Do not use a generic scripted wellness survey opening.",
      bridgeProvider: "OpenAI Realtime",
    }),
  };
}

function createOpenAITranscriptionSocket() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const model = process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || "gpt-realtime-whisper";
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?intent=transcription`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "transcription",
          audio: {
            input: {
              format: {
                type: "audio/pcmu",
              },
              transcription: {
                model,
                language: "en",
                delay: "minimal",
              },
              turn_detection: null,
            },
          },
        },
      }),
    );
  });

  return ws;
}

function createOpenAIRealtimeSocket() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";
  return new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

function createCartesiaSocket() {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) throw new Error("CARTESIA_API_KEY is not configured.");

  return new WebSocket("wss://api.cartesia.ai/tts/websocket?cartesia_version=2026-03-01", {
    headers: {
      "X-API-Key": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Cartesia-Version": "2026-03-01",
    },
  });
}

function createElevenLabsSocket(config) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured.");

  const url = new URL(`wss://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}/stream-input`);
  url.searchParams.set("model_id", config.modelId || "eleven_flash_v2_5");
  url.searchParams.set("output_format", "ulaw_8000");
  url.searchParams.set("optimize_streaming_latency", "4");
  url.searchParams.set("auto_mode", "true");
  url.searchParams.set("inactivity_timeout", "180");
  url.searchParams.set("apply_text_normalization", "off");

  return new WebSocket(url.toString(), {
    headers: {
      "xi-api-key": apiKey,
    },
  });
}

function sendTwilioClear(twilioSocket, streamSid) {
  if (!streamSid || twilioSocket.readyState !== WebSocket.OPEN) return;
  twilioSocket.send(JSON.stringify({ event: "clear", streamSid }));
}

function sendTwilioAudio(twilioSocket, streamSid, payload) {
  if (!streamSid || twilioSocket.readyState !== WebSocket.OPEN) return;
  twilioSocket.send(
    JSON.stringify({
      event: "media",
      streamSid,
      media: { payload },
    }),
  );
}

function decodeMuLawSample(byte) {
  const value = ~byte & 0xff;
  const sign = value & 0x80;
  const exponent = (value >> 4) & 0x07;
  const mantissa = value & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  return sign ? -sample : sample;
}

function muLawRms(base64Payload) {
  const buffer = Buffer.from(base64Payload, "base64");
  if (!buffer.length) return 0;

  let sumSquares = 0;
  for (const byte of buffer) {
    const sample = decodeMuLawSample(byte);
    sumSquares += sample * sample;
  }

  return Math.sqrt(sumSquares / buffer.length);
}

function sendCartesiaText(cartesiaSocket, state, text, isFinal = false) {
  if (!text && !isFinal) return;

  if (cartesiaSocket.readyState !== WebSocket.OPEN) {
    state.pendingCartesiaMessages.push({ text, isFinal });
    return;
  }

  if (!state.cartesiaContextId) {
    state.cartesiaContextId = randomUUID();
  }

  cartesiaSocket.send(
    JSON.stringify({
      model_id: state.cartesiaConfig.modelId,
      transcript: text,
      voice: {
        mode: "id",
        id: state.cartesiaConfig.voiceId,
      },
      language: "en",
      context_id: state.cartesiaContextId,
      output_format: {
        container: "raw",
        encoding: "pcm_mulaw",
        sample_rate: 8000,
      },
      continue: !isFinal,
    }),
  );
}

function sendElevenLabsText(elevenLabsSocket, state, text, isFinal = false) {
  if (!text && !isFinal) return;

  if (!elevenLabsSocket || elevenLabsSocket.readyState !== WebSocket.OPEN) {
    state.pendingElevenLabsMessages.push({ text, isFinal });
    return;
  }

  elevenLabsSocket.send(
    JSON.stringify(
      isFinal
        ? { text: "" }
        : {
            text: text.endsWith(" ") ? text : `${text} `,
            try_trigger_generation: true,
          },
    ),
  );
}

async function persistTurnState(state, completed = false) {
  if (!state.callAttemptId) return;
  const isElevenLabs = state.bridgeProvider === "elevenlabs";

  await prisma.callAttempt.update({
    where: { id: state.callAttemptId },
    data: {
      status: completed ? "ANSWERED_OK" : "IN_PROGRESS",
      completedAt: completed ? new Date() : undefined,
      transcript: formatTranscript(state.turns),
      summary: `${isElevenLabs ? "ElevenLabs" : "Cartesia"} streaming bridge captured ${state.turns.length} transcript turn${state.turns.length === 1 ? "" : "s"}.`,
      conversationRaw: {
        provider: isElevenLabs
          ? "openai_realtime_stt_openai_text_elevenlabs_stream_twilio"
          : "openai_realtime_stt_openai_text_cartesia_stream_twilio",
        ...(isElevenLabs ? { elevenLabsConfig: state.elevenLabsConfig } : { cartesiaConfig: state.cartesiaConfig }),
        initialPrompt: state.initialPrompt,
        hybridTranscript: state.turns,
        lastTurnTiming: state.lastTurnTiming ?? null,
      },
      syncedAt: new Date(),
    },
  });
}

async function persistOpenAIRealtimeState(state, completed = false) {
  if (!state.callAttemptId) return;

  await prisma.callAttempt.update({
    where: { id: state.callAttemptId },
    data: {
      status: completed ? "ANSWERED_OK" : "IN_PROGRESS",
      completedAt: completed ? new Date() : undefined,
      transcript: formatTranscript(state.turns),
      summary: `OpenAI Realtime bridge captured ${state.turns.length} transcript turn${state.turns.length === 1 ? "" : "s"}.`,
      conversationRaw: {
        provider: "openai_realtime_stream_bridge",
        initialPrompt: state.initialPrompt,
        hybridTranscript: state.turns,
        lastTurnTiming: state.lastTurnTiming ?? null,
        events: state.events.slice(-80),
      },
      syncedAt: new Date(),
    },
  });
}

function sendTtsText(state, text, isFinal = false) {
  if (state.bridgeProvider === "elevenlabs") {
    sendElevenLabsText(state.elevenLabsSocket, state, text, isFinal);
    return;
  }

  sendCartesiaText(state.cartesiaSocket, state, text, isFinal);
}

async function streamOpenAIReplyToTts(state, userText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const startedAt = Date.now();
  const controller = new AbortController();
  state.activeResponseController = controller;
  state.activeAssistantText = "";
  state.pendingCartesiaText = "";
  state.cartesiaContextId = randomUUID();
  if (
    state.bridgeProvider === "elevenlabs" &&
    state.elevenLabsConfig &&
    (!state.elevenLabsSocket ||
      state.elevenLabsSocket.readyState === WebSocket.CLOSING ||
      state.elevenLabsSocket.readyState === WebSocket.CLOSED)
  ) {
    attachElevenLabsSocket(state, state.twilioSocket);
  }

  state.turns.push({ speaker: state.memberName, text: userText });

  const input = formatTranscript(state.turns.slice(-10));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "dailycall-cartesia-streaming-bridge",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
      instructions: state.instructions,
      input,
      max_output_tokens: 90,
      stream: true,
      store: false,
    }),
    signal: controller.signal,
  });

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `OpenAI streaming response failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function flush(force = false) {
    if (!state.pendingCartesiaText) return;
    const shouldFlush = force || /[.!?]\s$/.test(state.pendingCartesiaText) || state.pendingCartesiaText.length >= 32;
    if (!shouldFlush) return;
    sendTtsText(state, state.pendingCartesiaText, false);
    state.pendingCartesiaText = "";
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      const data = dataLine.slice(6);
      if (data === "[DONE]") continue;

      const event = safeJson(data);
      if (!event) continue;

      const delta =
        event.type === "response.output_text.delta" && typeof event.delta === "string"
          ? event.delta
          : event.type === "response.output_text.done" && typeof event.text === "string"
            ? ""
            : "";

      if (delta) {
        state.activeAssistantText += delta;
        state.pendingCartesiaText += delta;
        flush(false);
      }
    }
  }

  flush(true);
  sendTtsText(state, "", true);

  const assistantText = state.activeAssistantText.replace(/\s+/g, " ").trim();
  if (assistantText) {
    state.turns.push({ speaker: "DailyCall", text: assistantText });
    state.lastTurnTiming = {
      totalMs: Date.now() - startedAt,
      userText,
      assistantText,
    };
    await persistTurnState(state);
  }
}

function cancelActiveOutput(state) {
  state.activeResponseController?.abort();
  state.activeResponseController = null;
  state.pendingCartesiaText = "";
  state.activeAssistantText = "";

  if (state.cartesiaSocket?.readyState === WebSocket.OPEN && state.cartesiaContextId) {
    state.cartesiaSocket.send(JSON.stringify({ context_id: state.cartesiaContextId, cancel: true }));
  }

  if (state.elevenLabsSocket?.readyState === WebSocket.OPEN) {
    state.elevenLabsSocket.close();
  }

  state.cartesiaContextId = null;
}

function cancelOpenAIRealtimeOutput(state) {
  if (state.openAISocket?.readyState !== WebSocket.OPEN) return;
  state.openAISocket.send(JSON.stringify({ type: "response.cancel" }));
}

function attachElevenLabsSocket(state, twilioSocket) {
  const elevenLabsSocket = createElevenLabsSocket(state.elevenLabsConfig);
  state.elevenLabsSocket = elevenLabsSocket;

  elevenLabsSocket.on("message", (data) => {
    const message = safeJson(data.toString());
    if (!message) return;

    if (typeof message.audio === "string" && message.audio) {
      sendTwilioAudio(twilioSocket, state.streamSid, message.audio);
      return;
    }

    if (message.error) {
      console.error("ElevenLabs websocket error event", message);
    }
  });

  elevenLabsSocket.on("open", () => {
    elevenLabsSocket.send(
      JSON.stringify({
        text: " ",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.82,
          speed: 1,
        },
      }),
    );

    const pending = state.pendingElevenLabsMessages.splice(0);
    for (const message of pending) {
      sendElevenLabsText(elevenLabsSocket, state, message.text, message.isFinal);
    }
  });

  elevenLabsSocket.on("error", (error) => console.error("ElevenLabs TTS socket error", error));
  return elevenLabsSocket;
}

function wireOpenAIRealtimeBridge(twilioSocket) {
  const state = {
    twilioSocket,
    openAISocket: createOpenAIRealtimeSocket(),
    callAttemptId: null,
    memberName: "there",
    streamSid: null,
    turns: [],
    initialPrompt: null,
    instructions: "",
    events: [],
    pendingAudioPayloads: [],
    sessionReady: false,
    sessionLoaded: false,
    openerStarted: false,
    assistantTranscript: "",
    responseStartedAt: null,
    lastTurnTiming: null,
    userSpeaking: false,
    speechFrames: 0,
    silenceFrames: 0,
  };

  function startOpener() {
    if (!state.sessionReady || !state.sessionLoaded || state.openerStarted || state.openAISocket.readyState !== WebSocket.OPEN) return;
    state.openerStarted = true;
    const opener =
      state.initialPrompt ||
      `Hi ${state.memberName}, it is your scheduled check-in call from DailyCall. Is there anything I can help you with, or anything you would like to chat about?`;
    state.turns.push({ speaker: "DailyCall", text: opener });
    state.responseStartedAt = Date.now();
    state.openAISocket.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions: `Say exactly this opener, then wait for the person to respond: ${opener}`,
        },
      }),
    );
    void persistOpenAIRealtimeState(state).catch((error) => console.error("persist OpenAI Realtime opener failed", error));
  }

  state.openAISocket.on("open", () => {
    state.openAISocket.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2",
          instructions: state.instructions || "You are DailyCall. Keep responses warm, brief, and natural.",
          output_modalities: ["audio"],
          reasoning: {
            effort: process.env.OPENAI_REALTIME_REASONING_EFFORT || "low",
          },
          max_output_tokens: 220,
          audio: {
            input: {
              format: {
                type: "audio/pcmu",
              },
              transcription: {
                model: process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || "gpt-realtime-whisper",
                language: "en",
                delay: "minimal",
              },
              noise_reduction: null,
              turn_detection: {
                type: "server_vad",
                threshold: 0.65,
                prefix_padding_ms: 300,
                silence_duration_ms: 650,
                create_response: true,
                interrupt_response: true,
              },
            },
            output: {
              format: {
                type: "audio/pcmu",
              },
              voice: process.env.OPENAI_REALTIME_VOICE || "marin",
            },
          },
        },
      }),
    );

    const pending = state.pendingAudioPayloads.splice(0);
    for (const payload of pending) {
      state.openAISocket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: payload }));
    }
  });

  state.openAISocket.on("message", (data) => {
    const message = safeJson(data.toString());
    if (!message) return;
    state.events.push(message);

    if (message.type === "session.updated" || message.type === "session.created") {
      state.sessionReady = true;
      startOpener();
      return;
    }

    if (
      (message.type === "response.output_audio.delta" || message.type === "response.audio.delta") &&
      typeof message.delta === "string"
    ) {
      sendTwilioAudio(twilioSocket, state.streamSid, message.delta);
      return;
    }

    if (message.type === "input_audio_buffer.speech_started") {
      sendTwilioClear(twilioSocket, state.streamSid);
      return;
    }

    if (message.type === "conversation.item.input_audio_transcription.completed" && typeof message.transcript === "string") {
      const transcript = message.transcript.trim();
      if (transcript) {
        state.turns.push({ speaker: state.memberName, text: transcript });
      }
      return;
    }

    if (
      (message.type === "response.output_audio_transcript.delta" || message.type === "response.audio_transcript.delta") &&
      typeof message.delta === "string"
    ) {
      state.assistantTranscript += message.delta;
      return;
    }

    if (message.type === "response.output_audio_transcript.done" || message.type === "response.audio_transcript.done") {
      const transcript = String(message.transcript || state.assistantTranscript).replace(/\s+/g, " ").trim();
      const lastTurn = state.turns.at(-1);
      if (transcript && !(lastTurn?.speaker === "DailyCall" && lastTurn.text === transcript)) {
        state.turns.push({ speaker: "DailyCall", text: transcript });
      }
      state.assistantTranscript = "";
      state.lastTurnTiming = state.responseStartedAt
        ? {
            totalMs: Date.now() - state.responseStartedAt,
            assistantText: transcript,
          }
        : null;
      void persistOpenAIRealtimeState(state).catch((error) => console.error("persist OpenAI Realtime turn failed", error));
      return;
    }

    if (message.type === "response.created") {
      state.responseStartedAt = Date.now();
      return;
    }

    if (message.type === "error") {
      console.error("OpenAI realtime bridge error", message);
    }
  });

  twilioSocket.on("message", (data) => {
    const message = safeJson(data.toString());
    if (!message) return;

    if (message.event === "start") {
      state.streamSid = message.start?.streamSid ?? message.streamSid ?? null;
      state.callAttemptId = message.start?.customParameters?.callAttemptId ?? null;
      void loadOpenAIRealtimeCallSession(state.callAttemptId)
        .then((session) => {
          state.memberName = session.callAttempt.member.name;
          state.turns = session.turns;
          state.initialPrompt = session.initialPrompt;
          state.instructions = session.instructions;
          state.sessionLoaded = true;
          console.log("OpenAI Realtime stream bridge started", {
            callAttemptId: state.callAttemptId,
            streamSid: state.streamSid,
            model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2",
            voice: process.env.OPENAI_REALTIME_VOICE || "marin",
          });

          if (state.openAISocket.readyState === WebSocket.OPEN) {
            state.openAISocket.send(
              JSON.stringify({
                type: "session.update",
                session: {
                  instructions: state.instructions,
                },
              }),
            );
          }
          startOpener();
        })
        .catch((error) => {
          console.error("failed to load OpenAI Realtime stream session", error);
          twilioSocket.close();
        });
      return;
    }

    if (message.event === "media" && typeof message.media?.payload === "string") {
      const rms = muLawRms(message.media.payload);
      const isSpeechFrame = rms > 650;

      if (isSpeechFrame) {
        state.speechFrames += 1;
        state.silenceFrames = 0;

        if (!state.userSpeaking && state.speechFrames >= 3) {
          state.userSpeaking = true;
          sendTwilioClear(twilioSocket, state.streamSid);
          cancelOpenAIRealtimeOutput(state);
        }
      } else {
        state.silenceFrames += 1;
        if (!state.userSpeaking) {
          state.speechFrames = 0;
        }
      }

      if (state.silenceFrames >= 24) {
        state.userSpeaking = false;
      }

      if (state.openAISocket.readyState !== WebSocket.OPEN) {
        state.pendingAudioPayloads.push(message.media.payload);
        return;
      }

      state.openAISocket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: message.media.payload }));
      return;
    }

    if (message.event === "stop") {
      void persistOpenAIRealtimeState(state, true).catch((error) => console.error("persist OpenAI Realtime stop failed", error));
      twilioSocket.close();
    }
  });

  twilioSocket.on("close", () => {
    if (state.openAISocket.readyState === WebSocket.OPEN) state.openAISocket.close();
  });

  twilioSocket.on("error", (error) => console.error("Twilio OpenAI Realtime stream socket error", error));
  state.openAISocket.on("error", (error) => console.error("OpenAI Realtime stream socket error", error));
}

function wireBridge(twilioSocket, bridgeProvider = "cartesia") {
  const state = {
    bridgeProvider,
    twilioSocket,
    callAttemptId: null,
    memberName: "there",
    streamSid: null,
    turns: [],
    cartesiaConfig: null,
    elevenLabsConfig: null,
    initialPrompt: null,
    instructions: "",
    cartesiaSocket: null,
    elevenLabsSocket: null,
    cartesiaContextId: null,
    pendingCartesiaText: "",
    activeAssistantText: "",
    activeResponseController: null,
    lastTurnTiming: null,
    pendingAudioPayloads: [],
    pendingCartesiaMessages: [],
    pendingElevenLabsMessages: [],
    userSpeaking: false,
    speechFrames: 0,
    silenceFrames: 0,
    lastCommitAt: 0,
  };
  const openAISocket = createOpenAITranscriptionSocket();
  const cartesiaSocket = bridgeProvider === "cartesia" ? createCartesiaSocket() : null;
  if (cartesiaSocket) {
    state.cartesiaSocket = cartesiaSocket;
  }

  openAISocket.on("message", (data) => {
    const message = safeJson(data.toString());
    if (!message) return;

    if (message.type === "conversation.item.input_audio_transcription.completed") {
      const transcript = typeof message.transcript === "string" ? message.transcript.trim() : "";
      if (!transcript) return;
      void streamOpenAIReplyToTts(state, transcript).catch((error) => console.error("stream reply failed", error));
      return;
    }

    if (message.type === "error") {
      console.error("OpenAI realtime transcription error", message);
    }
  });
  openAISocket.on("open", () => {
    const pending = state.pendingAudioPayloads.splice(0);
    for (const payload of pending) {
      openAISocket.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: payload,
        }),
      );
    }
  });

  if (cartesiaSocket) {
    cartesiaSocket.on("message", (data) => {
      const message = safeJson(data.toString());
      if (!message) return;

      if (message.type === "chunk" && typeof message.data === "string") {
        sendTwilioAudio(twilioSocket, state.streamSid, message.data);
        return;
      }

      if (message.type === "error") {
        console.error("Cartesia websocket error event", message);
      }
    });
    cartesiaSocket.on("open", () => {
      const pending = state.pendingCartesiaMessages.splice(0);
      for (const message of pending) {
        sendCartesiaText(cartesiaSocket, state, message.text, message.isFinal);
      }
    });
  }

  twilioSocket.on("message", (data) => {
    const message = safeJson(data.toString());
    if (!message) return;

    if (message.event === "start") {
      state.streamSid = message.start?.streamSid ?? message.streamSid ?? null;
      state.callAttemptId = message.start?.customParameters?.callAttemptId ?? null;
      const loadSession = bridgeProvider === "elevenlabs" ? loadElevenLabsCallSession : loadCallSession;
      void loadSession(state.callAttemptId)
        .then((session) => {
          state.memberName = session.callAttempt.member.name;
          state.turns = session.turns;
          state.cartesiaConfig = session.cartesiaConfig ?? null;
          state.elevenLabsConfig = session.elevenLabsConfig ?? null;
          state.initialPrompt = session.initialPrompt;
          state.instructions = session.instructions;
          if (bridgeProvider === "elevenlabs") {
            attachElevenLabsSocket(state, twilioSocket);
          }
          console.log(`${bridgeProvider === "elevenlabs" ? "ElevenLabs" : "Cartesia"} stream bridge started`, {
            callAttemptId: state.callAttemptId,
            streamSid: state.streamSid,
            modelId: state.cartesiaConfig?.modelId ?? state.elevenLabsConfig?.modelId,
            voiceId: state.cartesiaConfig?.voiceId ?? state.elevenLabsConfig?.voiceId,
          });

          const opener =
            state.initialPrompt ||
            `Hi ${state.memberName}, it is your scheduled check-in call from DailyCall. Is there anything I can help you with, or anything you would like to chat about?`;
          state.turns.push({ speaker: "DailyCall", text: opener });
          state.cartesiaContextId = randomUUID();
          sendTtsText(state, opener, true);
          void persistTurnState(state).catch((error) => console.error("persist opener failed", error));
        })
        .catch((error) => {
          console.error(`failed to load ${bridgeProvider} stream session`, error);
          twilioSocket.close();
        });
      return;
    }

    if (message.event === "media" && typeof message.media?.payload === "string") {
      const rms = muLawRms(message.media.payload);
      const isSpeechFrame = rms > 650;

      if (isSpeechFrame) {
        state.speechFrames += 1;
        state.silenceFrames = 0;

        if (!state.userSpeaking && state.speechFrames >= 3) {
          state.userSpeaking = true;
          sendTwilioClear(twilioSocket, state.streamSid);
          cancelActiveOutput(state);
        }
      } else {
        state.silenceFrames += 1;
        if (!state.userSpeaking) {
          state.speechFrames = 0;
        }
      }

      if (openAISocket.readyState !== WebSocket.OPEN) {
        state.pendingAudioPayloads.push(message.media.payload);
        return;
      }

      openAISocket.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: message.media.payload,
        }),
      );

      if (state.userSpeaking && state.silenceFrames >= 24 && Date.now() - state.lastCommitAt > 1200) {
        openAISocket.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
        state.userSpeaking = false;
        state.speechFrames = 0;
        state.silenceFrames = 0;
        state.lastCommitAt = Date.now();
      }
      return;
    }

    if (message.event === "stop") {
      void persistTurnState(state, true).catch((error) => console.error("persist stop failed", error));
      twilioSocket.close();
    }
  });

  twilioSocket.on("close", () => {
    cancelActiveOutput(state);
    if (openAISocket.readyState === WebSocket.OPEN) openAISocket.close();
    if (cartesiaSocket?.readyState === WebSocket.OPEN) cartesiaSocket.close();
    if (state.elevenLabsSocket?.readyState === WebSocket.OPEN) state.elevenLabsSocket.close();
  });

  twilioSocket.on("error", (error) => console.error("Twilio stream socket error", error));
  openAISocket.on("error", (error) => console.error("OpenAI transcription socket error", error));
  cartesiaSocket?.on("error", (error) => console.error("Cartesia TTS socket error", error));
}

await app.prepare();

const server = http.createServer((request, response) => {
  if (
    request.url === "/api/cartesia-test/stream-health" ||
    request.url === "/api/bridge-test/stream-health" ||
    request.url === "/api/openai-realtime-bridge/stream-health"
  ) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "dailycall-streaming-bridge-server" }));
    return;
  }

  handle(request, response);
});
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);

  if (
    url.pathname !== "/api/cartesia-test/stream" &&
    url.pathname !== "/api/bridge-test/stream" &&
    url.pathname !== "/api/openai-realtime-bridge/stream"
  ) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    if (url.pathname === "/api/openai-realtime-bridge/stream") {
      wireOpenAIRealtimeBridge(ws);
      return;
    }

    wireBridge(ws, url.pathname === "/api/bridge-test/stream" ? "elevenlabs" : "cartesia");
  });
});

server.listen(port, hostname, () => {
  console.log(`DailyCall Next + streaming bridges listening on http://${hostname}:${port}`);
  console.log(`Cartesia bridge WebSocket path: ws://${hostname}:${port}/api/cartesia-test/stream`);
  console.log(`ElevenLabs bridge WebSocket path: ws://${hostname}:${port}/api/bridge-test/stream`);
  console.log(`OpenAI Realtime bridge WebSocket path: ws://${hostname}:${port}/api/openai-realtime-bridge/stream`);
});
