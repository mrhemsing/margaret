import type { CallAttempt, SeniorMemory } from "@prisma/client";

type BuildCompanionContextInput = {
  memberName: string;
  memory?: SeniorMemory | null;
  recentCalls?: Pick<CallAttempt, "summary" | "mood" | "topics" | "notableMoments">[];
};

function list(items?: string[] | null, fallback = "none yet") {
  const clean = Array.from(new Set((items ?? []).map((item) => item.trim()).filter(Boolean)));
  return clean.length ? clean.join(", ") : fallback;
}

export function buildCurrentConversationContext(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  const month = now.getMonth();
  const sports =
    month >= 2 && month <= 5
      ? "Spring sports context: NHL and NBA playoffs are active, MLB regular season is underway, and local teams may be on people's minds."
      : month >= 8 && month <= 11
        ? "Fall sports context: football is active, hockey and basketball are underway, and MLB postseason may be relevant."
        : month >= 6 && month <= 7
          ? "Summer sports context: MLB is active and local outdoor events are common."
          : "Winter sports context: hockey, basketball, and football may be relevant depending on the person's interests.";

  return [
    "Today is " + date + ".",
    sports,
    "For current events, keep it light and local: weather, weekend plans, community events, or sports are good gentle openers.",
    "Do not invent specific headlines, scores, injuries, disasters, or political updates. If the person brings up a current event, respond warmly and ask a simple follow-up.",
  ].join("\n");
}

export function buildCompanionContext(input: BuildCompanionContextInput) {
  const memory = input.memory;
  const recentCalls = input.recentCalls ?? [];
  const currentContext = buildCurrentConversationContext();
  const recentSummaries = recentCalls.map((call) => call.summary).filter(Boolean).slice(0, 3) as string[];
  const recentTopics = Array.from(new Set([
    ...(memory?.recentTopics ?? []),
    ...recentCalls.flatMap((call) => call.topics ?? []),
  ])).slice(0, 8);
  const avoidRepeating = [
    ...recentSummaries.map((summary) => `Do not repeat this prior summary as a new question: ${summary}`),
    ...recentTopics.map((topic) => `Do not ask another generic ${topic} question unless you have a fresh angle.`),
  ].slice(0, 8);

  const parts = [
    `You are calling ${memory?.preferredName || input.memberName}. Sound like a familiar, warm daily companion, not a clinical checklist.`,
    `Recent mood: ${memory?.recentMood || "unknown"}.`,
    `Known hobbies/interests: ${list(memory?.hobbies)}.`,
    `Known routines: ${list(memory?.routines)}.`,
    `Health/context notes: ${list(memory?.healthNotes)}.`,
    `Topics to revisit warmly: ${list(memory?.topicsToRevisit)}.`,
    `Recent topics already covered: ${list(recentTopics)}.`,
    `Current small-talk context: ${currentContext}`,
    recentSummaries.length ? `Recent call summaries: ${recentSummaries.join(" | ")}.` : "No recent summaries yet.",
    "Open with warmth and variety. Ask one easy, human question. If the senior seems quiet, offer a gentle topic instead of interrogating them.",
  ];

  return {
    companionContext: parts.join("\n"),
    currentContext,
    recentTopics,
    topicsToRevisit: memory?.topicsToRevisit ?? [],
    avoidRepeating,
  };
}
