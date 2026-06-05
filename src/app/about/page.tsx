import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { SiteHeader } from "@/app/components/site-header";
import { absoluteSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Read the founder's message behind DailyCall, a warm daily phone call for aging parents and grandparents, inspired by Margaret.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About DailyCall",
    description:
      "DailyCall was built from a family question: what if someone kind and patient could check in on the days we cannot be there?",
    url: "/about",
    images: [
      {
        url: "/founder-margaret-family.jpg",
        width: 1024,
        height: 768,
        alt: "DailyCall founder Matt Hemsing with his grandmother Margaret and family",
      },
    ],
  },
};

export default function AboutPage() {
  const beliefs = [
    {
      title: "Honest about AI, always.",
      body: "Every call says it's an AI companion. We'll never pretend otherwise.",
    },
    {
      title: "A companion, not a replacement.",
      body: "Built to add connection - never to stand in for family or care.",
    },
    {
      title: "Care without surveillance.",
      body: "Summaries help families stay close, not monitor or score a person.",
    },
    {
      title: "Simple by design.",
      body: "No apps, passwords, or screens - just a phone call anyone can answer.",
    },
    {
      title: "Private by default.",
      body: "Conversations stay private, and we never sell your data.",
    },
  ];

  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About DailyCall",
    url: absoluteSiteUrl("/about"),
    mainEntity: {
      "@type": "Organization",
      name: "DailyCall",
      founder: {
        "@type": "Person",
        name: "Matt Hemsing",
        sameAs: "https://www.linkedin.com/in/matt-hemsing-85427776/",
      },
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteSiteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "About us",
        item: absoluteSiteUrl("/about"),
      },
    ],
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-5 pb-16 pt-0 text-ink sm:px-6 md:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([aboutJsonLd, breadcrumbJsonLd]) }}
      />
      <SiteHeader />

      <section className="grid gap-8 pt-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">About us</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-normal text-ink md:text-5xl">
            Inspired by Margaret. Built for families like ours.
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700">
            DailyCall began with Margaret, and with the quiet stretches families know too well.
          </p>
        </div>

        <figure>
          <Image
            src="/founder-margaret-family.jpg"
            alt="Matt Hemsing with his grandmother Margaret and family"
            width={1024}
            height={768}
            priority
            className="aspect-[4/3] w-full rounded-[1.5rem] object-cover"
          />
          <figcaption className="pt-3 text-sm font-semibold leading-6 text-slate-500">
            Matt with Margaret, whose independence and quiet strength shaped DailyCall.
          </figcaption>
        </figure>
      </section>

      <section>
        <article className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8 lg:p-10">
          <div className="max-w-4xl">
            <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Founder&apos;s message</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Why we built DailyCall</h2>
            <div className="mt-6 grid gap-5 text-base leading-7 text-slate-700 md:text-lg md:leading-8">
              <p>
                My grandmother Margaret lost her husband when she was 55, and lived another 25 years after that.
              </p>
              <p>
                For a good part of that time she lived with us, and we were lucky to have her close. But even then, there were long stretches where she was on her own: quiet afternoons and slow days when there wasn&apos;t always someone around to talk to. She was independent and sharp, and never wanted to be a burden, so she rarely said much about it.
              </p>
              <p>
                I spent 15 years as a software engineer at IBM before starting DailyCall, and through all of it I kept coming back to the same question: what if someone kind and patient could check in with her on the days we couldn&apos;t be there? Not an alert, not another app to learn, just a real conversation.
              </p>
              <p>
                That&apos;s what DailyCall is. A warm daily phone call for an aging parent or grandparent, and a simple text update afterward so the family knows how it went. It&apos;s meant to add a steady moment of connection to the day, never to replace the people who love them.
              </p>
              <p>
                I built it the way I&apos;d want it for my own family: honest about being AI, private by default, and simple enough to work on the phone already sitting on the kitchen counter.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-5 border-t border-slate-200 pt-8 sm:flex-row sm:items-center">
            <Image
              src="/founder-matt-hemsing.jpg"
              alt="DailyCall founder Matt Hemsing"
              width={1200}
              height={1600}
              className="h-14 w-14 rounded-xl object-cover object-top sm:h-16 sm:w-16"
            />
            <div>
              <p className="text-xl font-bold text-ink">- Matt Hemsing</p>
              <p className="mt-1 text-base font-semibold leading-7 text-slate-600">
                Founder, DailyCall &middot; Software engineer, 15 years at IBM
              </p>
              <Link
                href="https://www.linkedin.com/in/matt-hemsing-85427776/"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"
                >
                  <path d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V9H7.1v11.45ZM22.22 0H1.78C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.78 24h20.44c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
                </svg>
                LinkedIn profile
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] bg-ink p-6 text-cream shadow-sm md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.55fr_1.45fr]">
          <div>
            <p className="text-base font-semibold uppercase tracking-wide text-cream/65 md:text-sm">What we believe</p>
            <h2 className="mt-3 text-3xl font-bold">Built for trust from day one.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {beliefs.map((belief) => (
              <div key={belief.title} className="rounded-2xl bg-white/[0.08] p-5 ring-1 ring-white/10">
                <h3 className="text-lg font-bold">{belief.title}</h3>
                <p className="mt-3 text-base leading-7 text-cream/75">{belief.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-brandBlue/10 p-6 shadow-sm ring-1 ring-brandBlue/15 md:p-8 lg:p-10">
        <div className="max-w-3xl">
          <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Try DailyCall</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Hear what a DailyCall feels like.</h2>
          <p className="mt-4 text-base leading-7 text-slate-700 md:text-lg md:leading-8">
            The best way to understand DailyCall is to hear one. Try a free one-minute demo call, or start your 14-day free trial - no credit card, cancel anytime.
          </p>
          <p className="mt-3 text-base leading-7 text-slate-600">
            DailyCall is new, and we&apos;re building it alongside our first families.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#demo"
              className="rounded-full bg-brandButtonBlue px-6 py-3 text-center text-base font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover"
            >
              Try a free demo call
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-ink px-6 py-3 text-center text-base font-bold text-cream shadow-sm hover:bg-brandButtonBlue"
            >
              Start your free 14-day trial
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
