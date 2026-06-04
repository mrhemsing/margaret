import { ReactNode } from "react";

import { SiteHeader } from "@/app/components/site-header";

type LegalPageShellProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ eyebrow = "DailyCall", title, children }: LegalPageShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 pb-16 pt-0 text-ink sm:px-6 md:px-10">
      <SiteHeader />
      <section className="mx-auto w-full max-w-3xl pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-sage">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-normal text-ink md:text-5xl">{title}</h1>
        {children}
      </section>
    </main>
  );
}
