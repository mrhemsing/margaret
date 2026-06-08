import Link from "next/link";

const footerLinks = [
  { href: "/support", label: "Contact" },
  { href: "/about", label: "About" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms" },
  { href: "/pricing", label: "Pricing" },
  { href: "/terms-and-conditions#cancellation-info", label: "Cancellation info" },
  { href: "/safety-policy", label: "Safety Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
  { href: "/cookie-preferences", label: "Cookies Preferences" },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-6 bg-transparent px-5 pb-6 sm:px-6 md:px-10">
      <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-6 text-center">
        <p className="w-full text-sm leading-6 text-slate-500">
          DailyCall uses AI-generated phone calls for daily check-ins. It is not emergency monitoring, medical advice,
          or a replacement for caregivers.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:text-left">
          <p className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 md:justify-start">
            <span>© {currentYear} DailyCall</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-base font-semibold text-brandButtonBlue md:justify-end md:text-sm">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-ink">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
