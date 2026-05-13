import type { Metadata } from "next";
import { DevNav } from "@/components/dev-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "dailycall",
  description: "A friendly daily call for aging parents — companionship for them and peace of mind for families.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const showDevNav = process.env.APP_ENV !== "production";

  return (
    <html lang="en">
      <body>
        {showDevNav ? <DevNav /> : null}
        {children}
      </body>
    </html>
  );
}
