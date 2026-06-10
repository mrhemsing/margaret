const blockedTermPatterns = [
  /\bf+\W*a+\W*g+\W*g+\W*o+\W*t+\b/gi,
  /\bn+\W*i+\W*g+\W*g+\W*(?:e+\W*r+|a+)\b/gi,
  /\bc+\W*u+\W*n+\W*t+\b/gi,
  /\br+\W*e+\W*t+\W*a+\W*r+\W*d+\b/gi,
];

function cleanText(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

export function containsBlockedTerms(value: string | null | undefined) {
  if (!value) return false;
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

export function safeAdminDisplayName(value: string | null | undefined, fallback = "Demo caller") {
  const cleaned = cleanText(value ?? "").slice(0, 80);

  if (!cleaned || containsBlockedTerms(cleaned)) return fallback;

  return cleaned;
}

export function safeAdminSummary(value: string | null | undefined) {
  const cleaned = cleanText(value ?? "");

  if (!cleaned) return "No summary available.";

  return blockedTermPatterns.reduce((summary, pattern) => summary.replace(pattern, "[removed]"), cleaned);
}
