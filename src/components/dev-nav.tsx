"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const devLinks = [
  { href: "/", label: "Home" },
  { href: "/signup", label: "Signup" },
];

const dashboardLinks = [
  { href: "/dashboard/matt", label: "Matt" },
  { href: "/dashboard/chuck", label: "Chuck" },
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
  const [dashboardsOpen, setDashboardsOpen] = useState(false);
  const dashboardActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const adminActive = isActivePath(pathname, "/admin");

  useEffect(() => {
    setDashboardsOpen(false);
  }, [pathname]);

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
          <details
            className="group relative"
            open={dashboardsOpen}
            onToggle={(event) => setDashboardsOpen(event.currentTarget.open)}
          >
            <summary
              className={[
                "inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-1 font-semibold leading-none transition focus:outline-none [&::-webkit-details-marker]:hidden",
                dashboardActive
                  ? "bg-white text-ink shadow-sm"
                  : "text-white/85 hover:bg-white/15 hover:text-white focus:bg-white/15 focus:text-white",
              ].join(" ")}
            >
              <span>Dashboards</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3 w-3 shrink-0 translate-y-px transition group-open:rotate-180"
              >
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </summary>
            <div className="absolute left-0 top-full mt-2 min-w-36 rounded-2xl border border-white/15 bg-ink p-2 shadow-xl ring-1 ring-black/10">
              {dashboardLinks.map((link) => {
                const linkActive = isActivePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={[
                      "block rounded-xl px-3 py-2 font-semibold transition focus:outline-none",
                      linkActive
                        ? "bg-white text-ink"
                        : "text-white/85 hover:bg-white/15 hover:text-white focus:bg-white/15 focus:text-white",
                    ].join(" ")}
                    onClick={() => setDashboardsOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </details>
          <Link href="/admin" className={navClassName(adminActive)}>
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
