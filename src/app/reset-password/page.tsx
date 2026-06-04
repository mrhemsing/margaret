import { Suspense } from "react";

import { SiteHeader } from "@/app/components/site-header";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset Password",
};

function ResetPasswordFallback() {
  return <div className="rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5">Loading password reset...</div>;
}

export default function ResetPasswordPage() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 pb-5 pt-0 sm:px-6 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader showLoginLink={false} />
      <section className="mx-auto w-full max-w-xl">
        <Suspense fallback={<ResetPasswordFallback />}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
