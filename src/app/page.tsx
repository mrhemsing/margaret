import Image from "next/image";
import Link from "next/link";

const plans = [
  { name: "1 call/day", price: "$34.95", detail: "A daily wellness check-in call, 7 days a week." },
  { name: "2 calls/day", price: "$64.95", detail: "Morning and evening check-ins for extra reassurance." },
  { name: "3 calls/day", price: "$89.95", detail: "Frequent touchpoints for families who want tighter coverage." },
];

const steps = [
  "An adult child chooses a call schedule for their parent.",
  "Dailycall places a brief, friendly voice check-in.",
  "The family receives a simple text report after each completed call.",
  "If there is no response or a concern comes up, Dailycall alerts the family quickly.",
];

export default function SalesPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-8 md:px-10">
      <nav className="flex items-center justify-between rounded-full bg-white/75 px-5 py-3 shadow-sm ring-1 ring-black/5">
        <Image src="/dailycall-logo.jpg" alt="dailycall" width={632} height={150} priority className="h-auto w-40" />
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <Link href="/dashboard" className="hidden hover:text-ink sm:inline">Login</Link>
          <Link href="/signup" className="rounded-full bg-brandButtonBlue px-4 py-2 text-cream shadow-sm hover:bg-brandButtonBlueHover">
            Get started
          </Link>
        </div>
      </nav>

      <header className="overflow-hidden rounded-[2rem] bg-white/75 shadow-sm ring-1 ring-black/5">
        <div className="relative min-h-[670px] sm:min-h-[560px] md:min-h-[500px]">
          <Image
            src="/home-splash-mobile-senior-call-straight-phone.png"
            alt="Smiling senior on a phone call for a Dailycall check-in"
            width={1024}
            height={828}
            priority
            className="absolute inset-0 h-full w-full object-cover object-[-80px_-120px] sm:hidden"
          />
          <Image
            src="/home-splash-desktop-phone-smile.jpg"
            alt="Smiling senior on the phone for a Dailycall check-in"
            width={1280}
            height={1099}
            priority
            className="absolute inset-0 hidden h-full w-full object-cover object-[73px_-111px] sm:block"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,white_0%,rgba(255,255,255,0.96)_33%,rgba(255,255,255,0.82)_47%,transparent_61%)] sm:bg-[linear-gradient(to_right,white_0%,rgba(255,255,255,0.82)_32%,transparent_58%)]" />
          <div className="relative flex min-h-[670px] max-w-3xl flex-col justify-between p-6 sm:block sm:min-h-0 sm:p-8 md:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">daily wellness calls</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink sm:mt-5 sm:text-4xl md:text-5xl xl:text-6xl">
                <span className="md:hidden">Peace of mind with daily voice check‑ins.</span>
                <span className="hidden md:inline">Peace of mind with<br />daily voice check‑ins.</span>
              </h1>
            </div>
            <div className="pt-10 sm:pt-0">
              <p className="text-lg leading-8 text-slate-600 sm:mt-5 md:max-w-[70%]">
                Dailycall helps adult children monitor aging parents who live alone with scheduled voice calls, clear text reports, and fast alerts when a parent suddenly does not answer.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="rounded-full bg-brandButtonBlue px-6 py-3 text-center font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover">
                  Start signup
                </Link>
                <a href="#plans" className="rounded-full bg-white/85 px-6 py-3 text-center font-semibold text-ink shadow-sm ring-1 ring-black/10 hover:bg-white">
                  View plans
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm font-semibold uppercase tracking-wide text-sage">For adult children</p>
          <h2 className="mt-3 text-2xl font-bold text-ink">Know Mom or Dad answered.</h2>
          <p className="mt-3 leading-7 text-slate-600">A concise text report confirms each check-in so you are not left wondering if everything is okay.</p>
        </article>
        <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm font-semibold uppercase tracking-wide text-sage">For parents</p>
          <h2 className="mt-3 text-2xl font-bold text-ink">Friendly, brief calls.</h2>
          <p className="mt-3 leading-7 text-slate-600">Calls are short, conversational, and designed to feel supportive rather than clinical or intrusive.</p>
        </article>
        <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm font-semibold uppercase tracking-wide text-sage">No-response alerts</p>
          <h2 className="mt-3 text-2xl font-bold text-ink">Know when they do not answer.</h2>
          <p className="mt-3 leading-7 text-slate-600">If a parent suddenly misses a check-in or asks for help, the family is notified quickly so someone can follow up.</p>
        </article>
      </section>

      <section className="rounded-[2rem] bg-ink p-8 text-cream shadow-sm md:p-10">
        <div className="grid gap-8 md:grid-cols-[0.8fr_1fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cream/60">How it works</p>
            <h2 className="mt-3 text-3xl font-bold">Built around monitoring and alerts.</h2>
          </div>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl bg-white/10 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream font-bold text-ink">{index + 1}</span>
                <p className="leading-7 text-cream/85">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-semibold uppercase tracking-wide text-sage">{plan.name}</p>
            <p className="mt-3 text-4xl font-bold text-ink">{plan.price}<span className="text-base font-medium text-slate-500"> / mo</span></p>
            <p className="mt-3 min-h-14 text-sm leading-6 text-slate-600">{plan.detail}</p>
            <Link href="/signup" className="mt-6 inline-flex rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-semibold text-cream hover:bg-brandButtonBlueHover">
              Choose plan
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-3xl bg-white/80 p-6 text-sm leading-7 text-slate-600 shadow-sm ring-1 ring-black/5">
        <p className="font-semibold text-ink">Service disclaimer</p>
        <p className="mt-2">
          Dailycall is a wellness check-in and family notification service. It is not a substitute for home care, nursing, social work, emergency response, or medical advice.
        </p>
      </section>
    </main>
  );
}

