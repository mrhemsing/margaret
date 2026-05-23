import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminTopNav } from "@/app/components/admin-top-nav";
import { SiteHeader } from "@/app/components/site-header";
import { TestCallButtons } from "@/app/components/test-call-buttons";
import { ADMIN_AUTH_COOKIE, isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bridge Test",
};

async function signOutAdminDashboard() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  redirect("/admin");
}

export default async function BridgeTestPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin?next=/bridge-test");
  }

  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 pb-5 pt-0 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <AdminTopNav activePath="/bridge-test" signOutAction={signOutAdminDashboard} />
      <SiteHeader showLoginLink={false} showAccountControls={false} />

      <header className="rounded-[2rem] bg-white/85 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">internal voice lab</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink md:text-5xl">ElevenLabs streaming bridge test</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          Isolated workspace for the Twilio Media Stream bridge using OpenAI transcription, OpenAI text responses, and ElevenLabs streaming TTS.
        </p>
      </header>

      <section className="grid gap-4 rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandButtonBlue">bridge status</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Streaming lane ready</h2>
        </div>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          This page now uses a live WebSocket bridge instead of Twilio Gather turns, so it can be compared more fairly against the Cartesia streaming bridge.
        </p>
      </section>

      <section className="grid gap-4 rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandButtonBlue">phone path</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Bridge test calls</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Calls through Twilio Media Streams with OpenAI Realtime transcription, OpenAI text replies, and ElevenLabs Flash v2.5 streaming audio. Dashboard calls stay unchanged.
          </p>
        </div>
        <TestCallButtons endpoint="/api/bridge-test/call" caregiverName="DailyCall bridge test reviewer" />
      </section>
    </main>
  );
}
