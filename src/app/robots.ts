import type { MetadataRoute } from "next";

const appUrl = process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://dailycall.care";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
