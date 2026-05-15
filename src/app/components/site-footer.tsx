import Link from "next/link";

const footerLinks = [
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
  { href: "/cookie-preferences", label: "Cookies Preferences" },
  { href: "/support", label: "Support" },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 bg-transparent px-6 pb-6 text-center md:flex-row md:items-center md:justify-between md:px-10 md:text-left">
      <p className="text-sm font-semibold text-slate-500">© {currentYear} DailyCall</p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-base font-semibold text-brandButtonBlue md:justify-end md:text-sm">
        {footerLinks.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-ink">
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
