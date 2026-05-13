"use client";

import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const providers = [
  { id: "google", label: "Sign in with Google" },
] as const;

type SupportedProviderId = "google" | "apple" | "facebook";

type ProviderId = (typeof providers)[number]["id"];

function ProviderLogo({ provider }: { provider: SupportedProviderId }) {
  if (provider === "google") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
      </svg>
    );
  }

  if (provider === "apple") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
        <path fill="currentColor" d="M20.72 13.59c-.21-2.22 1.38-4 1.44-4.06-1.3-1.84-3.32-2-3.93-2.06-1.63-.18-3.26.96-4.12.96-.85 0-2.09-.87-3.46-.84-1.94.06-3.66 1.06-4.6 2.69-1.85 3.22-.58 7.99 1.26 10.63.91 1.32 2.02 2.78 3.43 2.72 1.36-.06 1.86-.87 3.56-.87 1.69 0 2.1.87 3.58.81 1.55-.06 2.44-1.29 3.31-2.63.95-1.47 1.42-2.92 1.48-2.98-.06 0-2.86-1.12-2.88-4.32.88-.02.91-.05.93-.05ZM16.63 6.34c.69-.86 1.15-1.9 1.06-3.01-1.06.06-2.19.67-2.9 1.52-.67.7-1.17 1.75-1.08 2.82 1.08.07 2.22-.47 2.92-1.33Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path fill="currentColor" d="M9 8H6v4h3v12h5V12h3.64L18 8h-4V6.33C14 5.38 14.38 5 15.12 5H18V1h-2c-3.86 0-5 2.22-5 5v2Z" />
    </svg>
  );
}

export function SocialSigninButtons({ next = "/signup" }: { next?: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function signInWithProvider(provider: ProviderId) {
    setMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in could not start.");
    }
  }

  const providerClassNames: Record<SupportedProviderId, string> = {
    google: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    apple: "border-black bg-black text-white hover:bg-slate-800",
    facebook: "border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#166FE5]",
  };

  return (
    <div>
      <div className="mx-auto grid w-full max-w-sm grid-cols-1 gap-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => signInWithProvider(provider.id)}
            className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandButtonBlue ${providerClassNames[provider.id]}`}
          >
            <ProviderLogo provider={provider.id} />
            <span className="whitespace-nowrap">{provider.label}</span>
          </button>
        ))}
      </div>
      {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
    </div>
  );
}
