import Link from "next/link";
import Image from "next/image";

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
      <section className="border-t border-slate-200/80 pt-6 text-left text-base leading-7 text-slate-600 md:text-sm md:leading-6">
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          <div className="h-full rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="font-semibold text-ink">Our approach to care</p>
            <div className="mt-3 grid gap-3">
              <p>
                Our companion calls are designed to provide daily reassurance, wellness check-ins, conversation, routine, companionship, and a warm sense of connection for loved ones and families.
              </p>
              <p>
                While our service can help reduce loneliness and provide comfort, companionship, and entertainment throughout the day, we strongly encourage family members and friends to stay actively connected with their loved ones whenever possible.
              </p>
              <p>
                Human relationships and social connection are deeply important. Our service is not intended to replace family interaction, caregiving, friendship, or socialization - but rather to support and enhance everyday connection, comfort, safety, and peace of mind for everyone involved.
              </p>
            </div>
          </div>
          <div className="h-full rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="font-semibold text-ink">Privacy and security standards</p>
            <div className="mt-3 flex items-center gap-4">
              <Image src="/trust/pipeda.webp" alt="PIPEDA privacy standards" width={625} height={625} className="h-auto w-[4.5rem] rounded-2xl sm:w-[4.86rem]" />
              <Image src="/trust/hipaa.png" alt="HIPAA privacy standards" width={1455} height={677} className="h-auto w-[8.1rem] rounded-2xl sm:w-[8.1rem]" />
            </div>
            <ul className="mt-4 grid gap-y-1 font-semibold text-slate-600">
              <li>• HIPAA Ready</li>
              <li>• PIPEDA Aligned</li>
              <li>• Encrypted Calls &amp; Data</li>
              <li>• We Never Sell Your Data</li>
              <li>• Secure Payments by Stripe</li>
              <li>• Built with Early Access Families</li>
            </ul>
          </div>
        </div>
        <p className="mt-6 border-t border-slate-200/80 pt-4">
          We follow industry-standard privacy and security practices designed to support Canadian privacy requirements, including Personal Information Protection and Electronic Documents Act (PIPEDA), as well as U.S. healthcare privacy standards associated with Health Insurance Portability and Accountability Act (HIPAA).
        </p>
      </section>
      <div className="flex flex-col gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left">
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
