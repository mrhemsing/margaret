const blockedTermPatterns = [
  /\bf+\W*a+\W*g+\W*g+\W*o+\W*t+\b/gi,
  /\bn+\W*i+\W*g+\W*g+\W*(?:e+\W*r+|a+)\b/gi,
  /\bc+\W*u+\W*n+\W*t+\b/gi,
  /\br+\W*e+\W*t+\W*a+\W*r+\W*d+\b/gi,
  /\bb+\W*u+\W*t+\W*t+\W*c+\W*h+\W*e+\W*e+\W*k+\W*s?\b/gi,
];

const blockedCompactTerms = [
  "assnigga",
  "buttcheek",
  "faggot",
  "gayass",
  "gayboy",
  "nigga",
  "nigger",
  "retard",
  "stretchnut",
];

const firstNamePattern = /^[A-Za-z][A-Za-z'-]{0,39}$/;
const legacyHiddenDemoSummaryPattern = /^summary hidden because it contained blocked demo content\.?$/i;

function cleanText(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function compactText(value: string) {
  return cleanText(value).toLowerCase().replace(/[^a-z]/g, "");
}

export function containsBlockedTerms(value: string | null | undefined) {
  if (!value) return false;
  const compacted = compactText(value);

  if (blockedCompactTerms.some((term) => compacted.includes(term))) {
    return true;
  }

  return blockedTermPatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

export function normalizeDemoFirstName(value: string | null | undefined, fallback = "there") {
  const cleaned = cleanText(value ?? "").slice(0, 40);

  if (!cleaned || containsBlockedTerms(cleaned)) return fallback;

  return cleaned;
}

export function cleanDemoText(value: string | null | undefined) {
  return cleanText(value ?? "");
}

export function isDemoFirstNameShape(value: string | null | undefined) {
  const cleaned = cleanText(value ?? "");
  return Boolean(cleaned) && cleaned.length <= 40 && firstNamePattern.test(cleaned);
}

export function validateDemoFirstName(value: string | null | undefined, fallback = "there") {
  const cleaned = cleanText(value ?? "");

  if (!cleaned) return { ok: true as const, name: fallback };

  if (cleaned.length > 40 || !firstNamePattern.test(cleaned) || containsBlockedTerms(cleaned)) {
    return {
      ok: false as const,
      error: "Enter a real first name only: one word, letters only, no jokes or offensive terms.",
    };
  }

  return { ok: true as const, name: cleaned };
}

export function safeAdminDisplayName(value: string | null | undefined, fallback = "Demo caller") {
  const cleaned = cleanText(value ?? "").slice(0, 80);

  if (!cleaned || containsBlockedTerms(cleaned)) return fallback;

  return cleaned;
}

export function safeAdminSummary(value: string | null | undefined) {
  const cleaned = cleanText(value ?? "");

  if (!cleaned) return "No summary available.";

  return cleaned;
}

export function rawAdminDemoSummary(value: string | null | undefined) {
  return safeAdminSummary(value);
}

export function adminDemoSummary(value: string | null | undefined, transcript?: string | null) {
  const cleaned = cleanText(value ?? "");

  if (!legacyHiddenDemoSummaryPattern.test(cleaned)) {
    return rawAdminDemoSummary(value);
  }

  const cleanedTranscript = cleanText(transcript ?? "");

  if (cleanedTranscript) {
    const clippedTranscript = cleanedTranscript.length > 500 ? `${cleanedTranscript.slice(0, 497).trim()}...` : cleanedTranscript;
    return clippedTranscript;
  }

  return "No uncensored summary was stored for this demo yet.";
}
