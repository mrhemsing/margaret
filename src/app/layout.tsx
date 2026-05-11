import type { Metadata } from "next";
import { DevNav } from "@/components/dev-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "dailycall",
  description: "Daily voice check-ins for elderly people and their caregivers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DevNav />
        {children}
      </body>
    </html>
  );
}
