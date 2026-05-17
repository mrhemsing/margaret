import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const nhlTeams: Record<string, { abbreviation: string; name: string }> = {
  canadiens: { abbreviation: "MTL", name: "Montreal Canadiens" },
  montreal: { abbreviation: "MTL", name: "Montreal Canadiens" },
  habs: { abbreviation: "MTL", name: "Montreal Canadiens" },
  mapleleafs: { abbreviation: "TOR", name: "Toronto Maple Leafs" },
  leafs: { abbreviation: "TOR", name: "Toronto Maple Leafs" },
  toronto: { abbreviation: "TOR", name: "Toronto Maple Leafs" },
  canucks: { abbreviation: "VAN", name: "Vancouver Canucks" },
  vancouver: { abbreviation: "VAN", name: "Vancouver Canucks" },
  oilers: { abbreviation: "EDM", name: "Edmonton Oilers" },
  edmonton: { abbreviation: "EDM", name: "Edmonton Oilers" },
  flames: { abbreviation: "CGY", name: "Calgary Flames" },
  calgary: { abbreviation: "CGY", name: "Calgary Flames" },
  jets: { abbreviation: "WPG", name: "Winnipeg Jets" },
  winnipeg: { abbreviation: "WPG", name: "Winnipeg Jets" },
  senators: { abbreviation: "OTT", name: "Ottawa Senators" },
  ottawa: { abbreviation: "OTT", name: "Ottawa Senators" },
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function getWeather(query: string) {
  const location = query.trim() || "Blaine, Washington";
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", location);
  geoUrl.searchParams.set("count", "1");
  geoUrl.searchParams.set("language", "en");
  geoUrl.searchParams.set("format", "json");

  const geoResponse = await fetch(geoUrl, { next: { revalidate: 900 } });
  const geo = (await geoResponse.json().catch(() => null)) as {
    results?: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number }>;
  } | null;
  const place = geo?.results?.[0];

  if (!place) {
    return {
      ok: false,
      topic: "weather",
      summary: `I could not find weather for ${location}. Ask one gentle follow-up if location matters.`,
    };
  }

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(place.latitude));
  weatherUrl.searchParams.set("longitude", String(place.longitude));
  weatherUrl.searchParams.set("current", "temperature_2m,precipitation,weather_code,wind_speed_10m");
  weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
  weatherUrl.searchParams.set("wind_speed_unit", "mph");
  weatherUrl.searchParams.set("precipitation_unit", "inch");

  const weatherResponse = await fetch(weatherUrl, { next: { revalidate: 900 } });
  const weather = (await weatherResponse.json().catch(() => null)) as {
    current?: { temperature_2m?: number; precipitation?: number; wind_speed_10m?: number };
  } | null;
  const current = weather?.current;

  if (!current) {
    return {
      ok: false,
      topic: "weather",
      summary: `Weather data for ${place.name} is unavailable right now. Say that gently instead of guessing.`,
    };
  }

  const placeName = [place.name, place.admin1, place.country].filter(Boolean).join(", ");

  return {
    ok: true,
    topic: "weather",
    location: placeName,
    summary: `${placeName}: about ${Math.round(current.temperature_2m ?? 0)} degrees Fahrenheit, wind near ${Math.round(current.wind_speed_10m ?? 0)} mph, precipitation ${current.precipitation ?? 0} inches. Mention naturally only if weather fits the conversation.`,
  };
}

async function getNhlInfo(query: string) {
  const key = normalize(query);
  const team = Object.entries(nhlTeams).find(([name]) => key.includes(name))?.[1] ?? nhlTeams.canadiens;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 10);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 10);
  const url = new URL(`https://api-web.nhle.com/v1/club-schedule/${team.abbreviation}/week/${isoDate(startDate)}`);
  const response = await fetch(url, { next: { revalidate: 900 } });
  const payload = (await response.json().catch(() => null)) as {
    games?: Array<{
      gameDate: string;
      gameState: string;
      awayTeam: { abbrev: string; score?: number; placeName?: { default: string } };
      homeTeam: { abbrev: string; score?: number; placeName?: { default: string } };
    }>;
  } | null;
  const games = (payload?.games ?? []).filter((game) => game.gameDate >= isoDate(startDate) && game.gameDate <= isoDate(endDate));
  const completed = [...games].filter((game) => game.gameState === "OFF" || game.gameState === "FINAL").pop();
  const upcoming = games.find((game) => game.gameState !== "OFF" && game.gameState !== "FINAL" && game.gameDate >= isoDate(now));

  const parts = [];

  if (completed) {
    parts.push(
      `Recent ${team.name} game: ${completed.awayTeam.abbrev} ${completed.awayTeam.score ?? ""} at ${completed.homeTeam.abbrev} ${completed.homeTeam.score ?? ""} on ${completed.gameDate}.`,
    );
  }

  if (upcoming) {
    parts.push(`Next ${team.name} game: ${upcoming.awayTeam.abbrev} at ${upcoming.homeTeam.abbrev} on ${upcoming.gameDate}.`);
  }

  return {
    ok: parts.length > 0,
    topic: "sports",
    league: "NHL",
    team: team.name,
    summary: parts.length
      ? `${parts.join(" ")} Keep it conversational and brief. If the senior sounds interested, ask a simple follow-up.`
      : `No recent ${team.name} NHL schedule context was available. Do not guess scores or game dates.`,
  };
}

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
  const topic = normalize(url.searchParams.get("topic") ?? "");
  const query = url.searchParams.get("query") ?? url.searchParams.get("location") ?? url.searchParams.get("team") ?? "";

  try {
    if (topic.includes("weather")) return NextResponse.json(await getWeather(query));
    if (topic.includes("sport") || topic.includes("hockey") || topic.includes("nhl")) return NextResponse.json(await getNhlInfo(query));

    return NextResponse.json(getGeneralCurrentContext(query));
  } catch (error) {
    return NextResponse.json({
      ok: false,
      topic: topic || "current_events",
      summary: error instanceof Error ? error.message : "Live context is unavailable right now. Do not guess.",
    });
  }
}
