import Image from "next/image";
import Link from "next/link";

export type SiteHeaderLink = {
  href: string;
  label: string;
  active?: boolean;
};

type SiteHeaderProps = {
  showLoginLink?: boolean;
  showTrialButton?: boolean;
  links?: SiteHeaderLink[];
};

export function SiteHeader({ showLoginLink = true, showTrialButton = false, links = [] }: SiteHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-5 justify-end px-2 text-sm font-semibold text-slate-600">
        {showLoginLink ? (
          <Link href="/login" className="whitespace-nowrap hover:text-ink">
            Existing user? Login
          </Link>
        ) : null}
      </div>
      <nav className="flex min-h-[3.25rem] items-center justify-between py-1 sm:min-h-[3.5rem]">
        <Link href="/" className="block h-[2.95rem] w-[12.35rem] sm:-mt-4 sm:h-[3.32rem] sm:w-56" aria-label="Dailycall home">
          <Image src="/dailycall-logo.svg" alt="dailycall" width={632} height={150} priority className="h-full w-full object-contain object-left" />
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          {links.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className={link.active ? "text-sage" : "hover:text-ink"}>
              {link.label}
            </Link>
          ))}
          {showTrialButton ? (
            <Link href="/signup" className="rounded-full bg-brandButtonBlue px-4 py-2 text-sm font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover">
              <span className="sm:hidden">Start free trial</span>
              <span className="hidden sm:inline">Start free 30-day trial</span>
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
