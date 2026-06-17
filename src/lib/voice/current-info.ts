import type { BriefingItem, CurrentInfoSnapshot, Prisma, PrismaClient } from "@prisma/client";

import { matchesBriefingAvoids, refreshBriefingItemsFromSnapshots } from "@/lib/voice/briefing-digest";

const REQUEST_TIMEOUT_MS = 4000;
const NHL_CACHE_KEY = "sports:nhl:league";
const WEATHER_CACHE_KEY = "weather:blaine-wa";
const NEWS_CACHE_KEY = "news:science-light:npr";
const DAYFACT_CACHE_KEY = "dayfact:today";
const NHL_CACHE_TTL_MS = 8 * 60 * 60 * 1000;
const SPORTS_CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const WEATHER_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const NEWS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DAYFACT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NPR_SCIENCE_RSS_URL = "https://feeds.npr.org/1007/rss.xml";
const BBC_NEWS_RSS_URL = "https://feeds.bbci.co.uk/news/rss.xml";

type SportsLeagueConfig = {
  key: string;
  label: string;
  sport: string;
  league: string;
  tags: string[];
};

const sportsLeagueConfigs: SportsLeagueConfig[] = [
  { key: "sports:mlb:league", label: "MLB", sport: "baseball", league: "mlb", tags: ["baseball", "mlb"] },
  { key: "sports:nba:league", label: "NBA", sport: "basketball", league: "nba", tags: ["basketball", "nba"] },
  { key: "sports:nfl:league", label: "NFL", sport: "football", league: "nfl", tags: ["football", "nfl"] },
];

type EspnScoreboard = {
  events?: Array<{
    name?: string;
    shortName?: string;
    date?: string;
    status?: { type?: { completed?: boolean; name?: string; shortDetail?: string; detail?: string } };
    competitions?: Array<{
      competitors?: Array<{
        homeAway?: "home" | "away";
        score?: string;
        team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string };
      }>;
    }>;
  }>;
};

type NhlTeam = { abbreviation: string; name: string };

type NhlGame = {
  id?: number;
  gameDate: string;
  startTimeUTC?: string;
  gameState: string;
  gameType?: number;
  awayTeam: {
    id?: number;
    abbrev: string;
    score?: number;
    placeName?: { default: string };
    commonName?: { default: string };
  };
  homeTeam: {
    id?: number;
    abbrev: string;
    score?: number;
    placeName?: { default: string };
    commonName?: { default: string };
  };
  seriesStatus?: {
    round?: number;
    seriesAbbrev?: string;
    seriesTitle?: string;
    gameNumberOfSeries?: number;
    neededToWin?: number;
    topSeedTeamAbbrev?: string;
    topSeedWins?: number;
    bottomSeedTeamAbbrev?: string;
    bottomSeedWins?: number;
  };
};

type NhlPlayoffBracket = {
  series?: Array<{
    seriesTitle?: string;
    seriesAbbrev?: string;
    playoffRound?: number;
    topSeedWins?: number;
    bottomSeedWins?: number;
    winningTeamId?: number;
    topSeedTeam?: { id?: number; abbrev?: string; name?: { default?: string } };
    bottomSeedTeam?: { id?: number; abbrev?: string; name?: { default?: string } };
  }>;
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

function getSeason(date: Date) {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
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
    parts.push(`Recent ${team.name} game: ${formatNhlGame(completed)}.`);
  }

  if (upcoming) {
    parts.push(`Next ${team.name} game: ${formatNhlGame(upcoming)}.`);
  }

  if (!parts.length) {
    const champion = await buildNhlChampionInfo(now);
    if (champion && champion.teamAbbrev === team.abbreviation) {
      parts.push(champion.summary);
    }
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

function formatEspnEvent(event: NonNullable<EspnScoreboard["events"]>[number]) {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const away = competitors.find((competitor) => competitor.homeAway === "away") ?? competitors[0];
  const home = competitors.find((competitor) => competitor.homeAway === "home") ?? competitors[1];
  const awayName = away?.team?.shortDisplayName ?? away?.team?.abbreviation ?? "Away";
  const homeName = home?.team?.shortDisplayName ?? home?.team?.abbreviation ?? "Home";
  const date = event.date ? new Date(event.date) : null;
  const dateText = date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
    : "";

  if (event.status?.type?.completed) {
    return `${awayName} ${away?.score ?? ""} at ${homeName} ${home?.score ?? ""}${dateText ? ` on ${dateText}` : ""}`;
  }

  const timeText = date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(date)
    : event.status?.type?.shortDetail ?? "";

  return `${awayName} at ${homeName}${timeText ? `, ${timeText}` : ""}`;
}

async function buildEspnLeagueInfo(config: SportsLeagueConfig, now = new Date()) {
  const url = new URL(`https://site.api.espn.com/apis/site/v2/sports/${config.sport}/${config.league}/scoreboard`);
  const payload = await fetchJson<EspnScoreboard>(url);
  const events = payload?.events ?? [];
  const datedEvents = events
    .map((event) => ({ event, date: event.date ? new Date(event.date) : null }))
    .filter((item) => item.date && Number.isFinite(item.date.getTime()));
  const completed = [...datedEvents]
    .filter((item) => item.event.status?.type?.completed)
    .sort((left, right) => (right.date?.getTime() ?? 0) - (left.date?.getTime() ?? 0))
    .slice(0, 2);
  const upcoming = datedEvents
    .filter((item) => !item.event.status?.type?.completed && (item.date?.getTime() ?? 0) >= now.getTime() - 2 * 60 * 60 * 1000)
    .sort((left, right) => (left.date?.getTime() ?? 0) - (right.date?.getTime() ?? 0))
    .slice(0, 2);
  const parts = [
    ...upcoming.map((item) => `Upcoming ${config.label}: ${formatEspnEvent(item.event)}.`),
    ...completed.map((item) => `Recent ${config.label}: ${formatEspnEvent(item.event)}.`),
  ];

  return {
    ok: parts.length > 0,
    topic: "sports",
    league: config.label,
    tags: config.tags,
    summary: parts.length
      ? `${parts.join(" ")} Keep it conversational and brief. Mention only if the person asks or the sport fits their interests.`
      : `No fresh ${config.label} scoreboard context was available. Do not guess scores or schedules.`,
  };
}

export async function refreshEspnLeagueSnapshot(prisma: PrismaClient, config: SportsLeagueConfig, now = new Date()) {
  const info = await buildEspnLeagueInfo(config, now);
  const fetchedAt = now;
  const expiresAt = new Date(fetchedAt.getTime() + SPORTS_CACHE_TTL_MS);

  return prisma.currentInfoSnapshot.upsert({
    where: { key: config.key },
    create: {
      key: config.key,
      topic: "sports",
      title: `${config.label} current context`,
      summary: info.summary,
      source: "site.api.espn.com",
      raw: info as Prisma.InputJsonValue,
      fetchedAt,
      expiresAt,
    },
    update: {
      topic: "sports",
      title: `${config.label} current context`,
      summary: info.summary,
      source: "site.api.espn.com",
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

export async function refreshDayFactCurrentInfoSnapshot(prisma: PrismaClient, now = new Date()) {
  const fetchedAt = now;
  const expiresAt = new Date(fetchedAt.getTime() + DAYFACT_CACHE_TTL_MS);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now);
  const season = getSeason(now);
  const summary = `Today is ${date}. It is ${season}. This is safe, light calendar context for a brief opener or orientation if needed.`;
  const info = { ok: true, topic: "dayfact", date, season, summary };

  return prisma.currentInfoSnapshot.upsert({
    where: { key: DAYFACT_CACHE_KEY },
    create: {
      key: DAYFACT_CACHE_KEY,
      topic: "dayfact",
      title: "Today",
      summary,
      source: "calendar",
      raw: info as Prisma.InputJsonValue,
      fetchedAt,
      expiresAt,
    },
    update: {
      topic: "dayfact",
      title: "Today",
      summary,
      source: "calendar",
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
  const tasks = [
    refreshNhlCurrentInfoSnapshot(prisma, now),
    ...sportsLeagueConfigs.map((config) => refreshEspnLeagueSnapshot(prisma, config, now)),
    refreshWeatherCurrentInfoSnapshot(prisma, now),
    refreshLightNewsCurrentInfoSnapshot(prisma, now),
    refreshDayFactCurrentInfoSnapshot(prisma, now),
  ];
  const keys = [NHL_CACHE_KEY, ...sportsLeagueConfigs.map((config) => config.key), WEATHER_CACHE_KEY, NEWS_CACHE_KEY, DAYFACT_CACHE_KEY];
  const results = await Promise.allSettled(tasks);
  const snapshots = results
    .filter((result): result is PromiseFulfilledResult<CurrentInfoSnapshot> => result.status === "fulfilled")
    .map((result) => result.value);
  const briefing = await refreshBriefingItemsFromSnapshots(prisma, snapshots, now);

  return [
    ...results.map((result, index) => ({
      key: keys[index],
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

  if (!parts.length) {
    const champion = await buildNhlChampionInfo(now);
    if (champion) {
      parts.push(champion.summary);
    }
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

function playoffBracketYear(now: Date) {
  const month = now.getMonth();
  return month >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

async function buildNhlChampionInfo(now: Date) {
  const url = new URL(`https://api-web.nhle.com/v1/playoff-bracket/${playoffBracketYear(now)}`);
  const bracket = await fetchJson<NhlPlayoffBracket>(url);
  const finalSeries = (bracket?.series ?? []).find((series) =>
    series.playoffRound === 4 ||
    series.seriesAbbrev === "SCF" ||
    /\bStanley Cup Final\b/i.test(series.seriesTitle ?? ""),
  );

  if (!finalSeries?.winningTeamId) return null;

  const winningTeam = [finalSeries.topSeedTeam, finalSeries.bottomSeedTeam].find((team) => team?.id === finalSeries.winningTeamId);
  const losingTeam = [finalSeries.topSeedTeam, finalSeries.bottomSeedTeam].find((team) => team?.id !== finalSeries.winningTeamId);
  const winnerName = winningTeam?.name?.default ?? winningTeam?.abbrev;
  const loserName = losingTeam?.name?.default ?? losingTeam?.abbrev;
  const winnerWins = winningTeam?.id === finalSeries.topSeedTeam?.id ? finalSeries.topSeedWins : finalSeries.bottomSeedWins;
  const loserWins = winningTeam?.id === finalSeries.topSeedTeam?.id ? finalSeries.bottomSeedWins : finalSeries.topSeedWins;

  if (!winnerName) return null;

  return {
    teamAbbrev: winningTeam?.abbrev ?? "",
    summary: `${winnerName} won the Stanley Cup${loserName ? ` over ${loserName}` : ""}${winnerWins !== undefined && loserWins !== undefined ? `, ${winnerWins}-${loserWins}` : ""}.`,
  };
}

async function buildLightNewsInfo() {
  const feeds = await Promise.all([
    fetchText(NPR_SCIENCE_RSS_URL).then((xml) => ({ source: "NPR science RSS", xml })),
    fetchText(BBC_NEWS_RSS_URL).then((xml) => ({ source: "BBC RSS", xml })),
  ]);
  const titles = Array.from(
    new Set(
      feeds
        .flatMap((feed) => feed.xml ? parseRssTitles(feed.xml).map((title) => ({ title, source: feed.source })) : [])
        .filter((item) => isSafeLightNewsTitle(item.title))
        .map((item) => item.title)
        .slice(0, 5),
    ),
  );

  return {
    ok: titles.length > 0,
    topic: "news",
    source: "NPR science RSS + BBC RSS",
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
    const championship = formatCompletedNhlChampionship(game);
    if (championship) return championship;

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

function formatCompletedNhlChampionship(game: NhlGame) {
  const series = game.seriesStatus;
  if (!series || game.gameType !== 3) return null;

  const neededToWin = series.neededToWin ?? 4;
  const isFinal = series.round === 4 || series.seriesAbbrev === "SCF" || /\bStanley Cup Final\b/i.test(series.seriesTitle ?? "");
  const winnerAbbrev =
    (series.topSeedWins ?? 0) >= neededToWin
      ? series.topSeedTeamAbbrev
      : (series.bottomSeedWins ?? 0) >= neededToWin
        ? series.bottomSeedTeamAbbrev
        : null;

  if (!winnerAbbrev) return null;

  const winner = [game.awayTeam, game.homeTeam].find((team) => team.abbrev === winnerAbbrev);
  const loser = [game.awayTeam, game.homeTeam].find((team) => team.abbrev !== winnerAbbrev);
  const winnerName = winner ? teamLabel(winner) : winnerAbbrev;
  const loserName = loser ? teamLabel(loser) : null;
  const score = `${game.awayTeam.abbrev} ${game.awayTeam.score ?? ""} - ${game.homeTeam.abbrev} ${game.homeTeam.score ?? ""}`;

  if (isFinal) {
    const gameText = series.gameNumberOfSeries ? ` in Game ${series.gameNumberOfSeries}` : "";
    return `${winnerName} won the Stanley Cup${loserName ? ` over ${loserName}` : ""}${gameText} on ${game.gameDate}, ${score}`;
  }

  return `${winnerName} clinched the ${series.seriesTitle ?? "playoff series"}${loserName ? ` over ${loserName}` : ""} on ${game.gameDate}, ${score}`;
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
