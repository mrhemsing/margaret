import Link from "next/link";

import { SiteHeader } from "@/app/components/site-header";

export default function NotFound() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 pb-8 pt-0 sm:px-6 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader />
      <section className="mx-auto grid w-full max-w-2xl gap-5 rounded-[2rem] bg-white/85 p-8 text-center shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-sage">404</p>
        <h1 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">Page not found</h1>
        <p className="text-base leading-7 text-slate-600">
          This page may have moved, or the link may no longer be available.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover">
            Go home
          </Link>
          <Link href="/support" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-ink shadow-sm ring-1 ring-black/10 hover:bg-slate-50">
            Contact support
          </Link>
        </div>
      </section>
    </main>
  );
}
