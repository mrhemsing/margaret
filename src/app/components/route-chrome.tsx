"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/app/components/site-footer";

export function RouteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDemoLandingPage = pathname === "/demo";

  return (
    <>
      {isDemoLandingPage ? null : (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-56 bg-gradient-to-b from-white via-white/85 to-transparent" />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-64 bg-gradient-to-t from-white via-white/90 to-transparent" />
        </>
      )}
      <div className="relative z-10">
        {children}
        {isDemoLandingPage ? null : <SiteFooter />}
      </div>
    </>
  );
}
