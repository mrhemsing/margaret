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
            Built from a family question.
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

      <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <aside className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <Image
            src="/founder-matt-hemsing.jpg"
            alt="DailyCall founder Matt Hemsing"
            width={400}
            height={400}
            className="aspect-square w-32 rounded-3xl object-cover grayscale md:w-36"
          />
          <div className="mt-5">
            <p className="text-xl font-bold text-ink">Matt Hemsing</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Founder, DailyCall</p>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Software engineer for 15 years at IBM before starting DailyCall.
            </p>
            <Link
              href="https://www.linkedin.com/in/matt-hemsing-85427776/"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover"
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
        </aside>

        <article className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <p className="text-base font-semibold uppercase tracking-wide text-sage md:text-sm">Founder&apos;s message</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Why we built DailyCall</h2>
          <div className="mt-6 grid gap-5 text-base leading-7 text-slate-700 md:text-lg md:leading-8">
            <p>
              My grandmother Margaret lost her husband when she was 55, and lived another 25 years after that.
            </p>
            <p>
              For a good part of that time she lived with us, and we were lucky to have her close. But even then, there were long stretches where she was on her own: quiet afternoons and slow days when there was not always someone around to talk to. She was independent and sharp, and never wanted to be a burden, so she rarely said much about it.
            </p>
            <p>
              I spent 15 years as a software engineer at IBM before starting DailyCall, and through all of it I kept coming back to the same question: what if someone kind and patient could check in with her on the days we could not be there? Not an alert, not another app to learn, just a real conversation.
            </p>
            <p>
              That is what DailyCall is. A warm daily phone call for an aging parent or grandparent, and a simple text update afterward so the family knows how it went. It is meant to add a steady moment of connection to the day, never to replace the people who love them.
            </p>
            <p>
              I built it the way I would want it for my own family: honest about being AI, private by default, and simple enough to work on the phone already sitting on the kitchen counter.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
