import Image from "next/image";
import Link from "next/link";
import { HeroSplashImage } from "@/app/components/hero-splash-image";
import { SiteHeader } from "@/app/components/site-header";
import { trialLengthDays } from "@/lib/plans";
import { DemoCallForm } from "./demo-call-form";
import { TestimonialsCarousel } from "./testimonials-carousel";

const heroProof = [
  { label: "No app needed" },
  { label: "Works with regular phones" },
  { label: "Setup in under 2 minutes" },
  { label: "Family text updates", mobileHidden: true },
];

const steps = [
  { title: "You set it up", copy: "Choose a name, call time, and topics your parent loves. Takes about 2 minutes." },
  { title: "They get a call", copy: "DailyCall rings their regular phone - no app, no screen, just a warm voice that knows them by name." },
  { title: "You stay informed", copy: "Text summary after every call, plus alerts if a call is missed or something seems off." },
];

type BenefitIconName = "bell" | "calendar" | "chat" | "heart" | "insight" | "music" | "phone" | "shield";
type BenefitItem = { icon: BenefitIconName; lead: string; rest: string };

const seniorBenefits: BenefitItem[] = [
  {
    icon: "chat",
    lead: "Friendly conversations",
    rest: "that feel calm, patient, and familiar",
  },
  {
    icon: "heart",
    lead: "Remembers",
    rest: "family, routines, pets, hobbies, and preferences",
  },
  {
    icon: "music",
    lead: "Talks about what they love",
    rest: "from music and memories to prayer, trivia, or simple company",
  },
  {
    icon: "chat",
    lead: "Curious about anything?",
    rest: "Ask about a bird outside, an old song, or how a recipe turns out, and get a real, patient answer.",
  },
  {
    icon: "phone",
    lead: "No app required",
    rest: "no passwords, screens, or technical setup",
  },
];

const familyBenefits: BenefitItem[] = [
  {
    icon: "calendar",
    lead: "Daily companionship",
    rest: "for a loved one who may be alone",
  },
  {
    icon: "insight",
    lead: "Family visibility",
    rest: "into engagement, mood, and routine changes",
  },
  {
    icon: "bell",
    lead: "Missed-call alerts",
    rest: "and gentle escalation when something seems off",
  },
  {
    icon: "shield",
    lead: "Reassurance without hovering",
    rest: "so support feels caring, not watched",
  },
];

const careNeedSignals = [
  {
    title: "Friendly reminders",
    copy: "DailyCall can gently bring up medication routines, meals, hydration, appointments, and other everyday habits families want to support.",
  },
  {
    title: "Care requests",
    copy: "Loved ones can mention practical needs like prescription refills, toiletries, groceries, rides, or help around the house.",
  },
  {
    title: "Changes families may want to follow up on",
    copy: "Repeated mentions of pain, dizziness, low mood, confusion, missed meals, or unusual fatigue can be surfaced so families know what to ask about next.",
  },
];

const parentIntroPoints = [
  "Frame it as a friendly daily phone companion, not monitoring",
  "Choose a familiar call time, like after breakfast or before dinner",
  "Start with a short call so it feels easy and low-pressure",
  "Keep family calls going so DailyCall supports the relationship - not replaces it.",
];

const memoryExamples = [
  "How did your grandson's hockey tournament go?",
  "Did your dog recover from surgery?",
  "You mentioned your husband loved jazz music.",
];

const lonelinessStats = [
  { value: "24%", label: "of community-dwelling adults 65+ are socially isolated" },
  { value: "43%", label: "of adults 60+ report feeling lonely" },
  { value: "Daily", label: "connection helps turn support into a routine" },
];

const rituals = [
  { label: "Morning coffee chats", image: "/rituals/coffee-elderly-woman.jpg", position: "50% 24%" },
  { label: "Evening check-ins", image: "/rituals/evening-elderly-man.jpg", position: "50% 28%" },
  { label: "Trivia games", image: "/rituals/trivia-elderly-man.jpg", position: "50% 30%" },
  { label: "Music discussions", image: "/rituals/music-elderly-woman.jpg", position: "50% 24%" },
  { label: "Prayer or reflection", image: "/rituals/reflection-elderly-woman.jpg", position: "50% 26%" },
  { label: "Memory-lane stories", image: "/rituals/memory-elderly-man.jpg", position: "50% 28%" },
  { label: "Curiosity & questions", image: "/rituals/trivia-elderly-man.jpg", position: "50% 30%" },
  { label: "Sports & current events", image: "/rituals/evening-elderly-man.jpg", position: "50% 28%" },
];

export const testimonials = [
  {
    quote: "I live a flight away from my dad. DailyCall gives him a friendly routine and gives me a little more confidence that I am not missing something important.",
    name: "Michael",
    location: "Early access family",
  },
  {
    quote: "It is nice having someone call just to talk. The conversations feel easy, and I do not have to learn any new app or remember a password.",
    name: "Helen",
    location: "Early access member",
  },
  {
    quote: "My daughter says I sound brighter on days when the call comes. I like that it is just a regular phone call, not another thing to learn.",
    name: "Emily",
    location: "Early access family",
  },
];

export const plans = [
  {
    name: "Wellness",
    price: "$19.95",
    includedMinutes: "Includes 120 minutes/month",
    bestFor: "Daily check-ins, summaries, missed-call visibility",
    trial: "14-day free trial included",
    includes: [
      "A friendly daily check-in call",
      "120 minutes comfortably covers a daily check-in",
      "Access to call transcripts",
    ],
    cta: "Start Free 14-Day Trial",
    featured: false,
  },
  {
    name: "Companion",
    price: "$34.95",
    includedMinutes: "Includes 250 minutes/month",
    bestFor: "More flexible calls, call-anytime access, deeper personalization",
    trial: "14-day free trial included",
    includes: [
      "Up to 3 preferred daily call windows",
      "Up to 10 custom questions for the companion to ask",
      "Richer, more personalized conversations",
      "Call-anytime access - your loved one can dial the same number back, day or night, and pick up where they left off",
    ],
    cta: "Start Free 14-Day Trial",
    featured: true,
  },
];

export const faqs = [
  ["Does my parent need an app or smartphone?", "No. DailyCall works by regular phone call, so your loved one does not need an app, account, password, or smartphone."],
  ["Will my loved one know they're speaking with AI?", "Yes. DailyCall should be introduced honestly as an AI phone companion that helps families stay connected and informed."],
  ["Can DailyCall call landlines?", "Yes. DailyCall can call mobile phones and landlines, which makes it simple for seniors who prefer a familiar phone."],
  ["Is DailyCall easy to set up?", "Yes. Families can sign up and start calls in just a few minutes. No credit card required."],
  ["What are DailyCall conversations like?", "DailyCall has warm, everyday conversations about routines, memories, family, hobbies, music, plans, and how the day is going."],
  [
    "Can my parent ask DailyCall questions, or does it just check in?",
    "Both. Beyond the daily check-in, your loved one can ask about almost anything, like a bird outside, a recipe, a piece of history, or how something works, and get a clear, patient answer. For many families it becomes a small daily spark of curiosity, not just a wellness call.",
  ],
  ["Is DailyCall replacing family connection?", "No. DailyCall is designed to support connection, not replace family, friends, caregivers, or emergency services."],
  ["What happens if a call is missed?", "Missed calls can be shown in the family dashboard, and DailyCall can help families notice changes in call patterns over time."],
  ["Can I choose how often DailyCall calls?", "Yes. Call timing and routines can be adjusted as your loved one's needs change."],
  ["What updates do families receive?", "Families can see helpful updates such as call status, engagement, mood trends, missed calls, and conversation highlights."],
  [
    "How does DailyCall protect privacy and personal information?",
    "DailyCall uses conversation details only to provide the service, improve quality, and create helpful family insights. We do not sell personal data, and we protect it with strong security practices.",
  ],
  ["Can I customize the voice or personality?", "Yes. Families can choose from available companion voices and adjust conversation preferences so calls feel more comfortable."],
  ["Can multiple family members receive updates?", "Yes. DailyCall is designed so more than one family member can stay informed as care needs grow."],
];

function CheckIcon() {
  return <span className="bullet-dot h-2 w-2 shrink-0 rounded-full bg-brandPink" aria-hidden="true" />;
}

function BenefitIcon({ name }: { name: BenefitIconName }) {
  const commonProps = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "bell":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps}>
          <path d="M7 3v3" />
          <path d="M17 3v3" />
          <path d="M4 8h16" />
          <rect x="4" y="5" width="16" height="16" rx="3" />
          <path d="M8 12h.01" />
          <path d="M12 12h.01" />
          <path d="M16 12h.01" />
        </svg>
      );
    case "chat":
      return (
        <svg {...commonProps}>
          <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.2 9.4 9.4 0 0 1-4-.9L3 20l1.4-4.5A7.8 7.8 0 0 1 3.7 12 8.4 8.4 0 0 1 12.2 3.8 8.4 8.4 0 0 1 21 11.5Z" />
          <path d="M8 11h8" />
          <path d="M8 14h5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...commonProps}>
          <path d="M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.6 4.6 0 0 1 11 5.3l1 1 1-1a4.6 4.6 0 0 1 7.8 3.3Z" />
        </svg>
      );
    case "insight":
      return (
        <svg {...commonProps}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-3 3 2 5-6" />
          <path d="M18 8h-4" />
          <path d="M18 8v4" />
        </svg>
      );
    case "music":
      return (
        <svg {...commonProps}>
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      );
    case "phone":
      return (
        <svg {...commonProps}>
          <rect x="7" y="2.8" width="10" height="18.4" rx="2.4" />
          <path d="M11 17.6h2" />
        </svg>
      );
    case "shield":
      return (
        <svg {...commonProps}>
          <path d="M12 3 20 6v5.5c0 4.8-3.2 7.8-8 9.5-4.8-1.7-8-4.7-8-9.5V6l8-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );
  }
}

function BenefitCard({
  eyebrow,
  title,
  benefits,
  tone,
}: {
  eyebrow: string;
  title: string;
  benefits: BenefitItem[];
  tone: "warm" | "cool";
}) {
  const isWarm = tone === "warm";
  const cardClass = isWarm
    ? "border-brandPink/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(253,242,248,0.92))] shadow-[0_18px_45px_rgba(204,31,136,0.10)]"
    : "border-brandBlue/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,247,255,0.94))] shadow-[0_18px_45px_rgba(18,53,79,0.09)]";
  const iconClass = isWarm
    ? "text-brandPink"
    : "text-brandButtonBlue";
  const eyebrowClass = isWarm ? "text-brandPink" : "text-brandButtonBlue";

  return (
    <article className={`rounded-[2rem] border p-6 md:p-8 ${cardClass}`}>
      <p className={`text-base font-semibold uppercase tracking-wide md:text-sm ${eyebrowClass}`}>{eyebrow}</p>
      <h2 className="mt-3 min-h-[4.8rem] text-3xl font-bold leading-tight text-ink">{title}</h2>
      <ul className="mt-5 grid gap-3 text-base leading-7 text-slate-800 md:text-sm md:leading-6">
        {benefits.map((item) => (
          <li key={item.lead} className="flex items-start gap-2 pl-1 md:pl-2">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center ${iconClass}`}>
              <BenefitIcon name={item.icon} />
            </span>
            <span>
              <strong className="font-bold text-ink">{item.lead}</strong>{" "}
              {item.rest}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function LandingPage({ initialAuthenticated = false, visitorCountry = "CA" }: { initialAuthenticated?: boolean; visitorCountry?: "CA" | "US" }) {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 pb-5 pt-0 sm:px-6 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader
        showTrialButton
        initialAuthenticated={initialAuthenticated}
        visitorCountry={visitorCountry}
      />

      <header className="-mt-2 overflow-hidden rounded-[2rem] bg-white/75 shadow-sm ring-1 ring-black/5">
        <div className="hero-splash-layer relative">
          <HeroSplashImage />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,white_0%,rgba(255,255,255,0.97)_35%,rgba(255,255,255,0.84)_39%,transparent_59%)] sm:bg-[linear-gradient(to_right,white_0%,rgba(255,255,255,0.88)_36%,transparent_62%)]" />
          <div className="relative flex max-w-2xl flex-col justify-between p-6 sm:block sm:p-8 md:p-12">
            <div>
              <h1 className="text-[2.05rem] font-bold leading-[1.08] tracking-tight text-ink md:text-5xl md:leading-none">
                Someone to talk to{" "}
                <span className="sm:block">
                  when you can&apos;t <span className="block sm:inline">be there.</span>
                </span>
              </h1>
            </div>
            <div className="pt-10 sm:pt-0">
              <p className="mt-2 w-[60%] max-w-[60%] -translate-y-8 text-base leading-7 text-slate-600 sm:mt-12 sm:w-[72%] sm:max-w-[72%] sm:text-lg sm:leading-8 md:mt-5 md:w-auto md:max-w-[72%] md:translate-y-0">
                Friendly daily AI calls with text updates for family.
              </p>
              <div className="mt-[5.5rem] grid gap-2 text-base md:text-sm font-semibold text-ink sm:mt-6 sm:max-w-xl sm:grid-cols-2">
                {heroProof.map((item) => (
                  <div
                    key={item.label}
                    className={`items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-black/5 ${item.mobileHidden ? "hidden sm:flex" : "flex"}`}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brandPink" aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href="#demo" className="rounded-full bg-brandButtonBlue px-6 py-3 text-center font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover">
                  Try a free demo call
                </a>
                <Link href="/signup" className="rounded-full bg-white/85 px-6 py-3 text-center font-semibold text-ink shadow-sm ring-1 ring-black/10 hover:bg-white">
                  Start Your Free 14-Day Trial
                </Link>
              </div>
              <p className="mt-3 hidden text-sm font-extrabold uppercase tracking-normal text-ink sm:mt-5 sm:flex sm:flex-wrap sm:gap-x-2 sm:gap-y-1 sm:text-base">
                <span className="block whitespace-nowrap sm:inline">NO CREDIT CARD REQUIRED</span>
                <span className="hidden sm:inline" aria-hidden="true">•</span>
                <span className="whitespace-nowrap">CANCEL ANYTIME</span>
              </p>
              <p className="mt-3 flex justify-center whitespace-nowrap text-[0.72rem] font-extrabold uppercase tracking-normal text-ink sm:hidden">
                <span>NO CREDIT CARD REQUIRED</span>
                <span className="px-1" aria-hidden="true">•</span>
                <span>CANCEL ANYTIME</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <section data-mobile-reveal id="how-it-works" className="rounded-[2rem] bg-ink p-8 text-cream shadow-sm md:p-10">
        <div className="grid gap-8 md:grid-cols-[0.75fr_1fr] md:items-center">
          <div>
            <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-brandPinkLight">How it works</p>
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

      <section data-mobile-reveal id="demo" className="scroll-mt-24 relative overflow-hidden rounded-[2rem] bg-brandBlue/10 shadow-sm ring-1 ring-brandBlue/15 md:scroll-mt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/90 to-transparent" />
        <div className="relative p-6 md:p-10">
          <div className="max-w-3xl">
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
          </div>
          <div className="mt-6 grid items-stretch gap-6 md:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] bg-ink p-5 text-cream shadow-sm md:flex md:min-h-[360px] md:flex-col md:justify-center">
              <p className="text-sm md:text-xs font-semibold uppercase tracking-wide text-cream/75">Sample conversation</p>
              <div className="mt-4 grid gap-3 text-base md:text-sm leading-6">
                <p className="max-w-[88%] rounded-2xl bg-white/10 p-3">Hi, this is DailyCall calling for your daily check-in! How are you feeling today?</p>
                <p className="ml-auto max-w-[88%] rounded-2xl bg-brandPink p-3 font-semibold text-white">A little tired, but okay. I slept in a bit.</p>
                <p className="max-w-[88%] rounded-2xl bg-white/10 p-3">Glad you got some extra rest - sometimes that&apos;s exactly what we need. Do you have anything you&apos;re looking forward to today?</p>
                <p className="ml-auto max-w-[88%] rounded-2xl bg-brandPink p-3 font-semibold text-white">My daughter is coming over for lunch.</p>
                <p className="max-w-[88%] rounded-2xl bg-white/10 p-3">That&apos;s wonderful! Is there anything else you&apos;d like to talk about or I can help with? If not, enjoy your lunch with her!</p>
              </div>
            </div>
            <div className="md:order-first">
              <DemoCallForm />
            </div>
          </div>
        </div>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-white/75 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="max-w-3xl">
          <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Why it works</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">One call. Two kinds of peace of mind.</h2>
          <p className="mt-4 leading-7 text-slate-600">
            Life gets busy, and you can&apos;t call every day. DailyCall fills the in-between days with a warm, familiar conversation for your loved one - and gives you a steady touchpoint that takes a little worry off your plate.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <BenefitCard
            eyebrow="Why seniors love it"
            title="A familiar voice, not another piece of software."
            benefits={seniorBenefits}
            tone="warm"
          />
          <BenefitCard
            eyebrow="Why families choose it"
            title="Know when to check in, without hovering."
            benefits={familyBenefits}
            tone="cool"
          />
        </div>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="max-w-4xl">
          <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">WHAT THE CALLS FEEL LIKE</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Familiar enough to feel easy. Personal enough to <span className="whitespace-nowrap">feel real.</span></h2>
          <p className="mt-4 leading-7 text-slate-600">
            A DailyCall isn&apos;t a script being read out. It settles into your loved one&apos;s daily rhythm and remembers what matters, so each call feels less like a check-in and more like hearing from someone who knows them. And when curiosity strikes, they can ask about almost anything and get a real, patient answer.
          </p>
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5 md:p-6">
            <h3 className="text-2xl font-bold text-ink">A rhythm that fits their day.</h3>
            <p className="mt-3 leading-7 text-slate-700">
              Whether it&apos;s a chat over morning coffee or a wind-down before bed, the call becomes a small, dependable part of the day.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rituals.map((ritual) => (
                <div key={ritual.label} className="group relative min-h-32 overflow-hidden rounded-3xl bg-ink text-center font-bold text-white shadow-sm ring-1 ring-black/5 sm:min-h-36">
                  <Image src={ritual.image} alt="" fill sizes="(min-width: 1024px) 10rem, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" style={{ objectPosition: ritual.position }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center text-base leading-6 text-white drop-shadow-sm">
                    {ritual.label}
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15 md:p-6">
            <h3 className="text-2xl font-bold text-ink">It picks up where you left off.</h3>
            <p className="mt-3 leading-7 text-slate-700">
              DailyCall remembers family, pets, routines, and the little things that came up last time, so conversations build over time instead of starting over.
            </p>
            <div className="mt-5 grid gap-3">
              {memoryExamples.map((example) => (
                <blockquote key={example} className="rounded-2xl bg-white/80 p-4 text-base font-semibold leading-7 text-ink shadow-sm ring-1 ring-black/5 md:text-sm md:leading-6">
                  &quot;{example}&quot;
                </blockquote>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Family dashboard</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Show families what actually happened.</h2>
            <p className="mt-4 leading-7 text-slate-600">
              The dashboard turns each call into a simple, useful update: whether the call was answered, how the conversation felt, what came up, and whether anyone should follow up.
            </p>
          </div>
          <div className="rounded-[2rem] bg-ink p-4 text-cream shadow-sm ring-1 ring-ink">
            <div className="rounded-3xl bg-white p-4 text-ink">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-sage">Today&apos;s check-in</p>
                  <h3 className="mt-1 text-xl font-bold">Margaret</h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">Answered</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["Answer rate", "92%"],
                  ["Mood trend", "Brighter"],
                  ["Missed calls", "0 this week"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-brandBlue/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</p>
                    <p className="mt-1 text-lg font-bold text-ink">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Summary</p>
                <p className="mt-2 text-base md:text-sm leading-6 text-slate-700">
                  Margaret sounded upbeat after breakfast. She talked about her garden, remembered her granddaughter&apos;s visit, and said she plans to call Sarah this evening.
                </p>
              </div>
              <div className="mt-3 rounded-2xl bg-brandPink/10 p-3 text-base md:text-sm font-semibold leading-6 text-ink">
                Follow-up note: ask about the garden tomatoes next call.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Between visits</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">DailyCall can help surface everyday needs.</h2>
            <p className="mt-4 leading-7 text-slate-600">
              A friendly conversation often reveals the small things families miss between visits - gentle reminders about meals, meds, and appointments; practical requests like refills, groceries, or a ride; and changes worth a follow-up, such as repeated mentions of pain, low mood, or missed meals.
            </p>
          </div>
          <article className="rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15 md:p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sage">Everyday signals</p>
            <ul className="mt-4 grid gap-3 text-base font-semibold leading-7 text-ink md:text-sm md:leading-6">
              {careNeedSignals.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <CheckIcon />
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-base leading-7 text-slate-600 ring-1 ring-slate-200 md:text-sm md:leading-6">
          DailyCall is not a medical device, emergency response service, or replacement for professional care. It does not diagnose conditions or monitor emergencies. If something may be urgent, call emergency services or contact a healthcare professional.
        </p>
      </section>

      <section data-mobile-reveal className="rounded-[2rem] bg-brandBlue/10 p-6 shadow-sm ring-1 ring-brandBlue/15 md:p-10">
        <div className="max-w-3xl">
          <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Why it matters</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Loneliness is not a small problem.</h2>
          <p className="mt-4 leading-7 text-slate-600">
            A short daily call will not replace family or professional care. It can, however, create a steady moment of conversation that helps families notice changes sooner and helps older adults feel less alone.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {lonelinessStats.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-3xl font-bold text-ink">{item.value}</p>
              <p className="mt-2 text-base font-semibold leading-6 text-slate-600 md:text-sm">{item.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Source:{" "}
          <a
            href="https://doi.org/10.17226/25663"
            className="font-semibold text-brandButtonBlue underline decoration-brandBlue/40 underline-offset-4 hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            National Academies report on social isolation and loneliness in older adults
          </a>
          .
        </p>
        <div className="mt-8 rounded-[2rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
          <div className="max-w-2xl">
            <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Early access feedback</p>
            <h3 className="mt-3 text-2xl font-bold text-ink">What our first families are saying.</h3>
            <p className="mt-3 leading-7 text-slate-600">Real notes from early access members. Names shortened for privacy.</p>
          </div>
          <TestimonialsCarousel testimonials={testimonials} />
        </div>
      </section>

      <section data-mobile-reveal className="relative overflow-hidden rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <Image
          src="/trust-son-mom-v2.png"
          alt="Adult son sitting with his elderly mother in a warm home setting"
          width={1536}
          height={1024}
          className="absolute inset-y-0 -left-[60px] hidden h-full w-[calc(100%+5rem)] object-cover object-left opacity-90 lg:block"
        />
        <div
          className="absolute inset-y-0 left-[42%] hidden w-[58%] lg:block"
          style={{ background: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 14%, rgba(255,255,255,0.26) 28%, rgba(255,255,255,0.52) 46%, rgba(255,255,255,0.78) 66%, rgba(255,255,255,0.94) 84%, rgba(255,255,255,1) 100%)" }}
        />
        <div className="pointer-events-none absolute inset-x-0 -top-[25px] h-[24rem] overflow-hidden lg:hidden">
          <Image
            src="/trust-son-mom-v2.png"
            alt="Adult son sitting with his elderly mother in a warm home setting"
            width={1536}
            height={1024}
            className="h-full w-full object-cover object-[0%_center]"
          />
          <div className="absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,rgba(255,255,255,0.08)_34%,rgba(255,255,255,0.66)_72%,rgba(255,255,255,0.98)_100%)]" />
        </div>
        <div className="relative max-w-2xl pt-[20.5rem] lg:ml-auto lg:max-w-[28rem] lg:translate-x-4 lg:pt-0 lg:pr-8 xl:max-w-[30rem] xl:translate-x-6 xl:pr-10">
          <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Trust & privacy</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">
            <span className="md:hidden">Designed for trust.</span>
            <span className="hidden md:inline">Designed to feel supportive, not intrusive.</span>
          </h2>
          <div className="mt-6 rounded-3xl bg-ink p-5 text-cream shadow-sm md:max-w-[90%] md:pb-[4.25rem]">
            <p className="text-xl font-bold">Honest about AI. Always.</p>
            <p className="mt-3 max-w-xl leading-7 text-cream/75">
              Every call begins with a clear disclosure that DailyCall is an AI companion - not a human. We will never pretend otherwise, and we believe families shouldn&apos;t have to either.
            </p>
          </div>
          <p className="mt-6 max-w-xl text-base md:text-sm leading-7 text-slate-600">
            Your loved one&apos;s conversations stay private. Family summaries are written to support connection - never to surveil, score, or pathologize. We don&apos;t sell your data, and we use encryption in transit and at rest while limiting access to what is needed to operate DailyCall.
          </p>
        </div>
      </section>

      <section data-mobile-reveal id="pricing">
        <div className="rounded-[2rem] bg-white/55 p-4 shadow-sm ring-1 ring-black/5 md:bg-transparent md:p-0 md:shadow-none md:ring-0">
          <div className="text-left md:text-center">
            <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">Pricing</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">
              <span className="md:hidden">Comfort for them. Peace of mind for you.</span>
              <span className="hidden md:inline">Companionship for them. Peace of mind for you.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-4xl text-xl font-bold leading-7 text-ink md:whitespace-nowrap">Less than a single caregiver hour. Less than one dinner out. Daily peace of mind.</p>
            <p className="mx-auto mt-2 max-w-2xl leading-7 text-slate-600">Both plans include a {trialLengthDays}-day free trial. No credit card required.</p>
          </div>
          <div className="mt-6 grid gap-3 md:mt-5 md:grid-cols-2 md:items-stretch md:gap-4">
            {plans.map((plan) => (
              <article key={plan.name} className={`flex flex-col rounded-3xl p-6 shadow-sm ring-1 md:h-full ${plan.featured ? "bg-ink text-cream ring-ink" : "bg-white/80 text-ink ring-black/5"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-base md:text-sm font-semibold uppercase tracking-wide ${plan.featured ? "text-cream/60" : "text-sage"}`}>{plan.name}</p>
                  {plan.featured ? <span className="rounded-full bg-brandPink px-3 py-1 text-sm md:text-xs font-bold text-white">Recommended</span> : null}
                </div>
                <p className="mt-3 text-4xl font-bold">{plan.price}<span className={`text-base font-medium ${plan.featured ? "text-cream/60" : "text-slate-500"}`}> / mo</span></p>
                <p className={`mt-3 min-h-12 text-base md:text-sm font-semibold leading-6 ${plan.featured ? "text-cream" : "text-ink"}`}>{plan.bestFor}</p>
                <p className={`mt-2 text-base md:text-sm font-bold ${plan.featured ? "text-brandPinkLight" : "text-sage"}`}>{plan.includedMinutes}</p>
                <p className={`mt-2 text-base md:text-sm font-semibold ${plan.featured ? "text-cream/65" : "text-slate-500"}`}>{plan.trial}</p>
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
        </div>
      </section>

      <section data-mobile-reveal className="rounded-[1.5rem] bg-white/70 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Introducing DailyCall</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Helping your parent say yes.</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Families are often worried their parent will resist anything that sounds like technology. DailyCall is easiest to explain as a friendly phone call that helps them stay connected.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {parentIntroPoints.map((item) => (
              <div key={item} className="rounded-2xl bg-brandBlue/10 p-3 text-base font-bold leading-6 text-ink ring-1 ring-brandBlue/15 md:text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-mobile-reveal id="faq" className="scroll-mt-24 rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:scroll-mt-28 md:p-10">
        <p className="text-base md:text-sm font-semibold uppercase tracking-wide text-sage">FAQ</p>
        <h2 className="mt-3 text-3xl font-bold text-ink">Questions families often ask.</h2>
        <div className="mt-6 grid gap-3 xl:grid-cols-2">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group h-full rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:ring-brandBlue/25 open:ring-brandBlue/25">
              <summary className="block h-full min-h-24 cursor-pointer list-none p-5 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4 font-bold text-ink">
                  <span>{question}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandBlue/10 text-lg leading-none text-brandButtonBlue transition group-open:rotate-45">+</span>
                </span>
                <span className="mt-3 hidden max-w-2xl text-base font-normal leading-6 text-slate-600 group-open:block md:text-sm">{answer}</span>
              </summary>
            </details>
          ))}
        </div>
      </section>

      <section data-mobile-reveal className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-left text-cream shadow-sm md:p-10">
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
          <h2 className="text-3xl font-bold">You can&apos;t always be there. This can.</h2>
          <p className="mt-3 max-w-xl leading-7 text-cream/75">Set up a warm daily phone companion for your loved one in minutes. No app, no password, just a friendly call.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex justify-center rounded-full bg-cream px-6 py-3 text-center font-semibold text-ink shadow-sm hover:bg-white">
              Start free 14-day trial
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}

