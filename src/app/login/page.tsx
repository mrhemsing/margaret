import { Suspense } from "react";

import { SiteHeader } from "@/app/components/site-header";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return <div className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">Loading login...</div>;
}

export default function LoginPage() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-5 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader showLoginLink={false} />
      <section className="mx-auto w-full max-w-xl">
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
