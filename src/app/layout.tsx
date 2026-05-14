import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://dailycall.care"),
  title: "DailyCall",
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
      <body>{children}</body>
    </html>
  );
}
