export function CountryFlag({ country }: { country: "CA" | "US" }) {
  return (
    <span
      className={`fi fi-${country.toLowerCase()} h-[1.1rem] w-[2.2rem] overflow-hidden rounded-[0.2rem] shadow-sm ring-1 ring-black/10`}
      aria-hidden="true"
    />
  );
}
