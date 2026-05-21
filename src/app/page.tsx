import { SiteHeader } from "@/app/components/site-header";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LandingPage } from "./landing-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Home",
};

function ComingSoonPage({ initialAuthenticated = false }: { initialAuthenticated?: boolean }) {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-5 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader showLoginLink={false} initialAuthenticated={initialAuthenticated} />
      <section className="flex flex-1 items-center justify-center py-16 text-center">
        <div className="max-w-2xl rounded-[2rem] bg-white/80 p-8 shadow-sm ring-1 ring-black/5 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">DailyCall</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink md:text-6xl">Coming soon.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            We&apos;re getting DailyCall ready: friendly companion calls for aging parents and peace of mind for families.
          </p>
        </div>
      </section>
    </main>
  );
}

export default async function HomePage() {
  const initialAuthenticated = await isAdminAuthenticated();

  return process.env.APP_ENV === "production" ? <ComingSoonPage initialAuthenticated={initialAuthenticated} /> : <LandingPage initialAuthenticated={initialAuthenticated} />;
}
