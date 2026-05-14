import { SiteHeader } from "@/app/components/site-header";
import { LandingPage } from "./landing-page";

function ComingSoonPage() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-5 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader showLoginLink={false} />
      <section className="flex flex-1 items-center justify-center py-16 text-center">
        <div className="max-w-2xl rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">Dailycall</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink md:text-6xl">Coming soon.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            We&apos;re getting Dailycall ready: friendly companion calls for aging parents and peace of mind for families.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return process.env.APP_ENV === "production" ? <ComingSoonPage /> : <LandingPage />;
}
