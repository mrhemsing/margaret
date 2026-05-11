type ConversationInsightsInput = {
  memberName: string;
  summary?: string | null;
  transcript?: string | null;
  priorRecentTopics?: string[];
};

type ConversationInsights = {
  mood: string | null;
  topics: string[];
  notableMoments: string[];
  followUpSuggested: boolean;
  followUpReason: string | null;
  memoryUpdates: {
    topicsToRevisit: string[];
    recentTopics: string[];
    lastSummary: string | null;
    possibleHobbies: string[];
    possibleRoutines: string[];
    possibleHealthNotes: string[];
  };
};

const topicPatterns: { topic: string; pattern: RegExp }[] = [
  { topic: "family", pattern: /\b(family|son|daughter|grandson|granddaughter|wife|husband|mom|dad|children|grandkids?)\b/i },
  { topic: "health", pattern: /\b(health|doctor|medicine|medication|pain|dizzy|sick|tired|sleep|fall|hospital)\b/i },
  { topic: "food", pattern: /\b(breakfast|lunch|dinner|coffee|tea|meal|eat|food|cook|bake)\b/i },
  { topic: "weather", pattern: /\b(weather|rain|sunny|snow|cold|hot|wind|outside)\b/i },
  { topic: "home", pattern: /\b(home|house|garden|yard|neighbour|neighbor|chores)\b/i },
  { topic: "memories", pattern: /\b(remember|used to|years ago|childhood|story|memory)\b/i },
  { topic: "plans", pattern: /\b(today|tomorrow|plan|appointment|visit|going to|later)\b/i },
  { topic: "pets", pattern: /\b(dog|cat|pet|puppy|kitty|bird)\b/i },
  { topic: "hobbies", pattern: /\b(read|book|music|song|tv|movie|knit|cards|walk|church|garden|painting|puzzle)\b/i },
];

const followUpPatterns: { reason: string; pattern: RegExp }[] = [
  { reason: "Possible health concern mentioned.", pattern: /\b(fall|fell|dizzy|chest pain|trouble breathing|can't breathe|pain|hurt|sick|hospital|emergency)\b/i },
  { reason: "Possible loneliness or low mood mentioned.", pattern: /\b(lonely|alone|sad|depressed|crying|miss him|miss her|no one)\b/i },
  { reason: "Medication or appointment may need follow-up.", pattern: /\b(medicine|medication|pills|doctor|appointment|forgot)\b/i },
];

function unique(items: string[], limit = 6) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, limit);
}

function sentenceSplit(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function inferMood(text: string) {
  if (/\b(pain|hurt|sick|dizzy|fall|fell|hospital|severe)\b/i.test(text)) return "Health concern";
  if (/\b(sad|lonely|depressed|upset|worried|anxious|scared|angry|distress)\b/i.test(text)) return "Low or concerned";
  if (/\b(tired|sleepy|exhausted|not great|rough)\b/i.test(text)) return "Tired";
  if (/\b(great|good|happy|wonderful|excellent|fine|well|upbeat|peace|nice)\b/i.test(text)) return "Positive / calm";
  if (text.trim().length < 80) return "Brief / unclear";
  return "Neutral";
}

function extractNotableMoments(text: string, memberName: string) {
  const parentText = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("Dailycall:"))
    .join(" ");
  const sentences = sentenceSplit(parentText || text);
  const notable = sentences.filter((sentence) => {
    if (sentence.length < 30) return false;
    return /\b(family|doctor|pain|dizzy|happy|sad|lonely|visit|appointment|remember|walk|breakfast|medication|help|tomorrow|today)\b/i.test(sentence);
  });

  if (notable.length) return unique(notable, 3);

  if (text.trim()) {
    return [`${memberName} completed a short check-in conversation.`];
  }

  return [];
}

function extractPossibleList(text: string, pattern: RegExp, label: string) {
  if (!pattern.test(text)) return [];
  return [label];
}

export function deriveConversationInsights(input: ConversationInsightsInput): ConversationInsights {
  const text = [input.summary, input.transcript].filter(Boolean).join("\n\n");
  const topics = unique(topicPatterns.filter(({ pattern }) => pattern.test(text)).map(({ topic }) => topic));
  const followUp = followUpPatterns.find(({ pattern }) => pattern.test(text));
  const notableMoments = extractNotableMoments(text, input.memberName);
  const recentTopics = unique([...topics, ...(input.priorRecentTopics ?? [])], 8);

  return {
    mood: text ? inferMood(text) : null,
    topics,
    notableMoments,
    followUpSuggested: Boolean(followUp),
    followUpReason: followUp?.reason ?? null,
    memoryUpdates: {
      topicsToRevisit: unique(notableMoments.filter((moment) => !/short check-in/i.test(moment)), 5),
      recentTopics,
      lastSummary: input.summary ?? null,
      possibleHobbies: extractPossibleList(text, /\b(read|book|music|song|tv|movie|knit|cards|walk|church|garden|painting|puzzle)\b/i, "Mentioned hobbies or regular activities"),
      possibleRoutines: extractPossibleList(text, /\b(breakfast|lunch|dinner|coffee|tea|walk|church|appointment|morning|evening)\b/i, "Mentioned daily routine"),
      possibleHealthNotes: extractPossibleList(text, /\b(doctor|medicine|medication|pain|dizzy|sick|tired|fall|fell|hospital)\b/i, "Mentioned health context"),
    },
  };
}
