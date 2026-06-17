import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const synonyms = {
  hockey: ["hockey", "nhl", "carolina hurricanes", "vancouver canucks", "colorado avalanche", "vegas golden knights"],
  baseball: ["baseball", "mlb"],
  football: ["football", "nfl"],
  basketball: ["basketball", "nba"],
  gardening: ["gardening", "garden", "yard"],
  music: ["music", "song", "jazz", "singing"],
  "classic-films": ["classic-films", "classic films", "movies", "film"],
  faith: ["faith", "church", "prayer"],
  cooking: ["cooking", "cook", "bake", "food"],
  weather: ["weather", "forecast"],
  family: ["family", "children", "grandchildren", "grandkids"],
  "birds-nature": ["birds-nature", "birds", "nature", "wildlife"],
  "puzzles-cards": ["puzzles-cards", "puzzles", "cards", "bridge"],
  history: ["history", "historical"],
};

function normalize(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function derive(values) {
  const tags = new Set();
  for (const value of values) {
    for (const part of String(value ?? "").split(/[,;/\n]+/)) {
      const normalized = normalize(part);
      if (normalized.length <= 2) continue;
      for (const [canonical, terms] of Object.entries(synonyms)) {
        if (terms.map(normalize).some((term) => normalized.includes(term) || term.includes(normalized))) {
          tags.add(canonical);
        }
      }
    }
  }
  return Array.from(tags).slice(0, 12);
}

const memories = await prisma.seniorMemory.findMany();
let updated = 0;

for (const memory of memories) {
  const tags = Array.from(new Set([...(memory.interestTags ?? []), ...derive([...(memory.hobbies ?? []), ...(memory.conversationLikes ?? []), ...(memory.recentTopics ?? [])])]));
  if (tags.length === (memory.interestTags ?? []).length && tags.every((tag, index) => tag === memory.interestTags[index])) continue;

  await prisma.seniorMemory.update({
    where: { id: memory.id },
    data: { interestTags: tags.slice(0, 12) },
  });
  updated += 1;
}

await prisma.$disconnect();
console.log(`Backfilled interestTags for ${updated} senior memories.`);
