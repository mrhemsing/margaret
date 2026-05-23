import { LegalPageShell } from "@/app/components/legal-page-shell";

export const metadata = {
  title: "Terms & Conditions",
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPageShell title="Terms & Conditions">
      <div className="mt-8 space-y-6 text-base leading-7 text-slate-700">
        <p>
          DailyCall is a service operated by Hpro Web Development Inc. References to DailyCall, we, us, or our in these
          Terms & Conditions mean Hpro Web Development Inc. operating the DailyCall service.
        </p>
        <p>
          By using DailyCall, you agree to provide accurate account, contact, and scheduling information and to use the
          service only for lawful, consent-based communication.
        </p>
        <p>
          DailyCall may place automated or AI-assisted phone calls and send SMS notifications related to scheduled calls,
          missed calls, voicemail detection, account activity, and dashboard access.
        </p>
        <p>
          SMS opt-in occurs when a user signs up for DailyCall, provides a phone number, and agrees to receive service
          notifications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for
          help.
        </p>
        <p>
          DailyCall is not an emergency response service, medical provider, or substitute for professional care. Families
          remain responsible for urgent follow-up and emergency decisions.
        </p>
        <p>
          We may change, pause, or discontinue parts of the service as needed for reliability, compliance, security, or
          business reasons.
        </p>
      </div>
    </LegalPageShell>
  );
}
