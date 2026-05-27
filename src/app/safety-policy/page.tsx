import { LegalPageShell } from "@/app/components/legal-page-shell";

export const metadata = {
  title: "Safety Policy",
  description: "DailyCall safety policy for non-clinical companion calls, emergency limits, escalation guidance, and responsible use.",
  alternates: {
    canonical: "/safety-policy",
  },
};

export default function SafetyPolicyPage() {
  return (
    <LegalPageShell title="Safety Policy">
      <div className="mt-8 space-y-6 text-base leading-7 text-slate-700">
        <p>
          DailyCall provides friendly, non-clinical companion calls and family updates. It is designed to support routine
          connection and peace of mind, but it is not an emergency response service, medical provider, crisis hotline, or
          substitute for professional care.
        </p>
        <p>
          If a caller shares something that sounds like an emergency, immediate safety threat, self-harm risk, harm to
          another person, or urgent medical concern, DailyCall is designed to encourage the caller to contact emergency
          services, a trusted person, or an appropriate crisis line.
        </p>
        <p>
          Families and authorized contacts remain responsible for urgent follow-up, wellness checks, care decisions, and
          emergency escalation. DailyCall cannot guarantee that every safety concern will be detected, interpreted
          correctly, or delivered to the right person in time.
        </p>
        <p>
          We review call quality, transcripts, summaries, system logs, and product behavior to improve reliability,
          safety handling, and reporting accuracy. Reviews may include automated checks and human review where needed for
          support, safety, security, or service improvement.
        </p>
        <p>
          DailyCall may send service updates, call summaries, missed-call information, or support follow-ups to the
          account owner or authorized contacts based on the account settings and available product features.
        </p>
        <p>
          If there is an emergency or immediate safety concern, call local emergency services first. For support or
          safety questions about DailyCall, contact <a className="font-bold text-brandButtonBlue hover:text-ink" href="mailto:support@dailycall.care">support@dailycall.care</a>.
        </p>
      </div>
    </LegalPageShell>
  );
}
