import Link from "next/link";

import { LegalPageShell } from "@/app/components/legal-page-shell";
import { plans } from "@/app/landing-page";
import { trialLengthDays } from "@/lib/plans";
import { absoluteSiteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Pricing",
  description: "DailyCall pricing for Wellness and Companion plans, including free trial details and monthly companion call minutes.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
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
        name: "Pricing",
        item: absoluteSiteUrl("/pricing"),
      },
    ],
  };

  return (
    <LegalPageShell title="Pricing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
        Both plans include a {trialLengthDays}-day free trial. No credit card required.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.name} className="flex flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-semibold uppercase tracking-wide text-sage">{plan.name}</p>
            <p className="mt-3 text-4xl font-bold text-ink">
              {plan.price}
              <span className="text-base font-medium text-slate-500"> / mo</span>
            </p>
            <p className="mt-3 min-h-12 text-sm font-semibold leading-6 text-ink">{plan.bestFor}</p>
            <p className="mt-2 text-sm font-bold text-sage">{plan.includedMinutes}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{plan.trial}</p>
            <ul className="mt-5 grid gap-2 text-sm leading-6 text-slate-600">
              {plan.includes.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brandPink" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="grow" />
            <Link href="/signup" className="mt-6 inline-flex w-fit rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover">
              {plan.cta}
            </Link>
          </article>
        ))}
      </div>
    </LegalPageShell>
  );
}
