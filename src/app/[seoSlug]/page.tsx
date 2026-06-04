import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/app/components/site-header";
import { seoLandingPageMap, seoLandingPages } from "@/app/seo-pages";
import { absoluteSiteUrl } from "@/lib/site-url";

type SeoPageProps = {
  params: Promise<{
    seoSlug: string;
  }>;
};

export function generateStaticParams() {
  return seoLandingPages.map((page) => ({ seoSlug: page.slug }));
}

export async function generateMetadata({ params }: SeoPageProps): Promise<Metadata> {
  const { seoSlug } = await params;
  const page = seoLandingPageMap.get(seoSlug);

  if (!page) {
    return {};
  }

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/${page.slug}`,
    },
    openGraph: {
      title: `${page.title} | DailyCall`,
      description: page.description,
      url: `/${page.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | DailyCall`,
      description: page.description,
    },
  };
}

export default async function SeoLandingPage({ params }: SeoPageProps) {
  const { seoSlug } = await params;
  const page = seoLandingPageMap.get(seoSlug);

  if (!page) {
    notFound();
  }

  const relatedPages = page.related
    .map((slug) => seoLandingPageMap.get(slug))
    .filter((relatedPage): relatedPage is NonNullable<typeof relatedPage> => Boolean(relatedPage));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: page.title,
      serviceType: "Senior companion and check-in phone calls",
      provider: {
        "@type": "Organization",
        name: "DailyCall",
        url: absoluteSiteUrl("/"),
      },
      url: absoluteSiteUrl(`/${page.slug}`),
      description: page.description,
      areaServed: ["Canada", "United States"],
      audience: {
        "@type": "Audience",
        audienceType: "Families caring for aging parents and older loved ones",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
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
          name: page.title,
          item: absoluteSiteUrl(`/${page.slug}`),
        },
      ],
    },
  ];

  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 pb-12 pt-0 text-ink sm:px-6 md:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <header className="rounded-[2rem] bg-white/85 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-sage">{page.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-normal text-ink md:text-5xl">{page.h1}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{page.intro}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className="rounded-full bg-brandButtonBlue px-5 py-3 text-center text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover">
            Start free trial
          </Link>
          <Link href="/#demo" className="rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-ink shadow-sm ring-1 ring-black/10 hover:bg-slate-50">
            Try a demo call
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {page.sections.map((section) => (
          <article key={section.heading} className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
            <h2 className="text-2xl font-bold text-ink">{section.heading}</h2>
            <p className="mt-4 leading-7 text-slate-600">{section.body}</p>
            {section.bullets ? (
              <ul className="mt-5 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brandPink" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] bg-brandBlue/10 p-6 shadow-sm ring-1 ring-brandBlue/15 md:p-8">
        <h2 className="text-2xl font-bold text-ink">Common questions</h2>
        <div className="mt-5 grid gap-3">
          {page.faqs.map((item) => (
            <details key={item.question} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 open:ring-brandBlue/25">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandBlue/10 text-lg leading-none text-brandButtonBlue transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <h2 className="text-2xl font-bold text-ink">Related DailyCall resources</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {relatedPages.map((relatedPage) => (
            <Link
              key={relatedPage.slug}
              href={`/${relatedPage.slug}`}
              className="rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-brandButtonBlue shadow-sm ring-1 ring-black/5 hover:text-ink hover:ring-brandBlue/25"
            >
              {relatedPage.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
