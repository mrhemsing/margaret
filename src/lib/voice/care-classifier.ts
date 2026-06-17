import OpenAI from "openai";

import { containsBlockedTerms } from "@/lib/content-safety";

export type CareSeverity = "urgent" | "concern" | "none";

export type CareAssessment = {
  severity: CareSeverity;
  category: string | null;
  evidence: string | null;
  selfHarm: boolean;
  requestedPrivacy: boolean;
};

const emptyAssessment: CareAssessment = {
  severity: "none",
  category: null,
  evidence: null,
  selfHarm: false,
  requestedPrivacy: false,
};

const urgentPatterns: Array<{ category: string; pattern: RegExp; evidence: string }> = [
  { category: "fall", pattern: /\b(fell|fallen|fall)\b.{0,80}\b(can't|cannot|couldn't|unable|not able)\b.{0,60}\b(get up|stand|move)\b/i, evidence: "A fall with possible trouble getting up was mentioned." },
  { category: "fall", pattern: /\b(on the floor|lying on the floor|stuck on the floor)\b/i, evidence: "Being stuck on the floor was mentioned." },
  { category: "chest-pain", pattern: /\b(chest pain|tightness in my chest|chest feels tight|heart attack)\b/i, evidence: "Chest pain or chest tightness was mentioned." },
  { category: "breathing", pattern: /\b(can't breathe|cannot breathe|trouble breathing|short of breath|hard to breathe)\b/i, evidence: "Trouble breathing was mentioned." },
  { category: "emergency", pattern: /\b(call 911|emergency|ambulance|need help now|send help|help me now)\b/i, evidence: "An immediate help or emergency phrase was mentioned." },
  { category: "acute-pain", pattern: /\b(severe pain|unbearable pain|worst pain)\b/i, evidence: "Severe pain was mentioned." },
  { category: "self-harm", pattern: /\b(kill myself|suicide|end my life|hurt myself|harm myself|don't want to live|do not want to live)\b/i, evidence: "Self-harm language was mentioned." },
];

const concernPatterns: Array<{ category: string; pattern: RegExp; evidence: string }> = [
  { category: "nutrition", pattern: /\b(haven't eaten|have not eaten|didn't eat|did not eat|not eating|no appetite)\b/i, evidence: "Eating or appetite concern was mentioned." },
  { category: "medication", pattern: /\b(missed my pills|missed medication|forgot my medicine|forgot my medication|out of pills|out of medication)\b/i, evidence: "Medication follow-up may be needed." },
  { category: "low-mood", pattern: /\b(lonely|alone|sad|depressed|crying|hopeless|very down)\b/i, evidence: "Low mood or loneliness was mentioned." },
  { category: "health", pattern: /\b(dizzy|lightheaded|not feeling well|feeling sick|mild pain|doctor appointment|doctor's appointment)\b/i, evidence: "A non-urgent health concern was mentioned." },
];

function clean(value: string | null | undefined) {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function isStronger(a: CareSeverity, b: CareSeverity) {
  const rank: Record<CareSeverity, number> = { none: 0, concern: 1, urgent: 2 };
  return rank[a] > rank[b];
}

function sanitizeAssessment(assessment: Partial<CareAssessment>): CareAssessment {
  const severity: CareSeverity = assessment.severity === "urgent" || assessment.severity === "concern" ? assessment.severity : "none";
  const category = clean(assessment.category).toLowerCase().slice(0, 40) || null;
  const evidence = clean(assessment.evidence).slice(0, 220);
  const safeEvidence = evidence && !containsBlockedTerms(evidence) ? evidence : null;
  const selfHarm = Boolean(assessment.selfHarm) || category === "self-harm";

  return {
    severity: selfHarm ? "urgent" : severity,
    category: selfHarm ? "self-harm" : category,
    evidence: safeEvidence,
    selfHarm,
    requestedPrivacy: Boolean(assessment.requestedPrivacy),
  };
}

export function assessCallConcernWithPatterns(transcript: string): CareAssessment {
  const text = clean(transcript);
  if (!text) return emptyAssessment;

  const urgent = urgentPatterns.find(({ pattern }) => pattern.test(text));
  if (urgent) {
    return sanitizeAssessment({
      severity: "urgent",
      category: urgent.category,
      evidence: urgent.evidence,
      selfHarm: urgent.category === "self-harm",
      requestedPrivacy: /\b(don't tell|do not tell|keep this private|between us)\b/i.test(text),
    });
  }

  const concern = concernPatterns.find(({ pattern }) => pattern.test(text));
  if (concern) {
    return sanitizeAssessment({
      severity: "concern",
      category: concern.category,
      evidence: concern.evidence,
      requestedPrivacy: /\b(don't tell|do not tell|keep this private|between us)\b/i.test(text),
    });
  }

  return {
    ...emptyAssessment,
    requestedPrivacy: /\b(don't tell|do not tell|keep this private|between us)\b/i.test(text),
  };
}

function parseOpenAiAssessment(value: string): CareAssessment {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object") return emptyAssessment;
  const record = parsed as Record<string, unknown>;

  return sanitizeAssessment({
    severity: record.severity === "urgent" || record.severity === "concern" || record.severity === "none" ? record.severity : "none",
    category: typeof record.category === "string" ? record.category : null,
    evidence: typeof record.evidence === "string" ? record.evidence : null,
    selfHarm: record.selfHarm === true,
    requestedPrivacy: record.requestedPrivacy === true,
  });
}

function combineAssessments(patternAssessment: CareAssessment, llmAssessment: CareAssessment) {
  if (patternAssessment.selfHarm || llmAssessment.selfHarm) {
    return sanitizeAssessment({
      ...llmAssessment,
      severity: "urgent",
      category: "self-harm",
      evidence: llmAssessment.evidence ?? patternAssessment.evidence ?? "Self-harm language was mentioned.",
      selfHarm: true,
      requestedPrivacy: patternAssessment.requestedPrivacy || llmAssessment.requestedPrivacy,
    });
  }

  if (isStronger(patternAssessment.severity, llmAssessment.severity)) {
    return {
      ...patternAssessment,
      requestedPrivacy: patternAssessment.requestedPrivacy || llmAssessment.requestedPrivacy,
    };
  }

  if (patternAssessment.severity !== "none" && llmAssessment.severity === patternAssessment.severity) {
    return {
      ...llmAssessment,
      category: llmAssessment.category ?? patternAssessment.category,
      evidence: llmAssessment.evidence ?? patternAssessment.evidence,
      requestedPrivacy: patternAssessment.requestedPrivacy || llmAssessment.requestedPrivacy,
    };
  }

  return {
    ...llmAssessment,
    requestedPrivacy: patternAssessment.requestedPrivacy || llmAssessment.requestedPrivacy,
  };
}

export async function assessCallConcern(input: {
  transcript: string;
  memberName: string;
}): Promise<CareAssessment> {
  const patternAssessment = assessCallConcernWithPatterns(input.transcript);
  if (!process.env.OPENAI_API_KEY || !input.transcript.trim()) return patternAssessment;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            "Assess a senior companion call transcript for family care follow-up.",
            "Return conservative JSON only. Never diagnose or triage medically.",
            "urgent means acute safety, medical emergency language, fall with inability to get up, breathing trouble, chest pain, or self-harm.",
            "concern means softer repeated-care signals like not eating, missed medication, persistent low mood, mild pain, or an appointment needing family awareness.",
            "none means no family care signal.",
            "Use concise evidence suitable for a family SMS. Summarize; never quote sensitive personal details verbatim.",
            "Set requestedPrivacy when the senior asked not to share something. Safety concerns still remain urgent or concern.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            memberName: input.memberName,
            transcript: input.transcript.slice(0, 12000),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dailycall_care_assessment",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              severity: { type: "string", enum: ["urgent", "concern", "none"] },
              category: { type: ["string", "null"] },
              evidence: { type: ["string", "null"] },
              selfHarm: { type: "boolean" },
              requestedPrivacy: { type: "boolean" },
            },
            required: ["severity", "category", "evidence", "selfHarm", "requestedPrivacy"],
          },
        },
      },
    });

    return combineAssessments(patternAssessment, parseOpenAiAssessment(response.output_text));
  } catch (error) {
    console.error("Care concern assessment failed; using regex assessment", error);
    return patternAssessment;
  }
}
