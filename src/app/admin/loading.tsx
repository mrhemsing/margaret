import { SiteHeader } from "@/app/components/site-header";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={"skeleton-shimmer rounded-full " + className} />;
}

export default function AdminLoading() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-5 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="absolute right-6 top-4 z-10 inline-flex w-20 items-center justify-end whitespace-nowrap text-sm font-bold text-ink md:right-10" aria-live="polite">
        Loading<span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
      </div>
      <SiteHeader showLoginLink={false} showAccountControls={false} />

      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">
        <SkeletonBlock className="h-3 w-36" />
        <SkeletonBlock className="mt-5 h-10 w-64 max-w-full sm:h-12 sm:w-96" />
        <div className="mt-5 grid max-w-2xl gap-3">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-11/12" />
          <SkeletonBlock className="h-4 w-8/12" />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <article key={item} className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/5 sm:rounded-3xl sm:p-6">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-3 h-9 w-16" />
          </article>
        ))}
      </section>

      <section className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          {[0, 1].map((item) => (
            <article key={item} className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
              <SkeletonBlock className="h-5 w-32" />
              <div className="mt-5 grid gap-3">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-10/12" />
                <SkeletonBlock className="h-4 w-7/12" />
              </div>
            </article>
          ))}
        </div>
        <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
          <SkeletonBlock className="h-5 w-40" />
          <div className="mt-5 grid gap-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <SkeletonBlock key={item} className="h-4 w-full" />
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
