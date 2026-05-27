import { SiteHeader } from "@/app/components/site-header";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata = {
  title: "Set New Password",
};

export default function UpdatePasswordPage() {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 pb-5 pt-0 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-white via-white/85 to-transparent md:left-1/2 md:right-auto md:w-screen md:-translate-x-1/2" />
      <SiteHeader showLoginLink={false} />
      <section className="mx-auto w-full max-w-xl">
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
