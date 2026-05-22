import type { MetadataRoute } from "next";

const appUrl = process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://dailycall.care";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/signup",
    "/support",
    "/privacy-policy",
    "/safety-policy",
    "/terms-and-conditions",
    "/cookie-policy",
    "/cookie-preferences",
  ];

  return routes.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/signup" ? 0.9 : 0.5,
  }));
}
