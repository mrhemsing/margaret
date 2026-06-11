import { cleanDemoText, containsBlockedTerms, isDemoFirstNameShape } from "@/lib/content-safety";
import { getServerEnv } from "@/lib/env";

type OpenAINameValidationResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

export type DemoNameResolution = {
  name: string;
  personalized: boolean;
  reason: "blank" | "local_invalid" | "model_rejected" | "model_unavailable" | "accepted";
};

function extractResponseText(payload: OpenAINameValidationResponse | null) {
  if (payload?.output_text?.trim()) return payload.output_text.trim();

  return (
    payload?.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .find((text) => text?.trim())
      ?.trim() ?? null
  );
}

async function isPlausibleFirstNameWithModel(name: string) {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "dailycall-demo-name-validation",
    },
    body: JSON.stringify({
      model: env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
      instructions: [
        "You validate a submitted first name before a phone demo call.",
        "Reply Y only if the input is a plausible real human first name suitable for a friendly greeting.",
        "Reply N for slurs, insults, sexual content, joke names, phrases, usernames, brands, threats, creative misspellings of offensive content, or anything not suitable to say aloud.",
        "Return only Y or N.",
      ].join(" "),
      input: name,
      max_output_tokens: 2,
      store: false,
    }),
  });

  const payload = (await response.json().catch(() => null)) as OpenAINameValidationResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI name validation failed with status ${response.status}`);
  }

  return /^y\b/i.test(extractResponseText(payload) ?? "");
}

export async function resolveDemoCallName(value: string | null | undefined): Promise<DemoNameResolution> {
  const cleaned = cleanDemoText(value).slice(0, 40);

  if (!cleaned) {
    return { name: "there", personalized: false, reason: "blank" };
  }

  if (!isDemoFirstNameShape(cleaned) || containsBlockedTerms(cleaned)) {
    return { name: "there", personalized: false, reason: "local_invalid" };
  }

  try {
    const accepted = await isPlausibleFirstNameWithModel(cleaned);

    if (accepted === false) {
      return { name: "there", personalized: false, reason: "model_rejected" };
    }

    if (accepted === null) {
      return { name: "there", personalized: false, reason: "model_unavailable" };
    }
  } catch (error) {
    console.warn("Demo name model validation unavailable", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { name: "there", personalized: false, reason: "model_unavailable" };
  }

  return { name: cleaned, personalized: true, reason: "accepted" };
}
