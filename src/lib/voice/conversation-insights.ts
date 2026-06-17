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

function isTechnicalSummary(text: string) {
  return /\b(openai|realtime|sip|twilio|elevenlabs|voice agent|transcript turn|connected|starting the conversation|captured \d+)\b/i.test(text);
}

function stripSpeakerPrefix(line: string) {
  return line.replace(/^[^:]{1,40}:\s*/, "").trim();
}

function getMemberTranscriptText(transcript: string, memberName: string) {
  const memberNamePattern = new RegExp(`^${memberName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`, "i");
  const memberLines = transcript
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^DailyCall:/i.test(line))
    .filter((line) => memberNamePattern.test(line) || !/^[^:]{1,40}:\s*/.test(line))
    .map(stripSpeakerPrefix)
    .filter((line) => line.length > 2);

  return memberLines.join(" ");
}

export function summarizeConversationForFamily(input: ConversationInsightsInput) {
  const fallbackSummary = input.summary?.trim();
  const transcript = input.transcript?.trim();

  if (!transcript) {
    if (fallbackSummary && !isTechnicalSummary(fallbackSummary)) return fallbackSummary;
    return `${input.memberName} completed a short check-in conversation.`;
  }

  const memberText = getMemberTranscriptText(transcript, input.memberName);
  const sourceText = memberText || transcript;
  const topics = unique(topicPatterns.filter(({ pattern }) => pattern.test(sourceText)).map(({ topic }) => topic), 4);
  const mood = inferMood(sourceText);

  if (!sourceText.trim()) {
    return `${input.memberName} completed a short check-in conversation.`;
  }

  const topicLine = topics.length ? ` Topics included ${topics.join(", ")}.` : "";
  const moodLine = mood && mood !== "Brief / unclear" ? ` Overall mood: ${mood.toLowerCase()}.` : "";
  return `${input.memberName} completed a check-in conversation.${topicLine}${moodLine}`;
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
    .filter((line) => !line.trim().startsWith("DailyCall:"))
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

function extractPossibleList(text: string, pattern: RegExp, fallbackLabel: string) {
  if (!pattern.test(text)) return [];

  const snippets = sentenceSplit(text)
    .map(stripSpeakerPrefix)
    .filter((sentence) => sentence.length >= 12 && sentence.length <= 220)
    .filter((sentence) => pattern.test(sentence))
    .filter((sentence) => !isTechnicalSummary(sentence))
    .map((sentence) => sentence.replace(/\s+/g, " ").trim());

  return unique(snippets.length ? snippets : [fallbackLabel], 5);
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
