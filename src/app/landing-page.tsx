import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/app/components/site-header";
import { DemoCallForm } from "./demo-call-form";
import { TestimonialsCarousel } from "./testimonials-carousel";

const heroProof = [
  { label: "No app required", mobileOnly: true },
  { label: "Works with regular phones" },
  { label: "No credit card required", mobileOnly: true },
  { label: "Setup in under 2 minutes" },
  { label: "Cancel anytime", mobileOnly: true },
];

const steps = [
  { title: "Choose a call schedule", copy: "Pick the time of day that feels natural for your loved one." },
  { title: "They receive friendly calls", copy: "DailyCall becomes a familiar voice for connection, routine, and encouragement." },
  { title: "You get peace-of-mind updates", copy: "Family-friendly text message summaries and missed-call alerts help you know when to follow up." },
];

const seniorBenefits = [
  "Friendly conversations that feel calm, patient, and familiar",
  "Remembers family, routines, pets, hobbies, and preferences",
  "Can talk about music, memories, daily life, prayer, trivia, or simple company",
  "Never requires an app, password, screen, or technical setup",
];

const familyBenefits = [
  "Daily companionship calls for a loved one who may be alone",
  "Family visibility into engagement, mood, and routine changes",
  "Missed-call alerts and gentle escalation when something seems off",
  "Peace of mind without making the senior feel watched or monitored",
];

const memoryExamples = [
  "How did your grandson's hockey tournament go?",
  "Did your dog recover from surgery?",
  "You mentioned your husband loved jazz music.",
];

const rituals = [
  { label: "Morning coffee chats", image: "/rituals/coffee-elderly-woman.jpg", position: "50% 24%" },
  { label: "Evening check-ins", image: "/rituals/evening-elderly-man.jpg", position: "50% 28%" },
  { label: "Trivia games", image: "/rituals/trivia-elderly-man.jpg", position: "50% 30%" },
  { label: "Music discussions", image: "/rituals/music-elderly-woman.jpg", position: "50% 24%" },
  { label: "Prayer or reflection", image: "/rituals/reflection-elderly-woman.jpg", position: "50% 26%" },
  { label: "Memory-lane stories", image: "/rituals/memory-elderly-man.jpg", position: "50% 28%" },
];

const testimonials = [
  {
    quote: "I live across the country from my mom, and the daily calls have given me so much peace of mind. She actually looks forward to them every morning now.",
    name: "Sarah M.",
    location: "Vancouver",
    image: "/testimonials/sarah.png",
  },
  {
    quote: "After my dad lost his wife, the house became very quiet. These conversations helped bring some routine and connection back into his day.",
    name: "Michael T.",
    location: "Seattle",
    image: "/testimonials/michael.png",
  },
  {
    quote: "It is nice knowing someone will call every day just to chat and check in. The conversations feel warm and friendly.",
    name: "Margaret R.",
    location: "Calgary",
    image: "/testimonials/margaret.png",
  },
  {
    quote: "The missed-call alerts are incredibly reassuring. I do not feel like I have to constantly worry anymore.",
    name: "Jennifer L.",
    location: "Toronto",
    image: "/testimonials/jennifer.png",
  },
  {
    quote: "What surprised me most is that my mom genuinely enjoys the calls. It does not feel like a monitoring service - it feels like companionship.",
    name: "Emily K.",
    location: "Portland",
    image: "/testimonials/emily.png",
  },
];

const trustItems = [
  "No app or password for seniors",
  "Works with regular phones and landlines",
  "Family summaries written for reassurance",
  "Missed-call alerts after unanswered attempts",
];

const plans = [
  {
    name: "Companion Daily",
    price: "$14.95",
    eyebrow: "1 caring call per day",
    bestFor: "A reliable morning call to help your loved one feel connected, supported, and safe.",
    includes: [
      "1 daily companion call, 7 days a week",
      "Missed-call alert after 2 unanswered attempts",
      "1 family alert contact",
      "Access to call transcripts",
      "Simple wellness check-in",
      "Friendly conversation and daily encouragement",
    ],
    cta: "Start Free 30-Day Trial",
    featured: false,
  },
  {
    name: "Companion Plus",
    price: "$29.95",
    eyebrow: "Up to 3 caring calls per day",
    bestFor: "More frequent support, deeper companionship, and flexible daily conversations throughout the day.",
    includes: [
      "Up to 3 daily companion calls, 7 days a week",
      "Up to 10 family alert contacts",
      "Up to 10 custom questions for the companion to ask",
      "Unlimited conversation time",
      "Personalized daily conversations",
      "Advanced daily planning help",
      "Weather-aware activity suggestions",
      "Shopping, cooking, exercise, and outdoor activity support",
      "Optional encouragement, quote, prayer, reflection, or memory prompt",
      "Expanded call transcripts and summaries",
    ],
    cta: "Start Free 30-Day Trial",
    featured: true,
  },
];

const pricingComparisonRows = [
  ["Price", "$14.95/mo", "$29.95/mo"],
  ["Free Trial", "30 days", "30 days"],
  ["Calls Per Day", "1", "Up to 3"],
  ["Missed-Call Alerts", "Yes", "Yes"],
  ["Alert Contacts", "1", "Up to 10"],
  ["Call Transcripts", "Yes", "Yes"],
  ["Custom Questions", "No", "Up to 10"],
  ["Conversation Time", "Standard", "Unlimited"],
  ["Daily Planning Help", "Basic", "Advanced"],
];

const faqs = [
  ["Does my parent need an app?", "No. DailyCall works by phone and can call landlines."],
  ["Is this hard to set up?", "No. Families can sign up and start calls in just a few minutes. No credit card required."],
  ["What does DailyCall talk about?", "DailyCall can chat about daily life, memories, family, hobbies, music, routines, and more."],
  ["Can I see how my loved one is doing?", "Yes. Family accounts include helpful insights into engagement, mood trends, missed calls, and changes in routine."],
  ["Is DailyCall replacing human contact?", "No. DailyCall is designed to support connection, not replace family, friends, caregivers, or emergency services."],
  ["Can I change how often it calls?", "Yes. Call timing and routines can be adjusted as your loved one's needs change."],
  [
    "How does DailyCall protect my parent's privacy?",
    "DailyCall keeps calls protected under our privacy policy, and we take your privacy very seriously. We use conversation details only to provide the service, improve quality, and create helpful family insights like mood, engagement, and positive topics. We do not sell personal data, and we protect it with strong security practice",
  ],
];

function CheckIcon() {
  return <span className="bullet-dot h-2 w-2 shrink-0 rounded-full bg-brandPink" aria-hidden="true" />;
}

export function LandingPage() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-5 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader showTrialButton />

      <header className="overflow-hidden rounded-[2rem] bg-white/75 shadow-sm ring-1 ring-black/5">
        <div className="relative">
          <Image
            src="/home-splash-mobile-senior-call-straight-phone.png"
            alt="Smiling senior on a phone call for a DailyCall check-in"
            width={1024}
            height={828}
            priority
            className="mobile-splash-image absolute inset-0 h-full w-full object-cover sm:hidden"
          />
          <Image
            src="/home-splash-desktop-phone-smile.jpg"
            alt="Smiling senior on the phone for a DailyCall check-in"
            width={1280}
            height={1099}
            priority
            className="desktop-splash-image absolute inset-0 hidden h-full w-full object-cover sm:block"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,white_0%,rgba(255,255,255,0.97)_35%,rgba(255,255,255,0.84)_46%,transparent_63%)] sm:bg-[linear-gradient(to_right,white_0%,rgba(255,255,255,0.88)_36%,transparent_62%)]" />
          <div className="relative flex max-w-3xl flex-col justify-between p-6 sm:block sm:p-8 md:p-12">
            <div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl md:text-4xl xl:text-5xl">
                Someone to talk to when<span className="hidden md:inline"><br /></span><span className="md:hidden"> </span>you can&apos;t be there.
              </h1>
            </div>
            <div className="pt-10 sm:pt-0">
              <p className="mt-4 w-[65%] max-w-[65%] -translate-y-10 text-lg leading-8 text-slate-600 md:mt-5 md:w-auto md:max-w-[72%] md:translate-y-0">
                Simple daily companion calls that help aging parents feel connected, supported, and safe.
              </p>
              <p className="mt-4 hidden text-sm font-extrabold uppercase tracking-normal text-ink sm:flex sm:flex-wrap sm:gap-x-2 sm:gap-y-1 sm:text-base">
                <span className="block whitespace-nowrap sm:inline">NO CREDIT CARD REQUIRED</span>
                <span className="hidden sm:inline" aria-hidden="true">•</span>
                <span className="whitespace-nowrap">CANCEL ANYTIME</span>
                <span className="mx-1 sm:mx-0" aria-hidden="true">•</span>
                <span className="whitespace-nowrap">NO APP NEEDED</span>
              </p>
              <div className="mt-6 grid gap-2 text-base md:text-sm font-semibold text-ink sm:max-w-xl sm:grid-cols-2">
                {heroProof.map((item) => (
                  <div
                    key={item.label}
                    className={`items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-black/5 ${item.mobileOnly ? "flex sm:hidden" : "flex"}`}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brandPink" aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="rounded-full bg-brandButtonBlue px-6 py-3 text-center font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover">
                  Start Your Free 30-Day Trial
                </Link>
                <a href="#how-it-works" className="rounded-full bg-white/85 px-6 py-3 text-center font-semibold text-ink shadow-sm ring-1 ring-black/10 hover:bg-white">
                  See how it works
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section data-mobile-reveal id="how-it-works" className="rounded-[2rem] bg-ink p-8 text-cream shadow-sm md:p-10">
        <div className="grid gap-8 md:grid-cols-[0.75fr_1fr] md:items-center">
          <div>
            <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-brandPink">How it works</p>
            <h2 className="mt-3 text-3xl font-bold">Simple support, without new technology to learn.</h2>
            <p className="mt-4 leading-7 text-cream/75">Choose a daily call schedule, your loved one receives friendly calls, and you receive peace-of-mind updates by text message. No app. No passwords. No complicated setup.</p>
          </div>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-4 rounded-2xl bg-white/10 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream font-bold text-ink">{index + 1}</span>
                <div>
                  <h3 className="font-bold text-cream">{step.title}</h3>
                  <p className="mt-1 leading-7 text-cream/80">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-mobile-reveal id="demo" className="overflow-hidden rounded-[2rem] bg-brandBlue/10 shadow-sm ring-1 ring-brandBlue/15">
        <div className="grid gap-6 p-6 md:grid-cols-[0.95fr_1.05fr] md:items-end md:p-10">
          <div>
            <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Try a demo call</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Hear what a DailyCall feels like.</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Enter your phone number and DailyCall will place a one-minute demo call so families can experience the tone, pacing, and simplicity before setting up a loved one.
            </p>
            <div className="mt-5 grid gap-2 text-base md:text-sm font-semibold text-ink sm:grid-cols-3">
              {["1-minute sample", "Calls your phone", "No app needed"].map((item) => (
                <div key={item} className="rounded-full bg-white/80 px-4 py-2 text-center shadow-sm ring-1 ring-black/5">{item}</div>
              ))}
            </div>
            <div className="mt-6 rounded-[2rem] bg-ink p-5 text-cream shadow-sm md:flex md:min-h-[360px] md:flex-col md:justify-center">
              <p className="text-sm md:text-xs font-semibold uppercase tracking-wide text-cream/50">Sample conversation</p>
              <div className="mt-4 grid gap-3 text-base md:text-sm leading-6">
                <p className="max-w-[88%] rounded-2xl bg-white/10 p-3">Hi, this is DailyCall. I am calling for a quick friendly check-in. How is your morning going?</p>
                <p className="ml-auto max-w-[88%] rounded-2xl bg-brandPink p-3 font-semibold text-white">Pretty good. I just finished coffee.</p>
                <p className="max-w-[88%] rounded-2xl bg-white/10 p-3">That sounds nice. A little music can be a lovely way to start the day — have you listened to anything this morning?</p>
              </div>
            </div>
          </div>
          <DemoCallForm />
        </div>
      </section>

      <section data-mobile-reveal className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Connection</p>
          <h2 className="mt-3 text-2xl font-bold text-ink">Someone to talk to when you can&apos;t be there.</h2>
          <p className="mt-3 leading-7 text-slate-600">Life gets busy. Companion calls help loved ones feel connected even when families can&apos;t call every day.</p>
        </article>
        <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Routine</p>
          <h2 className="mt-3 text-2xl font-bold text-ink">A familiar daily voice.</h2>
          <p className="mt-3 leading-7 text-slate-600">The goal is not technology for its own sake. It is connection, routine, reassurance, companionship — and helping keep seniors’ minds active while sparking joy through meaningful conversation.</p>
        </article>
        <article className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Relief for families</p>
          <h2 className="mt-3 text-2xl font-bold text-ink">A little less worry.</h2>
          <p className="mt-3 leading-7 text-slate-600">For adult children balancing distance, guilt, and caregiver stress, DailyCall adds a steady touchpoint.</p>
        </article>
      </section>

      <section data-mobile-reveal className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Why seniors love it</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">A familiar voice, not another piece of software.</h2>
          <ul className="mt-5 grid gap-3 text-base md:text-sm leading-6 text-slate-600">
            {seniorBenefits.map((item) => (
              <li key={item} className="flex gap-3"><CheckIcon /><span>{item}</span></li>
            ))}
          </ul>
        </article>
        <article className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Why families choose it</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Peace of mind without surveillance.</h2>
          <ul className="mt-5 grid gap-3 text-base md:text-sm leading-6 text-slate-600">
            {familyBenefits.map((item) => (
              <li key={item} className="flex gap-3"><CheckIcon /><span>{item}</span></li>
            ))}
          </ul>
        </article>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Memory and personalization</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Conversations feel continuous, not repetitive.</h2>
            <p className="mt-4 leading-7 text-slate-600">
              DailyCall remembers what matters - family members, routines, interests, pets, hobbies, and ongoing conversations - so every call feels more personal over time.
            </p>
          </div>
          <div className="grid gap-3">
            {memoryExamples.map((example) => (
              <blockquote key={example} className="rounded-2xl bg-brandBlue/10 p-5 text-lg font-semibold leading-8 text-ink ring-1 ring-brandBlue/15">
                &quot;{example}&quot;
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section data-mobile-reveal className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Rituals and routine</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Humans bond through ritual.</h2>
          <p className="mt-4 leading-7 text-slate-600">DailyCall becomes part of your loved one&apos;s daily rhythm: a call after coffee, an evening wind-down, a trivia game, or a familiar music conversation.</p>
        </article>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rituals.map((ritual) => (
            <div key={ritual.label} className="group relative min-h-32 overflow-hidden rounded-3xl bg-ink text-center font-bold text-white shadow-sm ring-1 ring-black/5 sm:min-h-36">
              <Image src={ritual.image} alt="" fill sizes="(min-width: 1024px) 16rem, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" style={{ objectPosition: ritual.position }} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-center text-lg leading-6 text-white drop-shadow-sm">
                {ritual.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-brandBlue/10 p-6 shadow-sm ring-1 ring-brandBlue/15 md:p-10">
        <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Family dashboard</p>
        <h2 className="mt-3 text-3xl font-bold text-ink">Helpful insight, carefully framed.</h2>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Get helpful insights into mood, engagement, missed calls, and routine changes - without making the experience feel clinical. DailyCall is companionship first, with family reassurance in the background.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["Mood trends", "Wellness indicators", "Loneliness risk signals", "Missed-call alerts", "Cognitive change indicators", "Emergency escalation options"].map((item) => (
            <div key={item} className="rounded-2xl bg-white/80 p-4 text-base md:text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5">{item}</div>
          ))}
        </div>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-white/70 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <div className="max-w-3xl">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">What families are saying</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Warm, comforting, and emotionally safe.</h2>
          <p className="mt-4 leading-7 text-slate-600">The strongest stories are simple: more peace of mind, less loneliness, and an easier daily routine for everyone involved.</p>
        </div>
        <TestimonialsCarousel testimonials={testimonials} />
      </section>

      <section data-mobile-reveal id="plans" className="grid gap-5">
        <div className="text-center">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Companionship for them. Peace of mind for you.</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">Both plans include a 30-day free trial with no credit card required.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
          {plans.map((plan) => (
            <article key={plan.name} className={`flex flex-col rounded-3xl p-6 shadow-sm ring-1 md:h-full ${plan.featured ? "bg-ink text-cream ring-ink" : "bg-white/80 text-ink ring-black/5"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-base md:text-sm font-semibold uppercase tracking-wide ${plan.featured ? "text-cream/60" : "text-sage"}`}>{plan.name}</p>
                {plan.featured ? <span className="rounded-full bg-brandPink px-3 py-1 text-sm md:text-xs font-bold text-white">Most popular</span> : null}
              </div>
              <p className="mt-3 text-4xl font-bold">{plan.price}<span className={`text-base font-medium ${plan.featured ? "text-cream/60" : "text-slate-500"}`}> CAD/USD / mo</span></p>
              <p className={`mt-1 text-sm md:text-xs font-semibold uppercase tracking-wide ${plan.featured ? "text-cream/50" : "text-slate-500"}`}>Introductory first-year price</p>
              <p className={`mt-2 text-base md:text-sm font-bold ${plan.featured ? "text-cream" : "text-ink"}`}>{plan.eyebrow}</p>
              <p className={`mt-3 min-h-12 text-base md:text-sm leading-6 ${plan.featured ? "text-cream/75" : "text-slate-600"}`}>{plan.bestFor}</p>
              <ul className={`mt-5 grid gap-2 text-base md:text-sm leading-6 ${plan.featured ? "text-cream/80" : "text-slate-600"}`}>
                {plan.includes.map((item) => <li key={item} className="flex gap-3"><CheckIcon /><span>{item}</span></li>)}
              </ul>
              <div className={plan.featured ? "grow min-h-10" : "grow min-h-6"} />
              <Link href="/signup" className={`inline-flex rounded-full px-5 py-3 text-base md:text-sm font-semibold shadow-sm md:w-fit md:translate-y-0 ${plan.featured ? "bg-cream text-ink hover:bg-white" : "bg-brandButtonBlue text-cream hover:bg-brandButtonBlueHover"}`}>
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section data-mobile-reveal className="relative overflow-hidden rounded-[2rem] bg-white/80 p-4 shadow-sm ring-1 ring-black/5 md:p-6">
        <Image
          src="/elderly-man-phone-cta.jpg"
          alt="Older man smiling while talking on the phone"
          width={1280}
          height={720}
          className="absolute inset-y-0 right-0 hidden h-full w-[75%] object-cover object-center opacity-65 xl:block"
        />
        <div
          className="absolute inset-y-0 right-0 hidden w-[75%] xl:block"
          style={{ background: "linear-gradient(to right, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 18%, rgba(255, 255, 255, 0.52) 50%, rgba(255, 255, 255, 0.1) 62%)" }}
        />
        <div className="relative p-2 md:p-4 xl:max-w-[68%]">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Plan comparison</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Choose the daily rhythm that fits.</h2>
          <p className="mt-3 text-base md:text-sm leading-6 text-slate-600 md:hidden">A compact view of the biggest differences. The full comparison appears on larger screens.</p>
        </div>

        <div className="relative grid gap-4 md:hidden">
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <p className="text-sm md:text-xs font-bold uppercase tracking-wide text-sage">Daily</p>
              <p className="mt-2 text-2xl font-bold text-ink">$14.95</p>
              <p className="text-sm md:text-xs text-slate-500">CAD/USD / month</p>
              <p className="mt-3 text-base md:text-sm font-semibold leading-5 text-ink">1 caring call per day</p>
            </article>
            <article className="rounded-3xl bg-ink p-4 text-cream shadow-sm ring-1 ring-ink">
              <p className="text-sm md:text-xs font-bold uppercase tracking-wide text-cream/60">Plus</p>
              <p className="mt-2 text-2xl font-bold">$29.95</p>
              <p className="text-sm md:text-xs text-cream/60">CAD/USD / month</p>
              <p className="mt-3 text-base md:text-sm font-semibold leading-5">Up to 3 calls per day</p>
            </article>
          </div>

          <div className="grid gap-2 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            {[
              ["Free trial", "30 days", "30 days"],
              ["Missed-call alerts", "Yes", "Yes"],
              ["Alert contacts", "1", "Up to 10"],
              ["Custom questions", "No", "Up to 10"],
              ["Conversation time", "Standard", "Unlimited"],
              ["Daily planning", "Basic", "Advanced"],
            ].map(([feature, daily, plus]) => (
              <div key={feature} className="grid grid-cols-[1.25fr_0.75fr_0.75fr] items-center gap-2 border-b border-slate-100 py-2 last:border-b-0">
                <span className="text-sm md:text-xs font-semibold leading-5 text-slate-600">{feature}</span>
                <span className="rounded-full bg-brandBlue/10 px-3 py-1.5 text-center text-sm md:text-xs font-bold leading-5 text-brandButtonBlue">{daily}</span>
                <span className="rounded-full bg-ink px-3 py-1.5 text-center text-sm md:text-xs font-bold leading-5 text-cream">{plus}</span>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-brandBlue/10 p-4 shadow-sm ring-1 ring-brandBlue/15">
            <p className="text-base md:text-sm font-bold text-ink">Plus is best when they&apos;d benefit from extra connection during the day.</p>
            <p className="mt-2 text-base md:text-sm leading-6 text-slate-600">It adds more calls, more alert contacts, custom questions, unlimited conversation time, and advanced daily planning support.</p>
          </div>
        </div>

        <div className="relative hidden overflow-x-auto md:block xl:max-w-[68%]">
          <table className="min-w-[680px] border-separate border-spacing-0 text-left text-base md:text-sm">
            <thead>
              <tr className="text-ink">
                <th className="rounded-l-2xl bg-brandBlue/10 p-4 font-bold">Feature</th>
                <th className="bg-brandBlue/10 p-4 font-bold">Companion Daily</th>
                <th className="rounded-r-2xl bg-brandBlue/10 p-4 font-bold">Companion Plus</th>
              </tr>
            </thead>
            <tbody>
              {pricingComparisonRows.map((row) => (
                <tr key={row[0]} className="border-b border-slate-100">
                  {row.map((cell, index) => (
                    <td key={`${row[0]}-${index}`} className={`border-b border-slate-100 p-4 ${index === 2 ? "font-bold text-ink" : "text-slate-600"}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="relative p-4 text-base md:text-sm font-semibold leading-6 text-ink xl:max-w-[68%]">A simple call. A familiar voice. A little more peace of mind.</p>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Trust & privacy</p>
        <h2 className="mt-3 text-3xl font-bold text-ink">Designed to feel supportive, not intrusive.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item} className="rounded-2xl bg-brandBlue/10 p-4 text-base md:text-sm font-bold leading-6 text-ink ring-1 ring-brandBlue/15">{item}</div>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-base md:text-sm leading-7 text-slate-600">DailyCall is a family reassurance service. Summaries and alerts are meant to help families stay connected, not make seniors feel monitored.</p>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">FAQ</p>
        <h2 className="mt-3 text-3xl font-bold text-ink">Simple answers for families.</h2>
        <div className="mt-6 grid gap-3 xl:grid-cols-2">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:ring-brandBlue/25 open:ring-brandBlue/25 xl:min-h-24">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                <span>{question}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandBlue/10 text-lg leading-none text-brandButtonBlue transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-base md:text-sm leading-6 text-slate-600">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section data-mobile-reveal className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-center text-cream shadow-sm md:p-10 md:text-left">
        <Image
          src="/family-parent-happy-cta.jpg"
          alt="Middle-aged adult child enjoying time with an elderly parent"
          width={1280}
          height={720}
          className="absolute inset-y-0 right-0 hidden h-full w-[58%] object-cover object-center opacity-70 md:block"
        />
        <div
          className="absolute inset-y-0 left-[34%] right-0 hidden md:block"
          style={{ background: "linear-gradient(to right, #12354f 0%, rgba(18, 53, 79, 0.98) 18%, rgba(18, 53, 79, 0.72) 36%, rgba(18, 53, 79, 0.2) 62%, rgba(18, 53, 79, 0) 100%)" }}
        />
        <div className="relative max-w-2xl">
          <h2 className="text-3xl font-bold">Give them a call they can look forward to.</h2>
          <p className="mt-3 max-w-xl leading-7 text-cream/75">Set up a warm daily phone companion for your loved one in minutes. No app, no password, just a friendly call.</p>
          <Link href="/signup" className="mt-6 inline-flex rounded-full bg-cream px-6 py-3 font-semibold text-ink shadow-sm hover:bg-white">
            Set up daily calls
          </Link>
        </div>
      </section>

      <section data-mobile-reveal aria-label="Service disclaimer and privacy standards" className="grid gap-8 rounded-[1.5rem] border border-slate-300/80 bg-white/80 p-5 text-base leading-7 text-slate-600 shadow-sm md:p-6 lg:grid-cols-[minmax(0,1fr)_max-content] lg:items-start lg:gap-12">
        <div>
          <p className="font-semibold text-ink">Our Approach to Care</p>
          <div className="mt-3 grid gap-3">
            <p>
              Our companion calls are designed to provide daily reassurance, wellness check-ins, conversation, routine, companionship, and a warm sense of connection for loved ones and families.
            </p>
            <p>
              While our service can help reduce loneliness and provide comfort, companionship, and entertainment throughout the day, we strongly encourage family members and friends to stay actively connected with their loved ones whenever possible.
            </p>
            <p>
              Human relationships and social connection are deeply important. Our service is not intended to replace family interaction, caregiving, friendship, or socialization — but rather to support and enhance everyday connection, comfort, safety, and peace of mind for everyone involved.
            </p>
            <p>
              We follow industry-standard privacy and security practices designed to support Canadian privacy requirements, including Personal Information Protection and Electronic Documents Act (PIPEDA), as well as U.S. healthcare privacy standards associated with Health Insurance Portability and Accountability Act (HIPAA).
            </p>
          </div>
        </div>

        <div className="grid justify-center gap-5 lg:mt-[2.3rem] lg:justify-start">
          <div className="flex items-center justify-center gap-4 lg:justify-start">
            <Image src="/trust/pipeda.webp" alt="PIPEDA privacy standards" width={625} height={625} className="h-auto w-20 rounded-2xl sm:w-24" />
            <Image src="/trust/hipaa.png" alt="HIPAA privacy standards" width={1455} height={677} className="h-auto w-36 rounded-2xl sm:w-40" />
          </div>
          <ul className="grid gap-y-1 text-base md:text-sm font-semibold leading-6 text-slate-600">
            <li>• HIPAA Ready</li>
            <li>• PIPEDA Aligned</li>
            <li>• Encrypted Calls &amp; Data</li>
            <li>• We Never Sell Your Data</li>
            <li>• Secure Payments by Stripe</li>
            <li>• Trusted by North American Families</li>
          </ul>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-6 text-base md:text-sm font-semibold text-brandButtonBlue">
        <Link href="/terms-and-conditions" className="hover:text-ink">Terms &amp; Conditions</Link>
        <Link href="/privacy-policy" className="hover:text-ink">Privacy Policy</Link>
        <Link href="/cookie-policy" className="hover:text-ink">Cookie Policy</Link>
        <Link href="/cookie-preferences" className="hover:text-ink">Cookies Preferences</Link>
        <Link href="/support" className="hover:text-ink">Support</Link>
      </footer>
    </main>
  );
}

