import { LegalPageShell } from "@/app/components/legal-page-shell";

export const metadata = {
  title: "Privacy Policy",
  description: "DailyCall privacy practices for account data, calls, transcripts, SMS notifications, security, retention, and support.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p className="mt-4 text-sm font-semibold text-slate-500">Effective May 21, 2026</p>

      <div className="mt-8 space-y-8 text-base leading-7 text-slate-700">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">What DailyCall Does</h2>
          <p>
            DailyCall is a service operated by Hpro Web Development Inc. References to DailyCall, we, us, or our in
            this Privacy Policy mean Hpro Web Development Inc. operating the DailyCall service.
          </p>
          <p>
            DailyCall helps families arrange friendly, AI-assisted companion calls for older loved ones and receive
            concise service updates. We collect and use personal information only as needed to create accounts, schedule
            calls, place calls, personalize conversations, send notifications, provide support, protect the service, and
            improve reliability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">Information We Collect</h2>
          <p>
            We may collect account and contact details, including caregiver names, loved one names, email addresses,
            phone numbers, billing country, authentication details, and support messages.
          </p>
          <p>
            We may collect call setup details, including call schedules, timezones, preferred call windows, selected
            plan, preferred voice, conversation tone, interests, routines, family context, topics to discuss, and topics
            to avoid.
          </p>
          <p>
            We may process call-related information, including call status, missed-call information, voicemail detection,
            transcripts, summaries, memories, personalization notes, and other insights generated from conversations.
          </p>
          <p>
            Loved ones or family members may choose to share health-adjacent or sensitive details during setup or calls,
            such as routines, medications, mood, memory, wellbeing, appointments, care preferences, or safety concerns.
            We use this information to provide and improve DailyCall, not to provide medical advice or emergency care.
          </p>
          <p>
            We also collect technical information such as device, browser, IP address, cookie preferences, pages visited,
            logs, diagnostics, and security events.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">How We Use Information</h2>
          <p>
            We use personal information to operate DailyCall, create and manage accounts, place AI-assisted or automated
            voice calls, generate transcripts and summaries, personalize future conversations, send SMS or email service
            updates, provide support, process billing, prevent misuse, and maintain security.
          </p>
          <p>
            We may use aggregated, de-identified, or anonymized information to understand service performance, improve
            reliability, develop safer product behavior, and measure whether DailyCall is working as intended.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">How We Share Information</h2>
          <p>
            We do not sell personal data. We do not share SMS opt-in, phone numbers, or SMS consent information with
            third parties or affiliates for marketing or promotional purposes. We may share information with the account
            owner and family contacts authorized by the account owner, such as call summaries, transcripts, call status,
            missed-call information, and service updates.
          </p>
          <p>
            We use trusted service providers for hosting, authentication, payments, telephony, SMS, email, voice AI,
            transcription, analytics, support, monitoring, and security. These providers process information only as
            needed to help us operate DailyCall.
          </p>
          <p>
            We may disclose information if required by law, legal process, security needs, fraud prevention, protection
            of rights or safety, or a business transaction such as a merger, financing, acquisition, or sale of assets.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">Retention</h2>
          <p>
            We retain personal information while needed to provide DailyCall, maintain accounts, support families,
            satisfy legal or accounting obligations, resolve disputes, improve safety and reliability, and protect the
            service. When information is no longer needed, we may delete it, anonymize it, or isolate it from further
            processing.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">Your Choices</h2>
          <p>
            You may request access, correction, deletion, or support with your account information by contacting
            DailyCall. Some information may need to be retained for legal, security, billing, or service integrity
            reasons.
          </p>
          <p>
            SMS notifications are sent only to users who provide a phone number and consent to receive DailyCall service
            updates. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help.
          </p>
          <p>
            You can manage optional cookie choices on the Cookies Preferences page or through your browser settings.
            Blocking some cookies may affect site functionality.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">Security and Transfers</h2>
          <p>
            We use technical, organizational, and administrative safeguards designed to protect personal information.
            No internet service can guarantee perfect security, but we work to reduce risk and respond to issues.
          </p>
          <p>
            DailyCall may use service providers in Canada, the United States, or other locations. Your information may be
            processed in places with privacy laws that differ from where you live.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">Children and Safety</h2>
          <p>
            DailyCall is intended for adults and is not directed to children under 18. DailyCall is also not an emergency
            response service, medical provider, crisis hotline, or substitute for professional care. If there is an
            emergency, call local emergency services first.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">Changes and Contact</h2>
          <p>
            We may update this Privacy Policy as DailyCall changes. If we make material changes, we will update the
            effective date and provide notice where appropriate.
          </p>
          <p>
            For privacy or support requests, contact <a className="font-bold text-brandButtonBlue hover:text-ink" href="mailto:support@dailycall.care">support@dailycall.care</a>.
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
