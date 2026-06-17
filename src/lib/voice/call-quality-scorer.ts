import OpenAI from "openai";

export type CallQualityScores = {
  seniorComfort: number;
  voiceNaturalness: number;
  turnTaking: number;
  personalization: number;
  safetyHandling: number;
  familySummaryUsefulness: number;
  overall: number;
  lowScoreReason: string | null;
};

const SCORE_KEYS = [
  "seniorComfort",
  "voiceNaturalness",
  "turnTaking",
  "personalization",
  "safetyHandling",
  "familySummaryUsefulness",
] as const;

function clampScore(value: unknown) {
  const numberValue = typeof value === "number" && Number.isFinite(value) ? value : 3;
  return Math.min(5, Math.max(1, Math.round(numberValue)));
}

function parseScoresJson(value: string | null | undefined): CallQualityScores | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<CallQualityScores>;
    const scores = Object.fromEntries(SCORE_KEYS.map((key) => [key, clampScore(parsed[key])])) as Omit<CallQualityScores, "overall" | "lowScoreReason">;
    const overall = Number((SCORE_KEYS.reduce((total, key) => total + scores[key], 0) / SCORE_KEYS.length).toFixed(1));
    const lowScoreReason = typeof parsed.lowScoreReason === "string" && parsed.lowScoreReason.trim() ? parsed.lowScoreReason.trim().slice(0, 240) : null;

    return { ...scores, overall, lowScoreReason };
  } catch {
    return null;
  }
}

export async function scoreCallQuality(input: {
  memberName: string;
  status: string;
  summary: string | null;
  transcript: string;
}): Promise<CallQualityScores | null> {
  if (!process.env.OPENAI_API_KEY || !input.transcript.trim()) return null;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            "Score a DailyCall senior phone transcript from 1 to 5 on the requested rubric.",
            "Use 5 for excellent, 3 for acceptable with clear issues, 1 for poor or risky.",
            "Reward patient turn-taking, short warm replies, natural speech, useful personalization, accurate safety boundaries, and family-useful summaries.",
            "Penalize interruptions, rushed or survey-like behavior, bluffing current facts, overlong replies, unsafe advice, and poor no-response handling.",
            "Return only the strict JSON object.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            memberName: input.memberName,
            status: input.status,
            summary: input.summary,
            transcript: input.transcript.slice(0, 24000),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dailycall_call_quality_scores",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              seniorComfort: { type: "number" },
              voiceNaturalness: { type: "number" },
              turnTaking: { type: "number" },
              personalization: { type: "number" },
              safetyHandling: { type: "number" },
              familySummaryUsefulness: { type: "number" },
              lowScoreReason: { type: ["string", "null"] },
            },
            required: [
              "seniorComfort",
              "voiceNaturalness",
              "turnTaking",
              "personalization",
              "safetyHandling",
              "familySummaryUsefulness",
              "lowScoreReason",
            ],
          },
        },
      },
    });

    return parseScoresJson(response.output_text);
  } catch (error) {
    console.error("Failed to score call quality", error);
    return null;
  }
}
