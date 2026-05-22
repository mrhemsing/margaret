import type { Metadata } from "next";

import { SiteFooter } from "@/app/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://dailycall.care"),
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
  alternates: {
    canonical: "/",
  },
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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-56 bg-gradient-to-b from-white via-white/85 to-transparent" />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-64 bg-gradient-to-t from-white via-white/90 to-transparent" />
        <div className="relative z-10">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
