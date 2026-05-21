import http from "node:http";
import { WebSocketServer } from "ws";

const port = Number(process.env.STREAMING_BRIDGE_PORT || 3010);

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function summarizeTwilioEvent(message) {
  switch (message?.event) {
    case "start":
      return {
        event: "start",
        streamSid: message.start?.streamSid,
        callSid: message.start?.callSid,
        tracks: message.start?.tracks,
        mediaFormat: message.start?.mediaFormat,
      };
    case "media":
      return {
        event: "media",
        streamSid: message.streamSid,
        track: message.media?.track,
        chunk: message.media?.chunk,
        timestamp: message.media?.timestamp,
        payloadBytes: message.media?.payload ? Buffer.byteLength(message.media.payload, "base64") : 0,
      };
    case "mark":
      return {
        event: "mark",
        streamSid: message.streamSid,
        name: message.mark?.name,
      };
    case "stop":
      return {
        event: "stop",
        streamSid: message.streamSid,
        callSid: message.stop?.callSid,
      };
    default:
      return { event: message?.event ?? "unknown" };
  }
}

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "dailycall-streaming-bridge-prototype" }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: false, error: "not found" }));
});

const wss = new WebSocketServer({ server, path: "/twilio/media" });

wss.on("connection", (socket, request) => {
  const connectedAt = Date.now();
  let mediaFrames = 0;
  let lastMediaAt = null;

  console.log("bridge websocket connected", {
    remoteAddress: request.socket.remoteAddress,
    url: request.url,
  });

  socket.on("message", (data) => {
    const message = safeJson(data.toString());
    const summary = summarizeTwilioEvent(message);

    if (summary.event === "media") {
      mediaFrames += 1;
      lastMediaAt = Date.now();
      if (mediaFrames % 50 !== 0) return;
    }

    console.log("bridge twilio event", {
      ...summary,
      mediaFrames,
      elapsedMs: Date.now() - connectedAt,
      sinceLastMediaMs: lastMediaAt ? Date.now() - lastMediaAt : null,
    });
  });

  socket.on("close", (code, reason) => {
    console.log("bridge websocket closed", {
      code,
      reason: reason.toString(),
      mediaFrames,
      elapsedMs: Date.now() - connectedAt,
    });
  });

  socket.on("error", (error) => {
    console.error("bridge websocket error", error);
  });
});

server.listen(port, () => {
  console.log(`DailyCall streaming bridge prototype listening on http://localhost:${port}`);
  console.log(`Twilio media WebSocket path: ws://localhost:${port}/twilio/media`);
});
