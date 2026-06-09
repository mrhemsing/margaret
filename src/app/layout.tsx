import type { Metadata } from "next";

import { AnalyticsScripts } from "@/app/components/analytics-scripts";
import { RouteChrome } from "@/app/components/route-chrome";
import { siteUrl } from "@/lib/site-url";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DailyCall | AI Companion Calls for Seniors and Aging Parents",
    template: "%s | DailyCall",
  },
  description:
    "DailyCall gives aging parents friendly AI companion calls by regular phone, with family updates, missed-call visibility, and peace of mind. No app required.",
  keywords: [
    "AI companion calls for seniors",
    "daily phone calls for aging parents",
    "senior companionship service",
    "family check-in calls",
    "elderly loneliness support",
    "AI phone companion",
    "no app senior check-ins",
    "peace of mind for families",
  ],
  openGraph: {
    title: "DailyCall | AI Companion Calls for Seniors and Aging Parents",
    description:
      "Friendly daily phone calls for aging parents, plus simple updates for families. No app, no password, just a familiar call.",
    url: "/",
    siteName: "DailyCall",
    images: [
      {
        url: "/dailycall-meta-image.png",
        width: 1061,
        height: 550,
        alt: "DailyCall - friendly daily calls for aging parents",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DailyCall | AI Companion Calls for Seniors",
    description: "Friendly daily phone calls for aging parents, with simple updates and peace of mind for families.",
    images: ["/dailycall-meta-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon.png", sizes: "512x512", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AnalyticsScripts />
        <RouteChrome>{children}</RouteChrome>
      </body>
    </html>
  );
}
