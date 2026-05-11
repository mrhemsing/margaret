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

export function buildCompanionContext(input: BuildCompanionContextInput) {
  const memory = input.memory;
  const recentCalls = input.recentCalls ?? [];
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
    recentSummaries.length ? `Recent call summaries: ${recentSummaries.join(" | ")}.` : "No recent summaries yet.",
    "Open with warmth and variety. Ask one easy, human question. If the senior seems quiet, offer a gentle topic instead of interrogating them.",
  ];

  return {
    companionContext: parts.join("\n"),
    recentTopics,
    topicsToRevisit: memory?.topicsToRevisit ?? [],
    avoidRepeating,
  };
}
