import { isAdminAuthenticated } from "@/lib/admin-auth";
import { absoluteSiteUrl } from "@/lib/site-url";
import { headers } from "next/headers";
import { LandingPage, faqs, testimonials } from "./landing-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Daily Wellness Calls for Seniors",
  description:
    "DailyCall gives aging parents warm daily AI companion calls by regular phone, helping families reduce loneliness, keep routines, and stay informed without another app.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const initialAuthenticated = await isAdminAuthenticated();
  const requestHeaders = await headers();
  const countryHeader =
    requestHeaders.get("x-vercel-ip-country") ??
    requestHeaders.get("cf-ipcountry") ??
    requestHeaders.get("x-country-code");
  const visitorCountry = countryHeader?.toUpperCase() === "US" ? "US" : "CA";
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DailyCall",
    legalName: "Hpro Web Development Inc.",
    url: absoluteSiteUrl("/"),
    logo: absoluteSiteUrl("/dailycall-logo.jpg"),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@dailycall.care",
      availableLanguage: "English",
    },
  };
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "DailyCall",
    serviceType: "AI companion phone calls for seniors",
    url: absoluteSiteUrl("/"),
    description:
      "DailyCall provides friendly daily phone calls for aging parents and simple updates for families. No app or new device required.",
    areaServed: ["United States", "Canada"],
    audience: {
      "@type": "Audience",
      audienceType: "Families caring for aging parents",
    },
    provider: {
      "@type": "Organization",
      name: "DailyCall",
      url: absoluteSiteUrl("/"),
      logo: absoluteSiteUrl("/dailycall-logo.jpg"),
    },
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
      description: "14-day free trial for family companion calls.",
    },
    review: testimonials.map((testimonial) => ({
      "@type": "Review",
      reviewBody: testimonial.quote,
      author: {
        "@type": "Person",
        name: testimonial.name,
      },
    })),
  };
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd, serviceJsonLd, faqJsonLd]) }}
      />
      <LandingPage initialAuthenticated={initialAuthenticated} visitorCountry={visitorCountry} />
    </>
  );
}
