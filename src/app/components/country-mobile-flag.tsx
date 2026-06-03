"use client";

import { useEffect, useState } from "react";

import { CountryFlag } from "@/app/components/country-flag";

export function CountryMobileFlag() {
  const [country, setCountry] = useState<"CA" | "US">("CA");

  useEffect(() => {
    let cancelled = false;

    async function loadCountry() {
      try {
        const response = await fetch("/api/visitor-country", { cache: "no-store" });
        const data = (await response.json()) as { country?: "CA" | "US" };

        if (!cancelled && data.country) {
          setCountry(data.country);
        }
      } catch {
        // Canada is the fallback market when country detection is unavailable.
      }
    }

    void loadCountry();

    return () => {
      cancelled = true;
    };
  }, []);

  const label = country === "US" ? "United States" : "Canada";

  return (
    <span className="inline-flex items-center md:hidden" title={`Serving families in ${label}`}>
      <CountryFlag country={country} />
    </span>
  );
}
