import { LegalPageShell } from "@/app/components/legal-page-shell";

export const metadata = {
  title: "Cookie Policy",
};

export default function CookiePolicyPage() {
  return (
    <LegalPageShell title="Cookie Policy">
      <div className="mt-8 space-y-6 text-base leading-7 text-slate-700">
        <p>
          DailyCall uses cookies and similar local storage technologies to keep the website reliable, remember basic
          preferences, support secure sign-in, understand site performance, and improve the service.
        </p>
        <p>
          Essential cookies are required for core functions such as authentication, security, fraud prevention, form
          protection, and remembering your cookie preferences. These cannot be turned off because the service may not
          work correctly without them.
        </p>
        <p>
          Analytics cookies help us understand how visitors use DailyCall pages, which content is helpful, and where the
          signup experience can be improved. We use this information in aggregate and do not sell personal data.
        </p>
        <p>
          Service providers may set cookies or similar identifiers when they provide hosting, authentication, payments,
          analytics, messaging, or other infrastructure needed to operate DailyCall.
        </p>
        <p>
          You can manage non-essential cookie choices on the Cookies Preferences page. You can also block or delete
          cookies through your browser settings, though some parts of the service may stop working as expected.
        </p>
        <p>
          For privacy or cookie questions, contact us at <a className="font-bold text-brandButtonBlue hover:text-ink" href="mailto:support@dailycall.care">support@dailycall.care</a>.
        </p>
      </div>
    </LegalPageShell>
  );
}
