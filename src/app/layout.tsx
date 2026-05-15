import type { Metadata } from "next";

import { SiteFooter } from "@/app/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://dailycall.care"),
  title: {
    default: "DailyCall",
    template: "DailyCall: %s",
  },
  description: "A friendly daily call for aging parents — companionship for them and peace of mind for families.",
  openGraph: {
    title: "DailyCall",
    description: "A friendly daily call for aging parents — companionship for them and peace of mind for families.",
    url: "/",
    siteName: "DailyCall",
    images: [
      {
        url: "/dailycall-logo.jpg",
        width: 571,
        height: 150,
        alt: "DailyCall logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "DailyCall",
    description: "A friendly daily call for aging parents — companionship for them and peace of mind for families.",
    images: ["/dailycall-logo.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-64 bg-gradient-to-t from-white via-white/90 to-transparent" />
        <div className="relative z-10">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
