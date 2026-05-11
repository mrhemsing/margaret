import Image from "next/image";
import Link from "next/link";

export default function DashboardIndexPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8 md:px-10">
      <nav className="flex items-center justify-between rounded-full bg-white/75 px-5 py-3 shadow-sm ring-1 ring-black/5">
        <Link href="/">
          <Image src="/dailycall-logo.jpg" alt="dailycall" width={632} height={150} priority className="h-auto w-40" />
        </Link>
        <div className="flex items-center text-sm font-semibold">
          <span className="rounded-full bg-sage/15 px-3 py-1 text-sage">Dashboard</span>
        </div>
      </nav>

      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">Choose member</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink md:text-5xl">Open a focused Dailycall dashboard.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          Matt and Chuck each have their own page now, so calls, transcripts, memory, and retention signals stay scoped to the right person.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        <Link
          href="/dashboard/matt"
          className="group flex min-h-64 flex-col justify-between rounded-[2rem] border-2 border-brandButtonBlue/35 bg-white p-6 shadow-lg shadow-brandBlue/10 ring-1 ring-brandButtonBlue/10 transition hover:-translate-y-1 hover:border-brandButtonBlue hover:shadow-xl hover:shadow-brandBlue/20 focus:outline-none focus:ring-4 focus:ring-brandButtonBlue/25"
        >
          <div>
            <p className="inline-flex rounded-full bg-sage/15 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-sage">Matt</p>
            <h2 className="mt-4 text-2xl font-bold text-ink">Matt&apos;s dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open Matt&apos;s focused calls, transcripts, memory, metrics, and test-call control.</p>
          </div>
          <span className="mt-8 inline-flex items-center justify-center rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm transition group-hover:bg-brandButtonBlueHover">
            Open Matt&apos;s dashboard <span className="ml-2 text-lg leading-none">→</span>
          </span>
        </Link>

        <Link
          href="/dashboard/chuck"
          className="group flex min-h-64 flex-col justify-between rounded-[2rem] border-2 border-brandButtonBlue/35 bg-white p-6 shadow-lg shadow-brandBlue/10 ring-1 ring-brandButtonBlue/10 transition hover:-translate-y-1 hover:border-brandButtonBlue hover:shadow-xl hover:shadow-brandBlue/20 focus:outline-none focus:ring-4 focus:ring-brandButtonBlue/25"
        >
          <div>
            <p className="inline-flex rounded-full bg-sage/15 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-sage">Chuck</p>
            <h2 className="mt-4 text-2xl font-bold text-ink">Chuck&apos;s dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open Chuck&apos;s focused calls, transcripts, memory, metrics, and test-call control.</p>
          </div>
          <span className="mt-8 inline-flex items-center justify-center rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm transition group-hover:bg-brandButtonBlueHover">
            Open Chuck&apos;s dashboard <span className="ml-2 text-lg leading-none">→</span>
          </span>
        </Link>
      </section>
    </main>
  );
}
