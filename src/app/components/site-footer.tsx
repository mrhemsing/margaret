import Link from "next/link";

const footerLinks = [
  { href: "/support", label: "Contact" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/safety-policy", label: "Safety Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
  { href: "/cookie-preferences", label: "Cookies Preferences" },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-6 bg-transparent px-5 pb-6 sm:px-6 md:px-10">
      <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
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
    </footer>
  );
}
