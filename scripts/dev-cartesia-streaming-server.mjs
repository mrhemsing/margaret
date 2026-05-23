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
    "This call is running through a streaming Cartesia bridge.",
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

async function persistTurnState(state, completed = false) {
  if (!state.callAttemptId) return;

  await prisma.callAttempt.update({
    where: { id: state.callAttemptId },
    data: {
      status: completed ? "ANSWERED_OK" : "IN_PROGRESS",
      completedAt: completed ? new Date() : undefined,
      transcript: formatTranscript(state.turns),
      summary: `Cartesia streaming bridge captured ${state.turns.length} transcript turn${state.turns.length === 1 ? "" : "s"}.`,
      conversationRaw: {
        provider: "openai_realtime_stt_openai_text_cartesia_stream_twilio",
        cartesiaConfig: state.cartesiaConfig,
        initialPrompt: state.initialPrompt,
        hybridTranscript: state.turns,
        lastTurnTiming: state.lastTurnTiming ?? null,
      },
      syncedAt: new Date(),
    },
  });
}

async function streamOpenAIReplyToCartesia(state, userText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const startedAt = Date.now();
  const controller = new AbortController();
  state.activeResponseController = controller;
  state.activeAssistantText = "";
  state.pendingCartesiaText = "";
  state.cartesiaContextId = randomUUID();

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
    sendCartesiaText(state.cartesiaSocket, state, state.pendingCartesiaText, false);
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
  sendCartesiaText(state.cartesiaSocket, state, "", true);

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

  state.cartesiaContextId = null;
}

function wireBridge(twilioSocket) {
  const state = {
    callAttemptId: null,
    memberName: "there",
    streamSid: null,
    turns: [],
    cartesiaConfig: null,
    initialPrompt: null,
    instructions: "",
    cartesiaSocket: null,
    cartesiaContextId: null,
    pendingCartesiaText: "",
    activeAssistantText: "",
    activeResponseController: null,
    lastTurnTiming: null,
    pendingAudioPayloads: [],
    pendingCartesiaMessages: [],
    userSpeaking: false,
    speechFrames: 0,
    silenceFrames: 0,
    lastCommitAt: 0,
  };
  const openAISocket = createOpenAITranscriptionSocket();
  const cartesiaSocket = createCartesiaSocket();
  state.cartesiaSocket = cartesiaSocket;

  openAISocket.on("message", (data) => {
    const message = safeJson(data.toString());
    if (!message) return;

    if (message.type === "conversation.item.input_audio_transcription.completed") {
      const transcript = typeof message.transcript === "string" ? message.transcript.trim() : "";
      if (!transcript || !state.cartesiaSocket) return;
      void streamOpenAIReplyToCartesia(state, transcript).catch((error) => console.error("stream reply failed", error));
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

  twilioSocket.on("message", (data) => {
    const message = safeJson(data.toString());
    if (!message) return;

    if (message.event === "start") {
      state.streamSid = message.start?.streamSid ?? message.streamSid ?? null;
      state.callAttemptId = message.start?.customParameters?.callAttemptId ?? null;
      void loadCallSession(state.callAttemptId)
        .then((session) => {
          state.memberName = session.callAttempt.member.name;
          state.turns = session.turns;
          state.cartesiaConfig = session.cartesiaConfig;
          state.initialPrompt = session.initialPrompt;
          state.instructions = session.instructions;
          console.log("Cartesia stream bridge started", {
            callAttemptId: state.callAttemptId,
            streamSid: state.streamSid,
            modelId: state.cartesiaConfig.modelId,
            voiceId: state.cartesiaConfig.voiceId,
          });

          const opener =
            state.initialPrompt ||
            `Hi ${state.memberName}, it is your scheduled check-in call from DailyCall. Is there anything I can help you with, or anything you would like to chat about?`;
          state.turns.push({ speaker: "DailyCall", text: opener });
          state.cartesiaContextId = randomUUID();
          sendCartesiaText(cartesiaSocket, state, opener, true);
          void persistTurnState(state).catch((error) => console.error("persist opener failed", error));
        })
        .catch((error) => {
          console.error("failed to load Cartesia stream session", error);
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
    if (cartesiaSocket.readyState === WebSocket.OPEN) cartesiaSocket.close();
  });

  twilioSocket.on("error", (error) => console.error("Twilio stream socket error", error));
  openAISocket.on("error", (error) => console.error("OpenAI transcription socket error", error));
  cartesiaSocket.on("error", (error) => console.error("Cartesia TTS socket error", error));
}

await app.prepare();

const server = http.createServer((request, response) => {
  if (request.url === "/api/cartesia-test/stream-health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "dailycall-cartesia-streaming-server" }));
    return;
  }

  handle(request, response);
});
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname !== "/api/cartesia-test/stream") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wireBridge(ws);
  });
});

server.listen(port, hostname, () => {
  console.log(`DailyCall Next + Cartesia streaming bridge listening on http://${hostname}:${port}`);
  console.log(`Cartesia bridge WebSocket path: ws://${hostname}:${port}/api/cartesia-test/stream`);
});
