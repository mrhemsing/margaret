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
    <main className="min-h-screen bg-[#f7fbfd] text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[540px] flex-col px-5 py-6 sm:px-6 md:justify-center md:py-10">
        <header className="pt-2">
          <Image src="/dailycall-logo.svg" alt="DailyCall" width={176} height={48} priority className="h-auto w-36" />
        </header>

        <section className="flex flex-1 flex-col justify-center py-8 md:flex-none md:py-10">
          <div className="grid gap-5">
            <div className="grid gap-3">
              <h1 className="text-[2rem] font-bold tracking-normal text-ink sm:text-[3rem]" style={{ lineHeight: 1.24 }}>
                Hear what a <br />
                daily call sounds like.
              </h1>
              <p className="text-lg leading-8 text-slate-600">A one-minute sample call. Free, no signup.</p>
            </div>

            <DemoLandingForm />
          </div>
        </section>

        <section className="border-t border-slate-200 py-6 text-center">
          <p className="mx-auto max-w-sm text-base leading-7 text-slate-600">
            Hear the tone, pacing, and warmth before deciding if it&apos;s right for your parent.
          </p>
        </section>

        <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pb-2 text-sm font-semibold text-slate-500">
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
