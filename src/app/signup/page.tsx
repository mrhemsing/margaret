import Image from "next/image";
import Link from "next/link";

import { SignupForm } from "@/app/signup/signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-8 md:px-10">
      <nav className="flex items-center justify-between rounded-full bg-white/75 px-5 py-3 shadow-sm ring-1 ring-black/5">
        <Link href="/">
          <Image src="/dailycall-logo.jpg" alt="dailycall" width={632} height={150} priority className="h-auto w-40" />
        </Link>
        <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-ink">Already signed up?</Link>
      </nav>

      <header className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">signup</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink md:text-5xl">Set up daily check-ins for your parent.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          This client-facing signup flow is for the adult child purchasing Dailycall. It captures who should receive reports and no-response alerts, the parent receiving calls, and the daily call schedule.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <SignupForm />

        <aside className="rounded-[2rem] bg-ink p-6 text-cream shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-cream/60">Secure checkout</p>
          <h2 className="mt-3 text-2xl font-bold">What happens next</h2>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-cream/80">
            <li>• Create the care profile for your parent.</li>
            <li>• Choose the daily call frequency.</li>
            <li>• Complete subscription payment through Stripe.</li>
            <li>• Dailycall stores your report and alert contact.</li>
            <li>• After payment, the account is ready for scheduling and test calls.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
