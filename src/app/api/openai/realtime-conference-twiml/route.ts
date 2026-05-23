import { NextResponse } from "next/server";

import { buildOpenAIRealtimeConferenceTwiml } from "@/lib/voice/openai-realtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const conferenceName = url.searchParams.get("conferenceName");

  if (!conferenceName) {
    return new NextResponse(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Hangup /></Response>",
      { headers: { "Content-Type": "text/xml; charset=utf-8" }, status: 400 },
    );
  }

  return new NextResponse(buildOpenAIRealtimeConferenceTwiml({ conferenceName }), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
