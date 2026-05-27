"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AutoCloseDetails } from "@/app/components/auto-close-details";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type SiteHeaderLink = {
  href: string;
  label: string;
  active?: boolean;
};

type SiteHeaderProps = {
  showLoginLink?: boolean;
  showTrialButton?: boolean;
  showAccountControls?: boolean;
  initialAuthenticated?: boolean;
  links?: SiteHeaderLink[];
};

const defaultMarketingLinks: SiteHeaderLink[] = [
  { href: "/#how-it-works", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path
        fill="currentColor"
        d="M6.6 10.8c1.7 3.4 3.4 5.1 6.6 6.6l2.2-2.1c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.5c0 .7-.5 1.2-1.2 1.2C10.6 21.5 2.5 13.4 2.5 3.4c0-.7.5-1.2 1.2-1.2h3.5c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.7.6 4 .1.4 0 .8-.3 1.2l-2.1 2.2Z"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <span className="flex flex-col gap-1" aria-hidden="true">
      <span className="block h-0.5 w-5 rounded-full bg-current" />
      <span className="block h-0.5 w-5 rounded-full bg-current" />
      <span className="block h-0.5 w-5 rounded-full bg-current" />
    </span>
  );
}

function AccountAvatar({ accountLabel }: { accountLabel: string }) {
  const initials = accountLabel
    .split("@")[0]
    .split(/[.\s_-]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-brandButtonBlue shadow-sm ring-1 ring-black/10"
      aria-hidden="true"
    >
      {initials || "DC"}
    </span>
  );
}

export function SiteHeader({ showLoginLink = true, showTrialButton = true, showAccountControls = true, initialAuthenticated = false, links = [] }: SiteHeaderProps) {
  const pathname = usePathname();
  const [accountEmail, setAccountEmail] = useState<string | null | undefined>(initialAuthenticated ? "" : undefined);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isDashboardPage = pathname?.startsWith("/dashboard") ?? false;
  const isDashboardSettingsPage = pathname?.startsWith("/dashboard/settings") ?? false;
  const isDashboardBillingPage = pathname?.startsWith("/dashboard/billing") ?? false;
  const authChecked = accountEmail !== undefined;
  const isAuthenticated = accountEmail !== null && accountEmail !== undefined;
  const accountLabel = accountEmail || "your account";
  const marketingLinks = links.length > 0 ? links : defaultMarketingLinks;
  const mobileMarketingLinks = marketingLinks;
  const showPendingDashboardNav = showAccountControls && isDashboardPage && !authChecked;
  const showMarketingNav = showAccountControls ? !isAuthenticated && !showPendingDashboardNav : links.length > 0;
  const showAppNav = showAccountControls && (isAuthenticated || showPendingDashboardNav);
  const showVisitorActions = showAccountControls && !isAuthenticated && !showPendingDashboardNav;
  const showDemoBar = showVisitorActions;

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

  useEffect(() => {
    if (!isDashboardPage) {
      setDashboardLoading(false);
      return;
    }

    setDashboardLoading(document.body.dataset.dailycallDashboardLoading !== "false");

    function handleDashboardLoading(event: Event) {
      const loading = Boolean((event as CustomEvent<{ loading?: boolean }>).detail?.loading);
      document.body.dataset.dailycallDashboardLoading = loading ? "true" : "false";
      setDashboardLoading(loading);
    }

    window.addEventListener("dailycall:dashboard-loading", handleDashboardLoading);

    return () => {
      window.removeEventListener("dailycall:dashboard-loading", handleDashboardLoading);
    };
  }, [isDashboardPage]);

  async function signOut() {
    if (signingOut) return;

    setSigningOut(true);
    setAccountEmail(null);

    try {
      await fetch("/api/admin/sign-out", { method: "POST", credentials: "include", cache: "no-store" }).catch(() => null);

      const supabase = createBrowserSupabaseClient();
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => {
          window.setTimeout(resolve, 1500);
        }),
      ]);
    } finally {
      window.location.replace("/");
    }
  }

  const appLinks: SiteHeaderLink[] = [
    { href: "/dashboard", label: "My dashboard", active: isDashboardPage && !isDashboardSettingsPage && !isDashboardBillingPage },
    { href: "/dashboard/settings", label: "Settings", active: isDashboardSettingsPage },
    { href: "/dashboard/billing", label: "Billing", active: isDashboardBillingPage },
  ];

  return (
    <>
      {showDemoBar ? (
        <div className="relative left-1/2 z-40 -mb-4 hidden w-screen -translate-x-1/2 justify-center bg-ink px-4 py-3 text-left text-sm font-bold text-white shadow-sm md:flex md:text-center">
          <span>Hear what DailyCall sounds like - get a free 1-minute demo call right now.</span>
          <Link href="/#demo" className="ml-2 inline-flex items-center gap-1 whitespace-nowrap pl-2 text-emerald-300 hover:text-emerald-200">
            <PhoneIcon className="h-3.5 w-3.5" />
            Try a demo call
          </Link>
        </div>
      ) : null}

      <nav className="sticky top-0 z-50 ml-[calc(50%-50vw)] mt-2 w-screen bg-white/75 shadow-sm backdrop-blur md:mt-0">
        <div className="mx-auto flex min-h-[3.75rem] w-full max-w-6xl items-center justify-between px-4 py-2 md:px-10">
        <Link href="/" className="block h-[3.05rem] w-[12.2rem] shrink-0 sm:h-[3.2rem] sm:w-52" aria-label="DailyCall home">
          <Image src="/dailycall-logo.svg" alt="DailyCall" width={632} height={150} priority className="h-full w-full object-contain object-left" />
        </Link>

        {showMarketingNav ? (
          <>
            <div className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
              {marketingLinks.map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className={link.active ? "text-brandButtonBlue" : "hover:text-ink"}>
                  {link.label}
                </Link>
              ))}
            </div>
            {showVisitorActions ? (
              <div className="hidden items-center gap-3 md:flex">
                {showLoginLink ? (
                  <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-ink">
                    Log in
                  </Link>
                ) : null}
                {showTrialButton ? (
                  <Link href="/signup" className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlue">
                    Start free trial
                  </Link>
                ) : null}
              </div>
            ) : null}

            <AutoCloseDetails className="group relative z-50 md:hidden">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-white text-ink shadow-sm ring-1 ring-black/10 transition hover:text-brandButtonBlue [&::-webkit-details-marker]:hidden"
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl bg-white p-2 text-sm font-bold shadow-xl ring-1 ring-black/10">
                {mobileMarketingLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}-mobile`}
                    href={link.href}
                    className={`block rounded-xl px-3 py-2 transition hover:bg-slate-50 hover:text-brandButtonBlue ${link.active ? "text-brandButtonBlue" : "text-ink"}`}
                  >
                    {link.label}
                  </Link>
                ))}
                {showVisitorActions ? (
                  <div className="mt-1 grid gap-2 border-t border-slate-200 pt-2">
                    {showTrialButton ? (
                      <Link href="/signup" className="rounded-xl bg-ink px-3 py-2 text-left text-cream">
                        Start free trial
                      </Link>
                    ) : null}
                    {showLoginLink ? (
                      <Link href="/login" className="rounded-xl px-3 py-2 text-ink transition hover:bg-slate-50 hover:text-brandButtonBlue">
                        Log in
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </AutoCloseDetails>
          </>
        ) : showAppNav ? (
          <>
            <div className="hidden items-center gap-5 text-sm font-bold md:flex">
              {appLinks.map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className={link.active ? "text-brandButtonBlue" : "text-ink hover:text-brandButtonBlue"}>
                  {link.label}
                </Link>
              ))}
              <span className="h-6 w-px bg-slate-300" aria-hidden="true" />
              {isDashboardPage && dashboardLoading ? (
                <span className="inline-flex w-20 items-center justify-end whitespace-nowrap text-sm font-bold text-ink" aria-live="polite">
                  Loading<span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
                </span>
              ) : null}
              <AutoCloseDetails className="group relative z-50">
                <summary
                  className="cursor-pointer list-none rounded-full transition hover:scale-[1.02] [&::-webkit-details-marker]:hidden"
                  aria-label={`Open account menu for ${accountLabel}`}
                  title={`Logged in as ${accountLabel}`}
                >
                  <AccountAvatar accountLabel={accountLabel} />
                </summary>
                <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/10">
                  <p className="truncate px-3 py-2 text-xs font-semibold text-slate-500">{accountLabel}</p>
                  <Link href="/dashboard/settings" className="block rounded-xl px-3 py-2 text-sm font-bold text-ink transition hover:bg-slate-50 hover:text-brandButtonBlue">
                    Profile settings
                  </Link>
                  <form
                    action="/api/admin/sign-out"
                    method="post"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void signOut();
                    }}
                  >
                    <button
                      type="submit"
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-slate-50 hover:text-brandButtonBlue disabled:cursor-wait disabled:opacity-60"
                      disabled={signingOut}
                    >
                      {signingOut ? "Loading..." : "Sign out"}
                    </button>
                  </form>
                </div>
              </AutoCloseDetails>
            </div>

            <AutoCloseDetails className="group relative z-50 md:hidden">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-white text-ink shadow-sm ring-1 ring-black/10 transition hover:text-brandButtonBlue [&::-webkit-details-marker]:hidden"
                aria-label="Open account menu"
              >
                <MenuIcon />
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl bg-white p-2 text-sm font-bold shadow-xl ring-1 ring-black/10">
                {appLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}-mobile`}
                    href={link.href}
                    className={`block rounded-xl px-3 py-2 transition hover:bg-slate-50 hover:text-brandButtonBlue ${link.active ? "bg-sky-50 text-brandButtonBlue" : "text-ink"}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-1 border-t border-slate-200 pt-1">
                  <p className="truncate px-3 py-2 text-xs font-semibold text-slate-500">{accountLabel}</p>
                  <form
                    action="/api/admin/sign-out"
                    method="post"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void signOut();
                    }}
                  >
                    <button
                      type="submit"
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-slate-50 hover:text-brandButtonBlue disabled:cursor-wait disabled:opacity-60"
                      disabled={signingOut}
                    >
                      {signingOut ? "Loading..." : "Sign out"}
                    </button>
                  </form>
                </div>
              </div>
            </AutoCloseDetails>
          </>
        ) : null}
        </div>
      </nav>
    </>
  );
}
