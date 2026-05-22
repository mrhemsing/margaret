import { LegalPageShell } from "@/app/components/legal-page-shell";

import { CookiePreferencesForm } from "./cookie-preferences-form";

export const metadata = {
  title: "Cookies Preferences",
};

export default function CookiePreferencesPage() {
  return (
    <LegalPageShell title="Cookies Preferences">
      <div className="mt-8 space-y-6 text-base leading-7 text-slate-700">
        <p>
          Choose whether DailyCall can use optional analytics cookies on this device. Essential cookies remain active
          because they are needed for security, sign-in, checkout, and basic site operation.
        </p>
        <p>
          These preferences are stored locally in your browser. If you clear browser data or use another device, you may
          need to set them again.
        </p>
      </div>
      <CookiePreferencesForm />
    </LegalPageShell>
  );
}
