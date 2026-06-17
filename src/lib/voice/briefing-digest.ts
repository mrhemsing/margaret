import type { CurrentInfoSnapshot, PrismaClient } from "@prisma/client";
import OpenAI from "openai";

import { containsBlockedTerms } from "@/lib/content-safety";

export type BriefingItemDraft = {
  category: "sports" | "news" | "entertainment" | "weather" | "dayfact" | "seasonal";
  interestTags: string[];
  text: string;
  tone: "light" | "neutral";
  priority?: number;
  source?: string | null;
};

const BRIEFING_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_BRIEFING_ITEMS = 18;
const upsettingCurrentEventPattern =
  /\b(abuse|attack|bomb|cancer|court|crime|dead|death|died|disaster|disease|earthquake|election|emergency|flood|hurricane|injur|killed|lawsuit|medical|murder|outbreak|politic|shooting|trump|violence|war)\b/i;

function cleanText(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTag(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeCompact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function compactWords(value: string, maxWords = 20) {
  const words = cleanText(value).split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? words.join(" ") : `${words.slice(0, maxWords).join(" ")}.`;
}

function isSafeBriefingText(value: string) {
  const text = cleanText(value);
  return Boolean(text) && text.length <= 180 && !containsBlockedTerms(text) && !upsettingCurrentEventPattern.test(text);
}

function sanitizeDraft(draft: BriefingItemDraft): BriefingItemDraft | null {
  const text = compactWords(draft.text);
  if (!isSafeBriefingText(text)) return null;

  const interestTags = Array.from(
    new Set(
      [...draft.interestTags, draft.category === "weather" || draft.category === "dayfact" ? "general" : ""]
        .map(normalizeTag)
        .filter(Boolean)
        .slice(0, 10),
    ),
  );

  return {
    category: draft.category,
    interestTags: interestTags.length ? interestTags : ["general"],
    text,
    tone: draft.tone === "neutral" ? "neutral" : "light",
    priority: Number.isFinite(draft.priority) ? draft.priority : 0,
    source: draft.source ?? null,
  };
}

function parseDigestJson(value: string): BriefingItemDraft[] {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { items?: unknown }).items)) return [];

  const drafts: Array<BriefingItemDraft | null> = (parsed as { items: unknown[] }).items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (
        !["sports", "news", "entertainment", "weather", "dayfact", "seasonal"].includes(String(record.category)) ||
        typeof record.text !== "string" ||
        !Array.isArray(record.interestTags)
      ) {
        return null;
      }

      return {
        category: record.category as BriefingItemDraft["category"],
        interestTags: record.interestTags.filter((tag): tag is string => typeof tag === "string"),
        text: record.text,
        tone: record.tone === "neutral" ? "neutral" : "light",
        priority: typeof record.priority === "number" ? record.priority : 0,
        source: typeof record.source === "string" ? record.source : null,
      };
    });

  return drafts.filter((item): item is BriefingItemDraft => item !== null);
}

async function digestWithOpenAI(snapshots: CurrentInfoSnapshot[]) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [
          "Turn raw current-info snapshots into short DailyCall briefing items for older adults.",
          "Only include positive or neutral items. Exclude politics, violence, death, disasters, crime, medical scares, and anything upsetting.",
          "Each item must be speakable, warm, factual, and no more than 20 words.",
          "Tag broadly useful items with general. Add interest tags such as hockey, nhl, weather, science, gardening, music, baseball, or team names when relevant.",
          "Do not use audio tags, stage directions, emotional labels, or markdown.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(
          snapshots.map((snapshot) => ({
            key: snapshot.key,
            topic: snapshot.topic,
            title: snapshot.title,
            summary: snapshot.summary,
            source: snapshot.source,
          })),
        ),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "dailycall_briefing_items",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              maxItems: MAX_BRIEFING_ITEMS,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  category: { type: "string", enum: ["sports", "news", "entertainment", "weather", "dayfact", "seasonal"] },
                  interestTags: { type: "array", items: { type: "string" }, maxItems: 10 },
                  text: { type: "string" },
                  tone: { type: "string", enum: ["light", "neutral"] },
                  priority: { type: "number" },
                  source: { type: ["string", "null"] },
                },
                required: ["category", "interestTags", "text", "tone", "priority", "source"],
              },
            },
          },
          required: ["items"],
        },
      },
    },
  });

  return parseDigestJson(response.output_text);
}

function fallbackDigest(snapshots: CurrentInfoSnapshot[], now: Date): BriefingItemDraft[] {
  const items: BriefingItemDraft[] = [];
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now);

  items.push({
    category: "dayfact",
    interestTags: ["general", "calendar"],
    text: `Today is ${date}, a simple midweek detail if they ask what day it is.`,
    tone: "light",
    priority: 1,
    source: "calendar",
  });

  for (const snapshot of snapshots) {
    if (snapshot.topic === "weather") {
      items.push({
        category: "weather",
        interestTags: ["general", "weather"],
        text: snapshot.summary.replace(/Mention naturally[\s\S]*$/i, "").trim(),
        tone: "neutral",
        priority: 4,
        source: snapshot.source,
      });
    }

    if (snapshot.topic === "sports") {
      items.push({
        category: "sports",
        interestTags: ["general", "sports", "hockey", "nhl", "carolina hurricanes", "vancouver canucks"],
        text: snapshot.summary.replace(/Keep it conversational[\s\S]*$/i, "").trim(),
        tone: "light",
        priority: 3,
        source: snapshot.source,
      });
    }

    if (snapshot.topic === "news") {
      const headlineText = snapshot.summary
        .replace(/^Light science headlines:\s*/i, "")
        .replace(/Mention briefly[\s\S]*$/i, "");
      for (const headline of headlineText.split(";").map((part) => part.trim()).filter(Boolean).slice(0, 3)) {
        items.push({
          category: "news",
          interestTags: ["general", "science", "light news"],
          text: headline,
          tone: "light",
          priority: 2,
          source: snapshot.source,
        });
      }
    }
  }

  return items;
}

export async function refreshBriefingItemsFromSnapshots(
  prisma: PrismaClient,
  snapshots: CurrentInfoSnapshot[],
  now = new Date(),
) {
  const freshSnapshots = snapshots.filter((snapshot) => snapshot.expiresAt > now);
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + BRIEFING_TTL_MS);
  let source = "fallback";
  let drafts: BriefingItemDraft[] | null = null;

  try {
    drafts = await digestWithOpenAI(freshSnapshots);
    if (drafts?.length) source = "openai";
  } catch (error) {
    console.error("Briefing digest failed; using fallback", error);
  }

  const safeDrafts = (drafts?.length ? drafts : fallbackDigest(freshSnapshots, now))
    .map(sanitizeDraft)
    .filter((draft): draft is BriefingItemDraft => Boolean(draft))
    .slice(0, MAX_BRIEFING_ITEMS);

  await prisma.$transaction([
    prisma.briefingItem.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.briefingItem.deleteMany({ where: { source: { in: ["openai", "fallback"] } } }),
    ...safeDrafts.map((draft) =>
      prisma.briefingItem.create({
        data: {
          category: draft.category,
          interestTags: draft.interestTags,
          text: draft.text,
          tone: draft.tone,
          priority: draft.priority ?? 0,
          source,
          fetchedAt,
          expiresAt,
        },
      }),
    ),
  ]);

  return {
    ok: true,
    source,
    count: safeDrafts.length,
    fetchedAt,
    expiresAt,
  };
}

export function matchesBriefingAvoids(item: { text: string; interestTags: string[] }, avoids: string[]) {
  const itemText = normalizeCompact([item.text, ...item.interestTags].join(" "));
  return avoids.some((avoid) => {
    const normalized = normalizeCompact(avoid);
    return normalized.length > 2 && itemText.includes(normalized);
  });
}
