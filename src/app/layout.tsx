import type { Metadata } from "next";
import { DevNav } from "@/components/dev-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "dailycall",
  description: "A friendly daily call for aging parents — companionship for them and peace of mind for families.",
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
