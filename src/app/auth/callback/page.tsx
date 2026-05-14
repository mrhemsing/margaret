import { Suspense } from "react";

import { AuthCallbackClient } from "./auth-callback-client";

export const metadata = {
  title: "Finishing Login",
};

function AuthCallbackFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold text-ink">One moment</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Finishing login...</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
