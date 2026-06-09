import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { DemoLandingForm } from "@/app/demo/demo-landing-form";

export const metadata: Metadata = {
  title: "Hear what a daily call sounds like",
  description: "A one-minute DailyCall sample call. Free, no signup.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/demo",
  },
};

export default function DemoLandingPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f7fbfd] text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[540px] flex-col px-5 py-4 sm:px-6 sm:py-6 md:justify-center md:py-10">
        <header>
          <Image src="/dailycall-logo.svg" alt="DailyCall" width={176} height={48} priority className="h-auto w-32 sm:w-36" />
        </header>

        <section className="flex flex-1 flex-col justify-center py-5 sm:py-8 md:flex-none md:py-10">
          <div className="grid gap-4 sm:gap-5">
            <div className="grid gap-2 sm:gap-3">
              <h1 className="text-[1.85rem] font-bold tracking-normal text-ink sm:text-[3rem]" style={{ lineHeight: 1.22 }}>
                Hear what a <br />
                daily call <br />
                sounds like.
              </h1>
              <p className="text-base leading-6 text-slate-600 sm:text-lg sm:leading-8">A one-minute sample call. Free, no signup.</p>
            </div>

            <DemoLandingForm />
          </div>
        </section>

        <section className="border-t border-slate-200 py-3 text-center sm:py-6">
          <p className="mx-auto max-w-sm text-sm leading-5 text-slate-600 sm:text-base sm:leading-7">
            Hear the tone, pacing, and warmth <br />
            before deciding if it&apos;s right for your parent.
          </p>
        </section>

        <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 sm:gap-y-2 sm:pb-2 sm:text-sm">
          <span>© 2026 DailyCall</span>
          <span aria-hidden="true">·</span>
          <Link href="/privacy-policy" className="text-brandButtonBlue hover:text-ink">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/" className="text-brandButtonBlue hover:text-ink">
            About DailyCall
          </Link>
        </footer>
      </div>
    </main>
  );
}
