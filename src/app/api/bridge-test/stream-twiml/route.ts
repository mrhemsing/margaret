import { NextResponse } from "next/server";

import { getPublicBaseUrl } from "@/lib/cartesia-test-call";

export const dynamic = "force-dynamic";

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function twiml(xml: string, status = 200) {
  return new NextResponse(xml, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getWebSocketBaseUrl() {
  const explicit = process.env.ELEVENLABS_STREAM_BRIDGE_WS_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  return getPublicBaseUrl().replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const callAttemptId = url.searchParams.get("callAttemptId") ?? "";

  if (!callAttemptId) {
    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Hangup /></Response>", 400);
  }

  const streamUrl = `${getWebSocketBaseUrl()}/api/bridge-test/stream`;

  return twiml(
    [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<Response>",
      "<Connect>",
      `<Stream url="${xmlEscape(streamUrl)}">`,
      `<Parameter name="callAttemptId" value="${xmlEscape(callAttemptId)}" />`,
      "</Stream>",
      "</Connect>",
      "</Response>",
    ].join(""),
  );
}
