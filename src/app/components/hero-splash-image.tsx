import Image from "next/image";

const splashPlaceholder =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 13'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='0' y1='0' y2='1'%3E%3Cstop stop-color='%23edf6fb'/%3E%3Cstop offset='0.55' stop-color='%23f7fbfd'/%3E%3Cstop offset='1' stop-color='%23ffffff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='16' height='13' fill='url(%23g)'/%3E%3C/svg%3E";

export function HeroSplashImage() {
  return (
    <>
      <Image
        src="/home-splash-mobile-senior-call-no-frame.png"
        alt="Smiling senior on a phone call for a DailyCall check-in"
        width={1024}
        height={1536}
        priority
        fetchPriority="high"
        sizes="(max-width: 639px) 100vw, 0vw"
        placeholder="blur"
        blurDataURL={splashPlaceholder}
        className="mobile-splash-image absolute inset-x-0 object-cover sm:hidden"
      />
      <Image
        src="/home-splash-desktop-phone-smile.jpg"
        alt="Smiling senior on the phone for a DailyCall check-in"
        width={1280}
        height={1099}
        priority
        fetchPriority="high"
        sizes="(min-width: 640px) 100vw, 0vw"
        placeholder="blur"
        blurDataURL={splashPlaceholder}
        className="desktop-splash-image absolute inset-0 hidden object-cover sm:block"
      />
    </>
  );
}
