import type { MetadataRoute } from "next";

import { seoLandingPages } from "@/app/seo-pages";

const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://dailycall.care";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const seoRoutes = new Set(seoLandingPages.map((page) => `/${page.slug}`));
  const routes = [
    "",
    "/pricing",
    "/faq",
    "/signup",
    "/support",
    "/privacy-policy",
    "/safety-policy",
    "/terms-and-conditions",
    "/cookie-policy",
    "/cookie-preferences",
    ...seoLandingPages.map((page) => `/${page.slug}`),
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/signup" ? 0.9 : route === "/pricing" || route === "/faq" ? 0.8 : seoRoutes.has(route) ? 0.7 : 0.5,
  }));
}
