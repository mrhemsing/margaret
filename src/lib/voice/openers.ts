import type { CallAttempt, SeniorMemory } from "@prisma/client";

type RecentCall = Pick<CallAttempt, "summary" | "topics">;

type OpenerCandidate = {
  key: string;
  text: string;
  priority: number;
};

export type SelectedOpener = {
  key: string;
  text: string;
};

type SelectOpenerInput = {
  memberName: string;
  memory?: SeniorMemory | null;
  recentCalls?: RecentCall[];
  now?: Date;
};

const neutralOpeners = [
  {
    key: "neutral-check-in",
    text: "Hi {name}, it's your scheduled check-in from Dailycall. Is this still an okay time to talk for a minute?",
  },
  {
    key: "neutral-company",
    text: "Hi {name}, it's Dailycall checking in. Would a little company feel good right now?",
  },
  {
    key: "neutral-easy-chat",
    text: "Hi {name}, it's your Dailycall check-in. Are you up for an easy chat today?",
  },
  {
    key: "neutral-listen",
    text: "Hi {name}, it's Dailycall. Is there anything on your mind today that you'd like me to listen to?",
  },
] satisfies Array<{ key: string; text: string }>;

function fillName(text: string, memberName: string) {
  return text.replaceAll("{name}", memberName);
}

function normalizeKeyText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

function hasConcreteThread(value: string) {
  return /\b(mentioned|talked|said|told|asked|wanted|planning|visit|birthday|appointment|game|garden|church|music|family|daughter|son|grand|friend|pet)\b/i.test(value);
}

function isSensitiveThread(value: string) {
  return /\b(doctor|medicine|medication|pain|sick|fall|fell|hospital|test result|diagnosis|grief|funeral|died|death|loss)\b/i.test(value);
}

function ensureYesNoQuestion(text: string) {
  const trimmed = text.trim();
  if (/[?]\s*$/.test(trimmed)) return trimmed;
  return `${trimmed} Is that something you would like to talk about?`;
}

function dateOpener(now: Date, memberName: string): OpenerCandidate | null {
  const month = now.getMonth();
  const date = now.getDate();

  if (month === 0 && date === 1) {
    return {
      key: "special-new-year",
      text: `Hi ${memberName}, it's your scheduled check-in from Dailycall. Would you like to talk for a minute on this first day of the year?`,
      priority: 100,
    };
  }

  if (month === 11 && date === 25) {
    return {
      key: "special-christmas",
      text: `Hi ${memberName}, it's your scheduled check-in from Dailycall. Would a short Christmas Day chat feel nice right now?`,
      priority: 100,
    };
  }

  return null;
}

function continuityOpeners(input: SelectOpenerInput): OpenerCandidate[] {
  const candidates: OpenerCandidate[] = [];
  const threads = [
    ...(input.memory?.topicsToRevisit ?? []),
    input.memory?.lastSummary ?? "",
    ...(input.recentCalls ?? []).flatMap((call) => [call.summary ?? "", ...(call.topics ?? [])]),
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 8 && hasConcreteThread(value) && !isSensitiveThread(value))
    .slice(0, 3);

  for (const thread of threads) {
    const shortThread = thread.replace(/\s+/g, " ").replace(/^Family wants DailyCall to ask:\s*/i, "").slice(0, 95);
    candidates.push({
      key: `continuity-${normalizeKeyText(shortThread)}`,
      text: `Hi ${input.memberName}, it's your scheduled check-in from Dailycall. Last time, ${shortThread}. Would you like to pick that back up for a minute?`,
      priority: 80,
    });
  }

  return candidates;
}

function dayOpener(now: Date, memberName: string): OpenerCandidate {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
  return {
    key: `day-${weekday.toLowerCase()}`,
    text: `Hi ${memberName}, it's your scheduled check-in from Dailycall. Since it's ${weekday}, would you like a quick check-in before the day gets away?`,
    priority: 35,
  };
}

function neutralCandidates(memberName: string): OpenerCandidate[] {
  return neutralOpeners.map((opener, index) => ({
    key: opener.key,
    text: fillName(opener.text, memberName),
    priority: 20 - index,
  }));
}

export function selectOpener(input: SelectOpenerInput): SelectedOpener | null {
  const now = input.now ?? new Date();
  const recentKeys = new Set((input.memory?.recentOpenerKeys ?? []).slice(0, 5));
  const candidates = [
    dateOpener(now, input.memberName),
    ...continuityOpeners(input),
    dayOpener(now, input.memberName),
    ...neutralCandidates(input.memberName),
  ]
    .filter((candidate): candidate is OpenerCandidate => Boolean(candidate))
    .filter((candidate) => !recentKeys.has(candidate.key))
    .sort((left, right) => right.priority - left.priority);
  const selected = candidates[0] ?? neutralCandidates(input.memberName).find((candidate) => !recentKeys.has(candidate.key)) ?? neutralCandidates(input.memberName)[0];

  return selected ? { key: selected.key, text: ensureYesNoQuestion(selected.text) } : null;
}
