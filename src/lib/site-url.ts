const DAILY_CALL_APEX_URL = "https://dailycall.care";
const DAILY_CALL_WWW_URL = "https://www.dailycall.care";

export function normalizeSiteUrl(url = DAILY_CALL_WWW_URL) {
  const trimmedUrl = url.replace(/\/$/, "");

  if (trimmedUrl === DAILY_CALL_APEX_URL) {
    return DAILY_CALL_WWW_URL;
  }

  return trimmedUrl;
}

export const siteUrl = normalizeSiteUrl(process.env.PUBLIC_SITE_URL ?? DAILY_CALL_WWW_URL);

export function absoluteSiteUrl(path = "") {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
