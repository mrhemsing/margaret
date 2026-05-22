"use client";

import { useEffect, useState } from "react";

const storageKey = "dailycall-cookie-preferences";

type CookiePreferences = {
  analytics: boolean;
};

export function CookiePreferencesForm() {
  const [preferences, setPreferences] = useState<CookiePreferences>({ analytics: true });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as Partial<CookiePreferences>;
      setPreferences({ analytics: Boolean(parsed.analytics) });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  function savePreferences() {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
    setSaved(true);
  }

  function acceptAll() {
    const nextPreferences = { analytics: true };
    setPreferences(nextPreferences);
    window.localStorage.setItem(storageKey, JSON.stringify(nextPreferences));
    setSaved(true);
  }

  function rejectOptional() {
    const nextPreferences = { analytics: false };
    setPreferences(nextPreferences);
    window.localStorage.setItem(storageKey, JSON.stringify(nextPreferences));
    setSaved(true);
  }

  return (
    <section className="mt-8 grid gap-5 rounded-[2rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
      <div className="rounded-3xl bg-brandBlue/10 p-5 ring-1 ring-brandBlue/15">
        <p className="text-sm font-bold text-ink">Essential cookies</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Always on. These support security, sign-in, checkout, and saved preferences.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <input
          type="checkbox"
          checked={preferences.analytics}
          onChange={(event) => {
            setPreferences({ analytics: event.target.checked });
            setSaved(false);
          }}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brandButtonBlue focus:ring-brandPink"
        />
        <span>
          <span className="block text-sm font-bold text-ink">Analytics cookies</span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            Help us understand site performance and improve signup, pricing, and support pages.
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={savePreferences} className="rounded-full bg-brandButtonBlue px-6 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover">
          Save preferences
        </button>
        <button type="button" onClick={acceptAll} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:text-ink">
          Accept all
        </button>
        <button type="button" onClick={rejectOptional} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:text-ink">
          Reject optional
        </button>
      </div>

      {saved ? <p className="text-sm font-semibold text-sage">Your cookie preferences have been saved on this device.</p> : null}
    </section>
  );
}
