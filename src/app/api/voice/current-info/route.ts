import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCachedNhlCurrentInfo, getWeatherInfo, normalizeCurrentInfoQuery } from "@/lib/voice/current-info";

export const dynamic = "force-dynamic";

function getGeneralCurrentContext(query: string) {
  return {
    ok: true,
    topic: "current_events",
    summary:
      `Use current-events small talk carefully for: ${query || "sports, weather, local events, or schedules"}. Keep it light and conversational. Do not invent specific headlines, scores, disasters, or political updates. If live data is unavailable, say so naturally and ask what they have been following.`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const topic = normalizeCurrentInfoQuery(url.searchParams.get("topic") ?? "");
  const query = url.searchParams.get("query") ?? url.searchParams.get("location") ?? url.searchParams.get("team") ?? "";

  try {
    if (topic.includes("weather")) return NextResponse.json(await getWeatherInfo(query));

    if (topic.includes("sport") || topic.includes("hockey") || topic.includes("nhl")) {
      const cached = await getCachedNhlCurrentInfo(prisma);

      return NextResponse.json(
        cached ?? {
          ok: false,
          topic: "sports",
          league: "NHL",
          summary: "No fresh cached NHL context is available right now. Do not guess scores, game dates, or current events.",
        },
      );
    }

    return NextResponse.json(getGeneralCurrentContext(query));
  } catch (error) {
    return NextResponse.json({
      ok: false,
      topic: topic || "current_events",
      summary: error instanceof Error ? error.message : "Current context is unavailable right now. Do not guess.",
    });
  }
}
