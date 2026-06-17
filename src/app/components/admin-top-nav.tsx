import Link from "next/link";

import { AutoCloseDetails } from "@/app/components/auto-close-details";

type AdminTopNavProps = {
  activePath: "/admin" | "/admin/marketing" | "/admin/compare" | "/elevenlabs-test" | "/realtime-test" | "/bridge-test" | "/cartesia-test";
  signOutAction: () => Promise<void>;
};

const adminLinks = [
  { href: "/admin", label: "Operations" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/compare", label: "Compare" },
  { href: "/elevenlabs-test", label: "ElevenLabs test" },
  { href: "/realtime-test", label: "Realtime test" },
  { href: "/cartesia-test", label: "Cartesia test" },
  { href: "/bridge-test", label: "Bridge test" },
] as const;

function linkClassName(active: boolean) {
  return [
    "whitespace-nowrap text-sm font-bold transition",
    active ? "text-brandButtonBlue" : "text-ink hover:text-brandButtonBlue",
  ].join(" ");
}

export function AdminTopNav({ activePath, signOutAction }: AdminTopNavProps) {
  return (
    <div className="absolute right-6 top-4 z-[60] md:right-10">
      <div className="hidden items-center gap-2 sm:flex">
        {adminLinks.map((link, index) => (
          <div key={link.href} className="flex items-center gap-2">
            {index > 0 ? <span className="text-sm font-bold text-slate-300">|</span> : null}
            <Link href={link.href} className={linkClassName(activePath === link.href)}>
              {link.label}
            </Link>
          </div>
        ))}
        <span className="text-sm font-bold text-slate-300">|</span>
        <form action={signOutAction}>
          <button type="submit" className="whitespace-nowrap text-right text-sm font-bold text-ink transition hover:text-brandButtonBlue">
            Sign out
          </button>
        </form>
      </div>

      <AutoCloseDetails className="group relative sm:hidden">
        <summary
          className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-white/90 text-ink shadow-sm ring-1 ring-black/10 transition hover:text-brandButtonBlue [&::-webkit-details-marker]:hidden"
          aria-label="Open admin menu"
        >
          <span className="flex flex-col gap-1" aria-hidden="true">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </summary>
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/10">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "block rounded-xl px-3 py-2 text-sm font-bold transition",
                activePath === link.href ? "bg-sky-50 text-brandButtonBlue" : "text-ink hover:bg-slate-50 hover:text-brandButtonBlue",
              ].join(" ")}
            >
              {link.label}
            </Link>
          ))}
          <form action={signOutAction} className="mt-1 border-t border-slate-300 pt-1">
            <button type="submit" className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-slate-50 hover:text-brandButtonBlue">
              Sign out
            </button>
          </form>
        </div>
      </AutoCloseDetails>
    </div>
  );
}
