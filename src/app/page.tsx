import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LandingPage } from "./landing-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "DailyCall | AI Companion Calls for Seniors and Aging Parents",
  description:
    "DailyCall gives aging parents warm daily AI companion calls by regular phone, helping families reduce loneliness, keep routines, and stay informed without another app.",
};

export default async function HomePage() {
  const initialAuthenticated = await isAdminAuthenticated();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "DailyCall",
    serviceType: "AI companion phone calls for seniors",
    url: "https://dailycall.care/",
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
      url: "https://dailycall.care/",
      logo: "https://dailycall.care/dailycall-logo.jpg",
    },
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
      description: "14-day free trial for family companion calls.",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage initialAuthenticated={initialAuthenticated} />
    </>
  );
}
