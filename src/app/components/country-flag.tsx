export function CountryFlag({ country }: { country: "CA" | "US" }) {
  return (
    <span className={`fi fi-${country.toLowerCase()} h-[1.1rem] w-[2.2rem]`} aria-hidden="true" />
  );
}
