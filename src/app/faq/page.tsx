import Link from "next/link";

import { LegalPageShell } from "@/app/components/legal-page-shell";
import { faqs } from "@/app/landing-page";
import { absoluteSiteUrl } from "@/lib/site-url";

export const metadata = {
  title: "FAQ",
  description: "Answers to common questions about DailyCall companion calls, setup, landlines, privacy, updates, and family support.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
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
        name: "FAQ",
        item: absoluteSiteUrl("/faq"),
      },
    ],
  };

  return (
    <LegalPageShell title="FAQ">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }}
      />
      <div className="mt-8 grid gap-3">
        {faqs.map(([question, answer]) => (
          <details key={question} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 open:ring-brandBlue/25">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
              <span>{question}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandBlue/10 text-lg leading-none text-brandButtonBlue transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{answer}</p>
          </details>
        ))}
      </div>
      <div className="mt-8">
        <Link href="/signup" className="inline-flex rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover">
          Start free trial
        </Link>
      </div>
    </LegalPageShell>
  );
}
