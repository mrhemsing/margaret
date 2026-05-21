"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const devLinks = [
  { href: "/", label: "Home" },
  { href: "/signup", label: "Signup" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navClassName(isActive: boolean) {
  return [
    "inline-flex items-center rounded-full px-3 py-1 font-semibold transition focus:outline-none",
    isActive
      ? "bg-white text-ink shadow-sm"
      : "text-white/85 hover:bg-white/15 hover:text-white focus:bg-white/15 focus:text-white",
  ].join(" ");
}

export function DevNav() {
  const pathname = usePathname();
  const dashboardActive = isActivePath(pathname, "/dashboard");
  const adminActive = isActivePath(pathname, "/admin");

  return (
    <div className="sticky top-0 z-50 border-b border-brandButtonBlue/20 bg-ink px-4 pb-3 pt-2 text-xs text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2">
        <span className="font-bold uppercase tracking-wide text-white/80">Dev nav</span>
        <div className="flex flex-wrap items-center gap-2">
          {devLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navClassName(isActivePath(pathname, link.href))}>
              {link.label}
            </Link>
          ))}
          <Link href="/dashboard" className={navClassName(dashboardActive)}>
            Dashboard
          </Link>
          <Link href="/admin" className={navClassName(adminActive)}>
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
