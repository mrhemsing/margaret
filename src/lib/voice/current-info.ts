import type { BriefingItem, CurrentInfoSnapshot, Prisma, PrismaClient } from "@prisma/client";

import { matchesBriefingAvoids, refreshBriefingItemsFromSnapshots } from "@/lib/voice/briefing-digest";

const REQUEST_TIMEOUT_MS = 4000;
const NHL_CACHE_KEY = "sports:nhl:league";
const WEATHER_CACHE_KEY = "weather:blaine-wa";
const NEWS_CACHE_KEY = "news:science-light:npr";
const NHL_CACHE_TTL_MS = 8 * 60 * 60 * 1000;
const WEATHER_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const NEWS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const NPR_SCIENCE_RSS_URL = "https://feeds.npr.org/1007/rss.xml";

type NhlTeam = { abbreviation: string; name: string };

type NhlGame = {
  gameDate: string;
  startTimeUTC?: string;
  gameState: string;
  gameType?: number;
  awayTeam: {
    abbrev: string;
    score?: number;
    placeName?: { default: string };
    commonName?: { default: string };
  };
  homeTeam: {
    abbrev: string;
    score?: number;
    placeName?: { default: string };
    commonName?: { default: string };
  };
  seriesStatus?: {
    seriesTitle?: string;
    gameNumberOfSeries?: number;
    topSeedTeamAbbrev?: string;
    topSeedWins?: number;
    bottomSeedTeamAbbrev?: string;
    bottomSeedWins?: number;
  };
};

const nhlTeams: Record<string, NhlTeam> = {
  avalanche: { abbreviation: "COL", name: "Colorado Avalanche" },
  avs: { abbreviation: "COL", name: "Colorado Avalanche" },
  boston: { abbreviation: "BOS", name: "Boston Bruins" },
  bruins: { abbreviation: "BOS", name: "Boston Bruins" },
  buffalo: { abbreviation: "BUF", name: "Buffalo Sabres" },
  sabres: { abbreviation: "BUF", name: "Buffalo Sabres" },
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
  hurricanes: { abbreviation: "CAR", name: "Carolina Hurricanes" },
  carolina: { abbreviation: "CAR", name: "Carolina Hurricanes" },
  panthers: { abbreviation: "FLA", name: "Florida Panthers" },
  florida: { abbreviation: "FLA", name: "Florida Panthers" },
  rangers: { abbreviation: "NYR", name: "New York Rangers" },
  vegas: { abbreviation: "VGK", name: "Vegas Golden Knights" },
  goldenknights: { abbreviation: "VGK", name: "Vegas Golden Knights" },
  knights: { abbreviation: "VGK", name: "Vegas Golden Knights" },
  senators: { abbreviation: "OTT", name: "Ottawa Senators" },
  ottawa: { abbreviation: "OTT", name: "Ottawa Senators" },
};

export function normalizeCurrentInfoQuery(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fetchJson<T>(url: URL) {
  return fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null) as Promise<T | null>;
}

function fetchText(url: string) {
  return fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    .then((response) => (response.ok ? response.text() : null))
    .catch(() => null);
}

export async function getWeatherInfo(query: string) {
  const location = cleanWeatherLocation(query) ?? { name: "Blaine", region: "Washington", label: "Blaine, Washington" };
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", location.name);
  geoUrl.searchParams.set("count", "5");
  geoUrl.searchParams.set("language", "en");
  geoUrl.searchParams.set("format", "json");

  const geo = await fetchJson<{
    results?: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number }>;
  }>(geoUrl);
  const place = selectWeatherPlace(geo?.results ?? [], location.region);

  if (!place) {
    return {
      ok: false,
      topic: "weather",
      summary: `I could not find weather for ${location.label}. Ask one gentle follow-up if location matters.`,
    };
  }

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(place.latitude));
  weatherUrl.searchParams.set("longitude", String(place.longitude));
  weatherUrl.searchParams.set("current", "temperature_2m,precipitation,weather_code,wind_speed_10m");
  weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
  weatherUrl.searchParams.set("wind_speed_unit", "mph");
  weatherUrl.searchParams.set("precipitation_unit", "inch");

  const weather = await fetchJson<{
    current?: { temperature_2m?: number; precipitation?: number; wind_speed_10m?: number };
  }>(weatherUrl);
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

function cleanWeatherLocation(query: string) {
  const clean = query
    .replace(/\b(weather|forecast|temperature|today|current|right now)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  const [namePart, ...regionParts] = clean.split(",").map((part) => part.trim()).filter(Boolean);
  const region = regionParts.join(" ");

  if (region) return { name: namePart, region, label: clean };

  const stateMatch = clean.match(/\b(washington|wa|british columbia|bc|california|ca|oregon|or)\b/i);
  return {
    name: stateMatch ? clean.slice(0, stateMatch.index).trim() || clean : clean,
    region: stateMatch?.[0] ?? "",
    label: clean,
  };
}

function selectWeatherPlace(
  places: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number }>,
  region: string,
) {
  if (!places.length) return null;
  if (!region) return places[0];

  const normalizedRegion = normalizeCurrentInfoQuery(region);
  return (
    places.find((place) =>
      [place.admin1, place.country]
        .filter(Boolean)
        .some((value) => normalizeCurrentInfoQuery(value ?? "").includes(normalizedRegion) || normalizedRegion.includes(normalizeCurrentInfoQuery(value ?? ""))),
    ) ?? places[0]
  );
}

export async function buildNhlInfo(query = "", now = new Date()) {
  const key = normalizeCurrentInfoQuery(query);
  const team = Object.entries(nhlTeams).find(([name]) => key.includes(name))?.[1] ?? null;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 10);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 10);

  if (!team) return getLeagueNhlInfo(now, startDate, endDate);

  const url = new URL(`https://api-web.nhle.com/v1/club-schedule/${team.abbreviation}/week/${isoDate(startDate)}`);
  const payload = await fetchJson<{ games?: NhlGame[] }>(url);
  const games = (payload?.games ?? []).filter((game) => game.gameDate >= isoDate(startDate) && game.gameDate <= isoDate(endDate));
  const completed = [...games].filter(isCompletedGame).pop();
  const upcoming = games.find((game) => !isCompletedGame(game) && game.gameDate >= isoDate(now));
  const parts = [];

  if (completed) {
    parts.push(
      `Recent ${team.name} game: ${completed.awayTeam.abbrev} ${completed.awayTeam.score ?? ""} at ${completed.homeTeam.abbrev} ${completed.homeTeam.score ?? ""} on ${completed.gameDate}.`,
    );
  }

  if (upcoming) {
    parts.push(`Next ${team.name} game: ${formatNhlGame(upcoming)}.`);
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

export async function refreshNhlCurrentInfoSnapshot(prisma: PrismaClient, now = new Date()) {
  const info = await buildNhlInfo("", now);
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + NHL_CACHE_TTL_MS);

  return prisma.currentInfoSnapshot.upsert({
    where: { key: NHL_CACHE_KEY },
    create: {
      key: NHL_CACHE_KEY,
      topic: "sports",
      title: "NHL current context",
      summary: info.summary,
      source: "api-web.nhle.com",
      raw: info as Prisma.InputJsonValue,
      fetchedAt,
      expiresAt,
    },
    update: {
      topic: "sports",
      title: "NHL current context",
      summary: info.summary,
      source: "api-web.nhle.com",
      raw: info as Prisma.InputJsonValue,
      fetchedAt,
      expiresAt,
    },
  });
}

export async function refreshWeatherCurrentInfoSnapshot(prisma: PrismaClient, now = new Date()) {
  const info = await getWeatherInfo("Blaine, Washington");
  const fetchedAt = now;
  const expiresAt = new Date(fetchedAt.getTime() + WEATHER_CACHE_TTL_MS);

  return prisma.currentInfoSnapshot.upsert({
    where: { key: WEATHER_CACHE_KEY },
    create: {
      key: WEATHER_CACHE_KEY,
      topic: "weather",
      title: "Blaine weather",
      summary: info.summary,
      source: "open-meteo.com",
      raw: info as Prisma.InputJsonValue,
      fetchedAt,
      expiresAt,
    },
    update: {
      topic: "weather",
      title: "Blaine weather",
      summary: info.summary,
      source: "open-meteo.com",
      raw: info as Prisma.InputJsonValue,
      fetchedAt,
      expiresAt,
    },
  });
}

export async function refreshLightNewsCurrentInfoSnapshot(prisma: PrismaClient, now = new Date()) {
  const info = await buildLightNewsInfo();
  const fetchedAt = now;
  const expiresAt = new Date(fetchedAt.getTime() + NEWS_CACHE_TTL_MS);

  return prisma.currentInfoSnapshot.upsert({
    where: { key: NEWS_CACHE_KEY },
    create: {
      key: NEWS_CACHE_KEY,
      topic: "news",
      title: "Light science news",
      summary: info.summary,
      source: "feeds.npr.org/1007/rss.xml",
      raw: info as Prisma.InputJsonValue,
      fetchedAt,
      expiresAt,
    },
    update: {
      topic: "news",
      title: "Light science news",
      summary: info.summary,
      source: "feeds.npr.org/1007/rss.xml",
      raw: info as Prisma.InputJsonValue,
      fetchedAt,
      expiresAt,
    },
  });
}

export async function refreshCallCurrentInfoSnapshots(prisma: PrismaClient, now = new Date()) {
  const results = await Promise.allSettled([
    refreshNhlCurrentInfoSnapshot(prisma, now),
    refreshWeatherCurrentInfoSnapshot(prisma, now),
    refreshLightNewsCurrentInfoSnapshot(prisma, now),
  ]);
  const snapshots = results
    .filter((result): result is PromiseFulfilledResult<CurrentInfoSnapshot> => result.status === "fulfilled")
    .map((result) => result.value);
  const briefing = await refreshBriefingItemsFromSnapshots(prisma, snapshots, now);

  return [
    ...results.map((result, index) => ({
      key: [NHL_CACHE_KEY, WEATHER_CACHE_KEY, NEWS_CACHE_KEY][index],
      ok: result.status === "fulfilled",
      snapshot: result.status === "fulfilled" ? result.value : null,
      fetchedAt: result.status === "fulfilled" ? result.value.fetchedAt : null,
      expiresAt: result.status === "fulfilled" ? result.value.expiresAt : null,
      summary: result.status === "fulfilled" ? result.value.summary : null,
      error: result.status === "rejected" ? result.reason instanceof Error ? result.reason.message : "Unknown refresh error" : null,
    })),
    {
      key: "briefing:items",
      ok: briefing.ok,
      snapshot: null,
      fetchedAt: briefing.fetchedAt,
      expiresAt: briefing.expiresAt,
      summary: `${briefing.count} briefing items refreshed via ${briefing.source}.`,
      error: null,
    },
  ];
}

export async function getCachedNhlCurrentInfo(prisma: PrismaClient, now = new Date()) {
  const snapshot = await prisma.currentInfoSnapshot.findUnique({ where: { key: NHL_CACHE_KEY } });

  if (!snapshot) return null;
  if (snapshot.expiresAt < now) return null;

  return snapshotToCurrentInfo(snapshot);
}

export async function getLatestNhlCurrentInfo(prisma: PrismaClient) {
  const snapshot = await prisma.currentInfoSnapshot.findUnique({ where: { key: NHL_CACHE_KEY } });
  return snapshot ? snapshotToCurrentInfo(snapshot) : null;
}

export async function getCachedCallCurrentContext(prisma: PrismaClient, now = new Date()) {
  const snapshots = await prisma.currentInfoSnapshot.findMany({
    where: {
      key: { in: [WEATHER_CACHE_KEY, NHL_CACHE_KEY, NEWS_CACHE_KEY] },
      expiresAt: { gt: now },
    },
    orderBy: [{ topic: "asc" }, { fetchedAt: "desc" }],
  });
  const byKey = new Map(snapshots.map((snapshot) => [snapshot.key, snapshot]));
  const parts = [
    byKey.get(WEATHER_CACHE_KEY) ? `Weather snapshot: ${byKey.get(WEATHER_CACHE_KEY)?.summary}` : null,
    byKey.get(NHL_CACHE_KEY) ? `Sports snapshot: ${byKey.get(NHL_CACHE_KEY)?.summary}` : null,
    byKey.get(NEWS_CACHE_KEY) ? `Light news snapshot: ${byKey.get(NEWS_CACHE_KEY)?.summary}` : null,
  ].filter(Boolean);

  if (!parts.length) {
    return "No fresh preloaded weather, sports, or light-news snapshot is available. Keep the conversation moving and do not invent current facts.";
  }

  return [
    "Preloaded current context for this call. Use only if it naturally fits or the person asks; never perform a live lookup during the call.",
    ...parts,
  ].join("\n");
}

type CallBriefingMemory = {
  hobbies?: string[] | null;
  interestTags?: string[] | null;
  conversationAvoids?: string[] | null;
};

type CallBriefingInput = {
  memberId?: string | null;
  memory?: CallBriefingMemory | null;
  now?: Date;
  maxWords?: number;
};

function normalizedInterestText(memory?: CallBriefingMemory | null) {
  return [...(memory?.interestTags ?? []), ...(memory?.hobbies ?? [])].map(normalizeCurrentInfoQuery).filter(Boolean).join(" ");
}

function isInterestMatch(item: Pick<BriefingItem, "interestTags" | "category">, interestText: string) {
  if (!interestText) return false;
  if (["weather", "dayfact", "seasonal"].includes(item.category)) return false;

  return item.interestTags.some((tag) => {
    const normalizedTag = normalizeCurrentInfoQuery(tag);
    return normalizedTag.length > 2 && (interestText.includes(normalizedTag) || normalizedTag.includes(interestText));
  });
}

function dedupeBriefingItems(items: BriefingItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeCurrentInfoQuery(item.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function capBriefingWords(lines: string[], maxWords: number) {
  const selected: string[] = [];
  let count = 0;

  for (const line of lines) {
    const words = line.split(/\s+/).filter(Boolean).length;
    if (selected.length && count + words > maxWords) break;
    selected.push(line);
    count += words;
  }

  return selected;
}

export async function getCallBriefing(prisma: PrismaClient, input: CallBriefingInput = {}) {
  const now = input.now ?? new Date();
  const memberTag = input.memberId ? `member:${input.memberId}` : null;
  const items = await prisma.briefingItem.findMany({
    where: { expiresAt: { gt: now } },
    orderBy: [{ priority: "desc" }, { fetchedAt: "desc" }],
    take: 80,
  });

  if (!items.length) {
    return getCachedCallCurrentContext(prisma, now);
  }

  const avoids = input.memory?.conversationAvoids ?? [];
  const safeItems = dedupeBriefingItems(items)
    .filter((item) => !item.interestTags.some((tag) => tag.startsWith("member:") && tag !== memberTag))
    .filter((item) => !matchesBriefingAvoids(item, avoids));
  const interestText = normalizedInterestText(input.memory);
  const memberScoped = memberTag ? safeItems.filter((item) => item.interestTags.includes(memberTag)).slice(0, 1) : [];
  const general = safeItems
    .filter((item) => !memberScoped.some((memberItem) => memberItem.id === item.id) && item.interestTags.includes("general"))
    .slice(0, 3);
  const matched = safeItems
    .filter((item) =>
      !memberScoped.some((memberItem) => memberItem.id === item.id) &&
      !general.some((generalItem) => generalItem.id === item.id) &&
      isInterestMatch(item, interestText),
    )
    .slice(0, 3);
  const selected = [...memberScoped, ...general, ...matched];

  if (!selected.length) {
    return getCachedCallCurrentContext(prisma, now);
  }

  const lines = capBriefingWords(selected.map((item) => `- ${item.text}`), input.maxWords ?? 190);

  return [
    "Preloaded current context for this call. Use at most one item only if it naturally fits or the person asks; never perform a live lookup during the call.",
    ...lines,
    "If asked about something not listed here, say you have not seen that yet and ask what they heard. Do not invent current facts.",
  ].join("\n");
}

function summarizeWeatherForBriefing(summary: string) {
  return summary
    .replace(/Mention naturally[\s\S]*$/i, "")
    .replace(/Ask one gentle[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function refreshMemberWeatherBriefing(
  prisma: PrismaClient,
  member: { id: string; name: string; weatherLocation?: string | null; timezone?: string | null },
  now = new Date(),
) {
  const location = member.weatherLocation?.trim();
  if (!location) return { ok: false, skipped: true, reason: "missing_weather_location" };

  const info = await getWeatherInfo(location);
  const fetchedAt = now;
  const expiresAt = new Date(fetchedAt.getTime() + WEATHER_CACHE_TTL_MS);
  const snapshotKey = `weather:member:${member.id}`;
  const source = `member-weather:${member.id}`;
  const summary = info.summary;
  const briefingText = info.ok ? summarizeWeatherForBriefing(summary) : "";

  await prisma.$transaction([
    prisma.currentInfoSnapshot.upsert({
      where: { key: snapshotKey },
      create: {
        key: snapshotKey,
        topic: "weather",
        title: `${member.name} local weather`,
        summary,
        source: "open-meteo.com",
        raw: info as Prisma.InputJsonValue,
        fetchedAt,
        expiresAt,
      },
      update: {
        topic: "weather",
        title: `${member.name} local weather`,
        summary,
        source: "open-meteo.com",
        raw: info as Prisma.InputJsonValue,
        fetchedAt,
        expiresAt,
      },
    }),
    prisma.briefingItem.deleteMany({ where: { source } }),
    ...(briefingText
      ? [
          prisma.briefingItem.create({
            data: {
              category: "weather",
              interestTags: ["general", "weather", `member:${member.id}`],
              text: briefingText,
              tone: "neutral",
              priority: 10,
              source,
              fetchedAt,
              expiresAt,
            },
          }),
        ]
      : []),
  ]);

  return { ok: true, skipped: false, location, fetchedAt, expiresAt };
}

function snapshotToCurrentInfo(snapshot: CurrentInfoSnapshot) {
  return {
    ok: true,
    topic: snapshot.topic,
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt.toISOString(),
    expiresAt: snapshot.expiresAt.toISOString(),
    summary: snapshot.summary,
  };
}

async function getLeagueNhlInfo(now: Date, startDate: Date, endDate: Date) {
  const urls = [startDate, now].map((date) => new URL(`https://api-web.nhle.com/v1/schedule/${isoDate(date)}`));
  const schedules = await Promise.all(urls.map((url) => fetchJson<{ gameWeek?: Array<{ date: string; games?: NhlGame[] }> }>(url)));
  const games = Array.from(
    new Map(
      schedules
        .flatMap((schedule) => schedule?.gameWeek ?? [])
        .flatMap((day) => (day.games ?? []).map((game) => ({ ...game, gameDate: game.gameDate ?? day.date })))
        .filter((game) => game.gameDate >= isoDate(startDate) && game.gameDate <= isoDate(endDate))
        .map((game) => [`${game.gameDate}-${game.awayTeam.abbrev}-${game.homeTeam.abbrev}`, game]),
    ).values(),
  );
  const todayGames = games.filter((game) => game.gameDate === isoDate(now) && !isCompletedGame(game));
  const upcoming = todayGames[0] ?? games.find((game) => !isCompletedGame(game) && game.gameDate >= isoDate(now));
  const completed = [...games].filter(isCompletedGame).pop();
  const parts = [];

  if (upcoming) {
    parts.push(`${upcoming.gameDate === isoDate(now) ? "Tonight's NHL game" : "Next NHL game"}: ${formatNhlGame(upcoming)}.`);
  }

  if (completed) {
    parts.push(`Recent NHL game: ${formatNhlGame(completed)}.`);
  }

  return {
    ok: parts.length > 0,
    topic: "sports",
    league: "NHL",
    summary: parts.length
      ? `${parts.join(" ")} Keep it conversational and brief. If the senior sounds interested, ask one simple follow-up.`
      : "No current NHL schedule context was available. Do not guess scores or game dates.",
  };
}

async function buildLightNewsInfo() {
  const xml = await fetchText(NPR_SCIENCE_RSS_URL);
  const titles = xml ? parseRssTitles(xml).filter(isSafeLightNewsTitle).slice(0, 3) : [];

  return {
    ok: titles.length > 0,
    topic: "news",
    source: "NPR science RSS",
    summary: titles.length
      ? `Light science headlines: ${titles.join("; ")}. Mention briefly only if the senior asks about news or seems interested in light current events. Avoid politics, disasters, medical advice, or upsetting details.`
      : "No light news snapshot is available. Do not invent headlines.",
  };
}

function parseRssTitles(xml: string) {
  const itemMatches = Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi));

  return itemMatches
    .map((item) => item[0].match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i))
    .map((match) => decodeXmlEntities((match?.[1] ?? match?.[2] ?? "").trim()))
    .filter(Boolean);
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function isSafeLightNewsTitle(title: string) {
  return !/\b(ebola|war|killed|dead|death|murder|shooting|abuse|disaster|hurricane|earthquake|politic|election|trump|biden|court|lawsuit|damaged|disease|lung|cancer|outbreak)\b/i.test(title);
}

function isCompletedGame(game: NhlGame) {
  return game.gameState === "OFF" || game.gameState === "FINAL";
}

function formatNhlGame(game: NhlGame) {
  const matchup = `${teamLabel(game.awayTeam)} at ${teamLabel(game.homeTeam)}`;

  if (isCompletedGame(game)) {
    return `${matchup}, ${game.awayTeam.abbrev} ${game.awayTeam.score ?? ""} - ${game.homeTeam.abbrev} ${game.homeTeam.score ?? ""} on ${game.gameDate}`;
  }

  const series = game.seriesStatus;
  const seriesText = series?.seriesTitle
    ? `, ${series.gameNumberOfSeries ? `Game ${series.gameNumberOfSeries} of the ` : ""}${series.seriesTitle}${formatSeriesRecord(series)}`
    : game.gameType === 3
      ? ", playoff game"
      : "";
  const timeText = game.startTimeUTC ? `, starts ${formatGameTime(game.startTimeUTC)}` : "";

  return `${matchup}${seriesText}${timeText}`;
}

function teamLabel(team: NhlGame["awayTeam"]) {
  return [team.placeName?.default, team.commonName?.default].filter(Boolean).join(" ") || team.abbrev;
}

function formatSeriesRecord(series: NonNullable<NhlGame["seriesStatus"]>) {
  if (
    !series.topSeedTeamAbbrev ||
    !series.bottomSeedTeamAbbrev ||
    series.topSeedWins === undefined ||
    series.bottomSeedWins === undefined
  ) {
    return "";
  }

  if (series.topSeedWins === series.bottomSeedWins) return `, series tied ${series.topSeedWins}-${series.bottomSeedWins}`;

  const leader = series.topSeedWins > series.bottomSeedWins ? series.topSeedTeamAbbrev : series.bottomSeedTeamAbbrev;
  const wins = Math.max(series.topSeedWins, series.bottomSeedWins);
  const losses = Math.min(series.topSeedWins, series.bottomSeedWins);
  return `, ${leader} leads ${wins}-${losses}`;
}

function formatGameTime(value: string) {
  const date = new Date(value);
  const eastern = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(date);
  const pacific = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles", timeZoneName: "short" }).format(date);

  return `${eastern} / ${pacific}`;
}
