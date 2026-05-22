import { LegalPageShell } from "@/app/components/legal-page-shell";

import { SupportContactForm } from "./support-contact-form";

export const metadata = {
  title: "Support",
};

export default function SupportPage() {
  return (
    <LegalPageShell title="Support">
      <div className="mt-8 space-y-6 text-base leading-7 text-slate-700">
        <p>
          Need help with signup, call scheduling, billing, transcripts, dashboard access, or a loved one&apos;s call
          settings? Email DailyCall support and include the name and email address on the account.
        </p>
        <p>
          Contact us at <a className="font-bold text-brandButtonBlue hover:text-ink" href="mailto:support@dailycall.care">support@dailycall.care</a>.
          We usually reply by email as soon as possible.
        </p>
        <p>
          DailyCall is not an emergency response service. If there is an emergency or immediate safety concern, call
          local emergency services first.
        </p>
      </div>
      <SupportContactForm />
    </LegalPageShell>
  );
}
