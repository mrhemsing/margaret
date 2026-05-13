"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing login...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      const next = searchParams.get("next") || "/dashboard";
      const code = searchParams.get("code");

      try {
        const supabase = createBrowserSupabaseClient();

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (!cancelled) {
          router.replace(next);
        }
      } catch (error) {
        if (!cancelled) {
          setFailed(true);
          setMessage(error instanceof Error ? error.message : "Login could not be completed.");
        }
      }
    }

    finishLogin();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold text-ink">{failed ? "Login needs attention" : "One moment"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        {failed ? (
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-bold text-cream shadow-sm hover:bg-brandButtonBlueHover">
            Back to login
          </Link>
        ) : null}
      </div>
    </main>
  );
}
