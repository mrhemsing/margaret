import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { SiteHeader } from "@/app/components/site-header";
import { absoluteSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Read the founder's message behind DailyCall, a warm daily phone call for aging parents and grandparents.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About DailyCall",
    description:
      "DailyCall began with Matt Hemsing's grandmother and the quiet isolation that can come with aging independently.",
    url: "/about",
    images: [
      {
        url: "/founder-margaret-family-watercolor.jpg",
        width: 1280,
        height: 1157,
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
            DailyCall began with my grandmother.
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700">
            Built for aging parents and grandparents who value their independence, but still need one more voice in the day.
          </p>
        </div>

        <Image
          src="/founder-margaret-family-watercolor.jpg"
          alt="Matt Hemsing with his grandmother Margaret and family"
          width={1280}
          height={1157}
          priority
          className="w-full object-cover"
        />
      </section>

      <section>
        <article className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8 lg:p-10">
          <div className="max-w-4xl">
            <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Founder&apos;s message</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Why we built DailyCall</h2>
            <div className="mt-6 grid gap-5 text-base leading-7 text-slate-700 md:text-lg md:leading-8">
              <p>
                She was widowed at just 55. For years afterward she split her time - part of it living with our family, the rest on her own, in an apartment about an hour away. Looking back, I don&apos;t think I understood what those long stretches of solitude were really like for her.
              </p>
              <p>
                One day I caught her talking to the walls.
              </p>
              <p>
                I asked, &quot;Grandma, who are you talking to?&quot;
              </p>
              <p>
                She smiled and said, &quot;You would be too if you lived alone for as long as I have.&quot;
              </p>
              <p>
                At the time, I thought she was joking. Years later, I realized she wasn&apos;t.
              </p>
              <p>
                Loneliness is rarely dramatic. It doesn&apos;t always look like sadness. More often it looks like quiet days with nobody to talk to, nobody asking how you&apos;re doing, and nobody noticing when something feels off. As our parents and grandparents age, many keep living independently - they value their freedom, their routines, their homes. But independence can quietly come with isolation.
              </p>
              <p>
                DailyCall was built to help bridge that gap.
              </p>
              <p>
                Every day, it makes a friendly phone call to check in, have a real conversation, and ask a few personalized questions. Afterward, family members get a brief update - enough to stay close, not to keep watch. And it&apos;s always honest about what it is: an AI companion, never pretending to be a person.
              </p>
              <p>
                It isn&apos;t meant to replace family, friends, neighbors, or real human connection.
              </p>
              <p>
                It&apos;s simply one more voice.<br />
                One more conversation.<br />
                One more moment in the day where someone asks, &quot;How are you doing today?&quot;
              </p>
              <p>
                I spent fifteen years building software at IBM, and I built DailyCall because I wish something like it had existed for my grandmother.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-4 border-t border-slate-200 pt-8 sm:grid-cols-[11rem_1fr] sm:gap-6 md:grid-cols-[13rem_1fr]">
            <Image
              src="/founder-matt-hemsing.jpg"
              alt="DailyCall founder Matt Hemsing"
              width={1087}
              height={1457}
              className="h-36 w-36 rounded-2xl object-cover object-top sm:h-44 sm:w-44 md:h-52 md:w-52"
            />
            <div className="min-w-0">
              <Link
                href="https://www.linkedin.com/in/matt-hemsing-85427776/"
                className="inline-flex items-center gap-2 text-lg font-bold text-ink hover:text-brandButtonBlue sm:text-xl"
                aria-label="Matt Hemsing on LinkedIn"
              >
                <span>- Matt Hemsing</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"
                >
                  <path d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V9H7.1v11.45ZM22.22 0H1.78C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.78 24h20.44c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
                </svg>
              </Link>
              <p className="mt-1 text-base font-semibold leading-7 text-slate-600">Founder, DailyCall Care</p>
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
