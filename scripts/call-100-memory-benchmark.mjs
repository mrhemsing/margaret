const memory = {
  preferredName: "Joe",
  recentMood: "Positive / calm",
  hobbies: [
    "gardening",
    "old baseball stories",
    "listening to jazz",
    "Sunday crossword",
  ],
  routines: [
    "coffee after breakfast",
    "walks before lunch when it is dry",
    "calls daughter Linda on Sundays",
  ],
  healthNotes: [
    "hears better when the caller speaks slowly",
    "knee pain sometimes makes walks shorter",
  ],
  conversationAvoids: [
    "do not press on grief around Mary",
    "avoid politics",
  ],
  topicsToRevisit: [
    "ask whether the tomatoes are coming in",
    "ask whether Linda visited this week",
    "revisit the old Mariners game story only if Joe brings up baseball",
  ],
  recentTopics: [
    "weather",
    "family",
    "garden",
    "breakfast",
    "baseball",
    "knee pain",
    "crossword",
    "Linda",
  ],
  lastSummary: "Joe said the garden is doing well and Linda may visit Sunday.",
};

const recentCalls = Array.from({ length: 100 }, (_, index) => {
  const day = index + 1;
  const topicCycle = [
    ["garden", "weather"],
    ["family", "Linda"],
    ["breakfast", "routine"],
    ["baseball", "memories"],
    ["health", "knee pain"],
    ["crossword", "hobbies"],
  ];
  const topics = topicCycle[index % topicCycle.length];
  return {
    summary: `Call ${day}: Joe talked about ${topics.join(" and ")}. ${day === 60 ? "His daughter Linda started visiting on Sundays." : ""} ${day === 84 ? "He asked not to dwell on Mary unless he brings her up." : ""}`.trim(),
    mood: day % 17 === 0 ? "Tired" : "Positive / calm",
    topics,
    notableMoments: day === 99 ? ["Joe was proud that the tomatoes are finally coming in."] : [],
  };
}).reverse();

function list(items, fallback = "none yet") {
  const clean = Array.from(new Set((items ?? []).map((item) => item.trim()).filter(Boolean)));
  return clean.length ? clean.join(", ") : fallback;
}

function buildBenchmarkContext() {
  const recentSummaries = recentCalls.map((call) => call.summary).filter(Boolean).slice(0, 3);
  const recentTopics = Array.from(new Set([
    ...(memory.recentTopics ?? []),
    ...recentCalls.flatMap((call) => call.topics ?? []),
  ])).slice(0, 8);
  const avoidRepeating = [
    ...recentSummaries.map((summary) => `Do not repeat this prior summary as a new question: ${summary}`),
    ...recentTopics.map((topic) => `Do not ask another generic ${topic} question unless you have a fresh angle.`),
    ...(memory.conversationAvoids ?? []).map((item) => `Respect this boundary: ${item}.`),
  ].slice(0, 12);

  return {
    context: [
      `You are calling ${memory.preferredName}. Sound like a familiar, warm daily companion, not a clinical checklist.`,
      `Recent mood: ${memory.recentMood || "unknown"}.`,
      `Known hobbies/interests: ${list(memory.hobbies)}.`,
      `Known routines: ${list(memory.routines)}.`,
      `Health/context notes: ${list(memory.healthNotes)}.`,
      `Topics to revisit warmly: ${list(memory.topicsToRevisit)}.`,
      `Recent topics already covered: ${list(recentTopics)}.`,
      recentSummaries.length ? `Recent call summaries: ${recentSummaries.join(" | ")}.` : "No recent summaries yet.",
      `Avoid repeating: ${avoidRepeating.join("; ")}`,
    ].join("\n"),
    recentSummaries,
    recentTopics,
    avoidRepeating,
  };
}

function scoreBenchmark(result) {
  const requiredSignals = [
    ["preferred person", /Joe/],
    ["family relationship", /Linda/],
    ["routine", /coffee|walks|Sundays/],
    ["hobby", /gardening|baseball|jazz|crossword/],
    ["health pacing", /hears better|slowly|knee pain/],
    ["sensitive boundary", /Mary|grief|politics/],
    ["recent topic anti-repetition", /Do not ask another generic/],
    ["recent concrete event", /tomatoes|visited|Sunday/],
  ];
  const found = requiredSignals.filter(([, pattern]) => pattern.test(result.context));
  return {
    score: `${found.length}/${requiredSignals.length}`,
    missing: requiredSignals
      .filter(([label]) => !found.some(([foundLabel]) => foundLabel === label))
      .map(([label]) => label),
  };
}

const result = buildBenchmarkContext();
const score = scoreBenchmark(result);

console.log("DailyCall call-100 memory benchmark");
console.log(`Score: ${score.score}`);
if (score.missing.length) {
  console.log(`Missing: ${score.missing.join(", ")}`);
}
console.log("\nInjected context preview:\n");
console.log(result.context);
