import { NextResponse } from "next/server";

import { getPublicBaseUrl, verifyCartesiaTestCallToken } from "@/lib/cartesia-test-call";

export const dynamic = "force-dynamic";

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
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

export async function POST(request: Request) {
  const url = new URL(request.url);

  try {
    const payload = verifyCartesiaTestCallToken(url.searchParams.get("token"));
    const audioUrl = new URL(`${getPublicBaseUrl()}/api/cartesia-test/audio`);
    audioUrl.searchParams.set("token", url.searchParams.get("token") ?? "");

    return twiml(
      [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<Response>",
        `<Play>${xmlEscape(audioUrl.toString())}</Play>`,
        "<Pause length=\"1\"/>",
        `<Say voice="alice">Cartesia ${xmlEscape(payload.modelId)} test complete.</Say>`,
        "<Hangup/>",
        "</Response>",
      ].join(""),
    );
  } catch (error) {
    return twiml(
      [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<Response>",
        `<Say voice="alice">${xmlEscape(error instanceof Error ? error.message : "Cartesia test call failed.")}</Say>`,
        "<Hangup/>",
        "</Response>",
      ].join(""),
      400,
    );
  }
}
