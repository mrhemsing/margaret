import Image from "next/image";

import { SiteHeader } from "@/app/components/site-header";
import { SignupForm } from "@/app/signup/signup-form";

export default function SignupPage() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-5 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader />

      <header className="relative overflow-hidden rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <Image
          src="/signup-calendar-9am-hero.png"
          alt="Calendar with a 9 AM companion call circled"
          width={1536}
          height={864}
          className="absolute inset-y-0 right-0 hidden h-full w-[48%] object-cover object-center md:block"
          priority
        />
        <div className="absolute inset-y-0 left-[42%] right-0 hidden bg-gradient-to-r from-white via-white/90 to-white/0 md:block" />
        <div className="relative max-w-3xl md:max-w-[62%]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">signup</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink md:text-5xl">Let&apos;s schedule your loved one&apos;s first companion call.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Start your free 30-day trial. <span className="hidden md:block" />No credit card required. Setup takes less than 2 minutes, works with regular phones, and can be canceled anytime.
          </p>
          <div className="mt-6 grid gap-3 text-sm font-bold text-ink sm:grid-cols-2">
            {["No credit card required", "Cancel anytime", "Works with any phone", "No app required"].map((item) => (
              <div key={item} className="rounded-full bg-brandBlue/10 px-4 py-2 text-center ring-1 ring-brandBlue/15">{item}</div>
            ))}
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.235fr_0.765fr]">
        <SignupForm />

        <aside className="rounded-[2rem] bg-ink p-6 text-cream shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-cream/60">Simple setup</p>
          <h2 className="mt-3 text-2xl font-bold">What happens next</h2>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-cream/80">
            <li>• Add your loved one&apos;s phone number.</li>
            <li>• Choose a comfortable call schedule.</li>
            <li>• Select a simple monthly plan.</li>
            <li>• Schedule the first companion call.</li>
            <li>• Your loved one uses their regular phone — no app or password required.</li>
            <li>• Most families complete setup in under 2 minutes.</li>
          </ul>
          <p className="mt-6 rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 text-cream ring-1 ring-white/10">
            During the free trial, families can experience Companion Plus features before choosing the plan that fits best.
          </p>
        </aside>
      </section>
    </main>
  );
}
