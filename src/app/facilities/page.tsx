import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

import { SiteHeader } from "@/app/components/site-header";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "DailyCall for Care Facilities",
};

const trustItems = ["No app or device for residents", "Works on any phone or landline", "HIPAA ready - PIPEDA aligned"];

const heroStats = [
  { value: "94%", label: "average call answer rate across facilities" },
  { value: "9 min", label: "average added social contact per resident per day" },
];

const overviewRows = [
  { name: "Margaret L., Rm 14", mood: "Positive", time: "9:02 AM", tone: "green" },
  { name: "Robert C., Rm 22", mood: "Good", time: "9:08 AM", tone: "green" },
  { name: "Dorothy M., Rm 7", mood: "Tired", time: "9:15 AM", tone: "amber" },
  { name: "Harold B., Rm 31", mood: "No answer", time: "Follow up", tone: "red" },
];

const stats = [
  { value: "26%", label: "lower dementia risk with daily social contact" },
  { value: "-20%", label: "reported loneliness with regular phone engagement" },
  { value: "94%", label: "resident call answer rate across all facilities" },
  { value: "2 min", label: "to onboard a new resident to the programme" },
];

const steps = [
  {
    title: "You onboard your residents",
    copy: "Add each resident's name, phone number, preferred call time, and a few personal details - family members, interests, routines. Takes about 2 minutes per person. Our team handles bulk imports for larger facilities.",
  },
  {
    title: "DailyCall reaches out every day",
    copy: "Residents receive a warm, friendly call on their regular phone - no app, no screen, no setup on their end. The AI remembers previous conversations, adapts its topics to each person, and flags anything unusual.",
  },
  {
    title: "Your team gets a morning briefing",
    copy: "Before rounds begin, every care coordinator receives a summary: who answered, mood signals, anything mentioned that warrants follow-up, and a prioritized list of residents to check on in person today.",
  },
  {
    title: "Families stay connected too",
    copy: "Each resident's family can optionally receive their own text summary after every call - the same peace of mind you give families who live nearby, extended to families who can't visit as often.",
  },
];

const operatorFeatures = [
  {
    title: "Resident-level memory",
    copy: "DailyCall remembers what each resident has shared - family names, health history, hobbies, past conversations - and builds on it every call. No two calls feel the same.",
  },
  {
    title: "Care team dashboard",
    copy: "A single view of every resident's call status, mood signal, and flagged items - updated in real time. Sortable by wing, floor, or care level. Designed to be opened at the start of a shift.",
  },
  {
    title: "Morning briefings",
    copy: "A daily digest delivered before rounds: who was reached, mood trends, and a prioritized list of residents to check on in person. Replaces the 20-minute manual status meeting.",
  },
  {
    title: "Family visibility included",
    copy: "Families can receive their own text summary after each call at no extra cost - reducing incoming family calls to your front desk by giving them a daily touchpoint of their own.",
  },
  {
    title: "Wellness and mood signals",
    copy: "Each call is analyzed for mood, engagement, and any health mentions. Flags like \"mentioned pain,\" \"seemed confused,\" or \"hasn't been sleeping\" surface automatically for care team review.",
  },
  {
    title: "No device needed",
    copy: "DailyCall works on any phone - mobile, landline, or cordless. Residents don't need to learn anything new, download anything, or remember a password. It's just a phone call.",
  },
];

const facilityAudiences = [
  {
    title: "Home care agencies",
    copy: "Add a lightweight daily touchpoint between visits and help coordinators spot missed calls, lower engagement, or changes in routine.",
  },
  {
    title: "Senior living communities",
    copy: "Offer residents a familiar companion call that supports social connection without adding another device or app to manage.",
  },
  {
    title: "Care coordinators",
    copy: "Use structured call summaries to prioritize outreach, support family communication, and keep non-clinical check-ins consistent.",
  },
];

const facilityOutcomes = [
  "No hardware rollout or resident app training",
  "Configurable call schedules and conversation prompts",
  "Missed-call and engagement visibility for care teams",
  "Family-friendly summaries that reduce uncertainty",
  "Bulk onboarding path for multiple members or residents",
  "Built for companionship, reassurance, and routine support",
];

const plans = [
  {
    name: "Small facility",
    price: "$12",
    unit: "per resident / month - up to 30 residents",
    copy: "Daily calls, care team dashboard, morning briefings, and family text summaries for every resident.",
    cta: "Book a demo",
    featured: false,
    features: [
      "Daily companion calls for all residents",
      "Care team dashboard - full access",
      "Morning briefing to care coordinators",
      "Family text summaries included",
      "Mood and wellness signals",
      "Missed-call alerts",
      "2-minute resident onboarding",
    ],
  },
  {
    name: "Mid-size facility",
    price: "$9",
    unit: "per resident / month - 31-150 residents",
    copy: "Everything in Small, plus bulk resident import, multi-wing dashboards, and priority support.",
    cta: "Book a demo",
    featured: true,
    features: [
      "Everything in Small",
      "Bulk resident import (CSV / EHR export)",
      "Multi-wing / floor dashboard views",
      "Configurable alert thresholds per resident",
      "Priority email and phone support",
      "Monthly facility performance report",
      "Custom call topics per care level",
    ],
  },
  {
    name: "Large / multi-site",
    price: "Custom",
    unit: "150+ residents or multiple locations",
    copy: "Volume discounts, dedicated account management, EHR integration, and white-label options.",
    cta: "Talk to sales",
    featured: false,
    features: [
      "Everything in Mid-size",
      "Volume pricing from $6/resident/month",
      "Dedicated account manager",
      "EHR / care system integration",
      "White-label option available",
      "SLA with guaranteed uptime",
      "Custom reporting and data export",
    ],
  },
];

const testimonials = [
  {
    quote:
      "We were spending 45 minutes every morning doing manual wellness check-ins by phone. DailyCall does it automatically, surfaces the two or three residents who actually need attention, and gives us the rest of that time back. Our staff still connect with residents personally - but they're doing it where it matters.",
    name: "Sandra K.",
    role: "Director of Care, Oakview Residence - 84 residents",
    initials: "SK",
    large: true,
  },
  {
    quote:
      "Our families used to call the front desk constantly asking how their parents were doing. Since we added DailyCall, those calls have dropped significantly. The families get their own summary - they don't need to call us.",
    name: "Patricia M.",
    role: "Administrator, Harmony Care Homes",
    initials: "PM",
    large: false,
  },
  {
    quote:
      "The wellness flags have been genuinely useful - twice in the first month, the morning briefing flagged something a resident mentioned in passing that turned into a real care issue. It's not replacing our nurses. It's giving them better information.",
    name: "Dr. David L.",
    role: "Medical Director, Westfield Memory Care",
    initials: "DL",
    large: false,
  },
];

const faqs = [
  [
    "How does onboarding work for a full facility?",
    "For small facilities, you can add residents one at a time through the dashboard - it takes about 2 minutes per person. For mid-size and large facilities, we support bulk import via CSV or export from most common EHR systems. Our onboarding team handles the initial setup and is available by phone throughout your pilot period.",
  ],
  [
    "Will residents know they're speaking with AI?",
    "Yes - DailyCall identifies itself as an AI calling service at the start of every call, no exceptions. In our experience, most residents accept this quickly and engage warmly regardless. Many don't think of it as \"talking to a machine\" - they think of it as \"my morning call.\" Informed consent is non-negotiable for us in a care setting.",
  ],
  [
    "What happens if a resident doesn't answer?",
    "DailyCall retries up to two additional times at configurable intervals. If a resident is still unreachable, they appear in the morning briefing as a follow-up priority. You can set custom alert thresholds per resident - for example, escalating to a care coordinator immediately if a resident with a history of falls doesn't answer two calls in a row.",
  ],
  [
    "How does this fit with our existing care software?",
    "DailyCall works as a standalone service with no integration required. For mid-size and larger facilities, we offer integrations with common care management systems including PointClickCare, MatrixCare, and others on request. We can also export daily summary data to CSV or push to your existing reporting tools via webhook.",
  ],
  [
    "Is DailyCall HIPAA compliant?",
    "DailyCall is HIPAA-ready and PIPEDA-aligned. We offer Business Associate Agreements (BAAs) for all facility plans. All calls are encrypted in transit and at rest. Resident data is stored on servers in the US and Canada and is never sold or shared with third parties. Full details are available in our privacy policy and on request during your demo.",
  ],
  [
    "Can we customise what topics the AI discusses?",
    "Yes. You can set up to 10 custom topics or questions per resident - things like \"ask about her daughter's visit\" or \"check in on his physiotherapy progress.\" You can also set global topics for your facility and configure which topics to avoid for residents with specific cognitive needs.",
  ],
  [
    "What does the 30-day pilot include?",
    "The pilot covers one wing or unit (up to 30 residents) for 30 days at no charge. It includes full access to the care team dashboard, morning briefings, family summaries, and our onboarding team. At the end of the pilot you'll have a full facility engagement report to share with your leadership team. No contract required to continue.",
  ],
];

function Dot({ tone = "green" }: { tone?: string }) {
  const color = tone === "red" ? "bg-red-400" : tone === "amber" ? "bg-amber-400" : "bg-emerald-400";
  return <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />;
}

function CheckItem({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <li className={`flex gap-3 text-base md:text-sm leading-6 ${dark ? "text-emerald-50/80" : "text-slate-600"}`}>
      <Dot />
      <span>{children}</span>
    </li>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-[1.5rem] bg-[#172230] p-4 text-white shadow-2xl ring-1 ring-white/10">
      <div className="rounded-[1.25rem] border border-white/10 bg-[#1f2b3d] p-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Resident overview</p>
            <h3 className="mt-1 text-lg font-bold">Today</h3>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-300/25">Live</span>
        </div>
        <div className="mt-4 grid gap-3">
          {overviewRows.map((row) => (
            <div key={row.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/5 p-3">
              <Dot tone={row.tone} />
              <div className="min-w-0">
                <p className="truncate text-base md:text-sm font-bold text-white">{row.name}</p>
                <p className="text-xs text-slate-300">{row.mood}</p>
              </div>
              <p className={`whitespace-nowrap text-xs font-semibold ${row.tone === "red" ? "text-red-200" : "text-slate-300"}`}>{row.time}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Today&apos;s flag - Dorothy M., Rm 7</p>
          <p className="mt-2 text-base md:text-sm leading-6 text-emerald-50/80">
            &quot;She mentioned her knee has been aching since yesterday and she didn&apos;t sleep well. Worth a check-in before lunch.&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function FacilitiesPage() {
  const initialAuthenticated = await isAdminAuthenticated();

  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 pb-5 pt-0 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader
        showTrialButton
        initialAuthenticated={initialAuthenticated}
      />

      <header className="relative overflow-hidden rounded-[2rem] bg-[#101820] text-white shadow-sm ring-1 ring-black/10">
        <div className="absolute inset-x-0 top-0 h-[21.6rem] overflow-hidden md:h-[70%]" aria-hidden="true">
          <Image
            src="/facilities-caregiver-resident.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="object-contain object-right-top opacity-[0.75] [mask-image:linear-gradient(to_bottom,black_0%,black_48%,rgba(0,0,0,0.65)_62%,transparent_80%)] [transform:translateY(40px)_scale(1.35)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_48%,rgba(0,0,0,0.65)_62%,transparent_80%)] md:object-cover md:object-left-top md:opacity-[0.85] md:[mask-image:none] md:[transform:scale(1.18)_scaleX(-1)] md:[-webkit-mask-image:none]"
          />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[#101820]/35 via-[#101820]/78 to-[#101820] md:block" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#101820]/60 to-[#101820] md:from-[#101820]/15 md:via-transparent" />
        </div>
        <div className="absolute inset-x-0 top-48 h-44 bg-gradient-to-b from-transparent via-[#101820]/90 to-[#101820] md:top-[52%] md:h-[26%]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#101820]" aria-hidden="true" />
        <div className="relative grid gap-8 p-6 md:grid-cols-[0.95fr_1.05fr] md:items-end md:p-10 lg:p-12">
          <div>
            <p className="text-base md:text-sm font-bold uppercase tracking-[0.22em] text-emerald-300">
              For Care Facilities
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Daily companion calls for every resident. <span className="text-emerald-300">Without adding staff.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              DailyCall provides warm, AI-powered phone check-ins to every resident on your schedule - and sends your care team a morning briefing before rounds begin.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#demo" className="rounded-full bg-emerald-300 px-6 py-3 text-center font-bold text-[#101820] shadow-sm hover:bg-emerald-200">
                Book a team demo
              </a>
              <a href="#how-it-works" className="rounded-full bg-white/10 px-6 py-3 text-center font-bold text-white ring-1 ring-white/20 hover:bg-white/15">
                See how it works
              </a>
            </div>
            <ul className="mt-8 grid gap-2 text-base md:text-sm font-semibold text-slate-300 sm:grid-cols-3">
              {trustItems.map((item) => (
                <CheckItem key={item} dark>{item}</CheckItem>
              ))}
            </ul>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {heroStats.map((item) => (
                <article key={item.label} className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
                  <p className="text-4xl font-bold text-white">{item.value}</p>
                  <p className="mt-2 text-base md:text-sm font-semibold leading-6 text-slate-300">{item.label}</p>
                </article>
              ))}
            </div>
            <article className="rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-5">
              <p className="text-base md:text-sm font-bold text-white">Morning briefing ready - 7:45 AM</p>
              <p className="mt-2 text-base md:text-sm leading-6 text-slate-300">
                18 of 22 residents reached. 2 flagged for follow-up. Margaret in Room 14 mentioned knee pain. Full report in your care dashboard.
              </p>
            </article>
            <DashboardPreview />
          </div>
        </div>
      </header>

      <section aria-label="Facility proof points" className="grid gap-3 rounded-[2rem] bg-emerald-300 p-4 shadow-sm ring-1 ring-emerald-500/20 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl bg-white/75 p-4 text-center shadow-sm ring-1 ring-emerald-950/5">
            <p className="text-3xl font-bold text-[#101820]">{item.value}</p>
            <p className="mt-2 text-base md:text-sm font-bold leading-5 text-emerald-900">{item.label}</p>
          </article>
        ))}
      </section>

      <section id="how-it-works" className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-base md:text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">How it works</p>
            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl">A daily routine your care team sets up once.</h2>
            <p className="mt-4 leading-7 text-slate-600">
              DailyCall is designed to fit into your existing care workflow - not replace it. Your staff spends less time on routine check-ins, and more time on the residents who need them most.
            </p>
          </div>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <article key={step.title} className="flex gap-4 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#101820] font-bold text-emerald-200">{index + 1}</span>
                <div>
                  <h3 className="font-bold text-ink">{step.title}</h3>
                  <p className="mt-1 text-base md:text-sm leading-6 text-slate-600">{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] bg-[#101820] p-6 text-white shadow-sm ring-1 ring-black/10 md:p-8">
          <p className="text-base md:text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">For care facilities</p>
          <h2 className="mt-3 text-3xl font-bold">Daily check-in calls for care teams, agencies, and senior living.</h2>
          <p className="mt-4 leading-7 text-slate-300">
            DailyCall can support organizations that need consistent, compassionate non-clinical touchpoints across many older adults without shipping devices, training residents on apps, or adding manual call work for staff.
          </p>
        </article>
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            {facilityAudiences.map((item) => (
              <article key={item.title} className="rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-black/5">
                <h3 className="font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-base md:text-sm leading-6 text-slate-600">{item.copy}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-2 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100 sm:grid-cols-2">
            {facilityOutcomes.map((item) => (
              <div key={item} className="flex gap-3 text-base md:text-sm font-semibold leading-6 text-slate-700">
                <Dot />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="grid gap-8 md:grid-cols-[0.75fr_1fr] md:items-end">
          <div>
            <p className="text-base md:text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Built for operators</p>
            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Everything your team needs. Nothing they don&apos;t.</h2>
          </div>
          <p className="leading-7 text-slate-600">
            DailyCall is designed to fit into your existing care workflow - not replace it. Your staff spends less time on routine check-ins, and more time on the residents who need them most.
          </p>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {operatorFeatures.map((feature) => (
            <article key={feature.title} className="rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-bold text-emerald-800 ring-1 ring-emerald-100">
                  {feature.title.slice(0, 1)}
                </div>
                <h3 className="font-bold text-ink">{feature.title}</h3>
              </div>
              <p className="mt-2 text-base md:text-sm leading-6 text-slate-600">{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="rounded-[2rem] bg-[#101820] p-6 text-white shadow-sm ring-1 ring-black/10 md:p-10">
        <div className="max-w-3xl">
          <p className="text-base md:text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Facility pricing</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Straightforward volume pricing.
            <br className="hidden md:block" /> No per-call surprises.
          </h2>
          <p className="mt-4 leading-7 text-slate-300">
            Flat monthly pricing per resident. No setup fees, no per-minute charges, no long-term contracts required. All plans include the full care team dashboard and morning briefings.
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`flex flex-col rounded-3xl p-6 ring-1 ${plan.featured ? "bg-emerald-300 text-[#101820] ring-emerald-200" : "bg-white/10 text-white ring-white/10"}`}>
              {plan.featured ? <p className="mb-3 w-fit rounded-full bg-[#101820] px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200">Most common</p> : null}
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${plan.featured ? "text-emerald-950/70" : "text-slate-400"}`}>{plan.name}</p>
              <p className="mt-3 text-4xl font-bold">{plan.price}<span className="text-base font-semibold">{plan.price.startsWith("$") ? "" : ""}</span></p>
              <p className={`mt-2 text-base md:text-sm font-semibold ${plan.featured ? "text-emerald-950/75" : "text-slate-300"}`}>{plan.unit}</p>
              <p className={`mt-4 text-base md:text-sm leading-6 ${plan.featured ? "text-emerald-950/75" : "text-slate-300"}`}>{plan.copy}</p>
              <ul className="mt-5 grid gap-2">
                {plan.features.map((feature) => (
                  <CheckItem key={feature} dark={!plan.featured}>{feature}</CheckItem>
                ))}
              </ul>
              <div className="grow min-h-6" />
              <a
                href="#demo"
                className={`mt-6 rounded-full px-5 py-3 text-center text-base md:text-sm font-bold shadow-sm ${plan.featured ? "bg-[#101820] text-white hover:bg-slate-900" : "bg-white text-[#101820] hover:bg-emerald-50"}`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-base md:text-sm leading-6 text-slate-300">All plans include a 30-day pilot at no charge for the first wing or unit. No credit card required to start.</p>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-base md:text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">What operators say</p>
        <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl">From the people who run care facilities every day.</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className={`rounded-3xl p-6 shadow-sm ring-1 ${testimonial.large ? "bg-[#101820] text-white ring-black/10 lg:col-span-2" : "bg-emerald-50 text-ink ring-emerald-100"}`}>
              <p className="text-base md:text-sm font-bold tracking-[0.18em] text-amber-500">★★★★★</p>
              <blockquote className={`mt-4 leading-8 ${testimonial.large ? "text-xl text-white" : "text-lg text-ink"}`}>&quot;{testimonial.quote}&quot;</blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base md:text-sm font-bold ${testimonial.large ? "bg-emerald-300 text-[#101820]" : "bg-[#101820] text-white"}`}>
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-bold">{testimonial.name}</p>
                  <p className={`text-base md:text-sm ${testimonial.large ? "text-slate-300" : "text-slate-600"}`}>{testimonial.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <p className="text-base md:text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Questions care operators ask us.</h2>
            <p className="mt-4 leading-7 text-slate-600">Book a call and we&apos;ll walk you through it.</p>
          </div>
          <div className="grid gap-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100" open={question === faqs[0][0]}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {question}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-emerald-800 ring-1 ring-emerald-100 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-base md:text-sm leading-6 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="-mt-8 overflow-hidden rounded-[2rem] bg-[#101820] text-white shadow-sm ring-1 ring-black/10">
        <div className="grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:items-center md:p-10">
          <div>
            <p className="text-base md:text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Ready to start?</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">A daily call for every resident. Starting this month.</h2>
            <p className="mt-4 leading-7 text-slate-300">
              Book a 30-minute team demo and we&apos;ll walk through setup, pricing, and what a pilot looks like for your facility. No commitment required.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-full bg-emerald-300 px-6 py-3 text-center font-bold text-[#101820] shadow-sm hover:bg-emerald-200">
                Book a team demo
              </Link>
            </div>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10 sm:grid-cols-2">
            {["30-day pilot at no charge", "No credit card required", "HIPAA ready - BAA available", "Setup in under a week"].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-white/10 p-4 text-base md:text-sm font-semibold text-slate-200">
                <Dot />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

