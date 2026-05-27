import type { MetadataRoute } from "next";

const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://dailycall.care";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
