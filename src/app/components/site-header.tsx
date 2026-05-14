"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type SiteHeaderLink = {
  href: string;
  label: string;
  active?: boolean;
};

type SiteHeaderProps = {
  showLoginLink?: boolean;
  showTrialButton?: boolean;
  links?: SiteHeaderLink[];
};

export function SiteHeader({ showLoginLink = true, showTrialButton = false, links = [] }: SiteHeaderProps) {
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const supabase = createBrowserSupabaseClient();
      const user = await supabase.auth.getUser();

      if (!cancelled) {
        setAccountEmail(user.data.user?.email ?? null);
      }
    }

    loadUser();

    const supabase = createBrowserSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user.email ?? null);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-5 justify-end px-2 text-sm font-semibold text-slate-600">
        {accountEmail ? (
          <Link
            href="/dashboard"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink shadow-sm ring-1 ring-black/5 hover:bg-white hover:text-brandButtonBlue"
            title={`Logged in as ${accountEmail}. Go to dashboard.`}
            aria-label={`Logged in as ${accountEmail}. Go to dashboard.`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="currentColor"
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
              />
            </svg>
          </Link>
        ) : showLoginLink ? (
          <Link href="/login" className="whitespace-nowrap hover:text-ink">
            Existing user? Login
          </Link>
        ) : null}
      </div>
      <nav className="flex min-h-[3.25rem] items-center justify-between py-1 sm:min-h-[3.5rem]">
        <Link href="/" className="block h-[2.95rem] w-[12.35rem] sm:-mt-4 sm:h-[3.32rem] sm:w-56" aria-label="Dailycall home">
          <Image src="/dailycall-logo.svg" alt="dailycall" width={632} height={150} priority className="h-full w-full object-contain object-left" />
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          {links.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className={link.active ? "text-sage" : "hover:text-ink"}>
              {link.label}
            </Link>
          ))}
          {showTrialButton ? (
            <Link href="/signup" className="rounded-full bg-brandButtonBlue px-4 py-2 text-sm font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover">
              <span className="sm:hidden">Start free trial</span>
              <span className="hidden sm:inline">Start free 30-day trial</span>
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
