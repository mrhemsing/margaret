export function CountryFlag({ country }: { country: "CA" | "US" }) {
  if (country === "US") {
    return (
      <svg className="h-4 w-6 overflow-hidden rounded-[0.2rem] shadow-sm ring-1 ring-black/10" viewBox="0 0 7410 3900" aria-hidden="true">
        <rect width="7410" height="3900" fill="#b22234" />
        <path d="M0 300h7410M0 900h7410M0 1500h7410M0 2100h7410M0 2700h7410M0 3300h7410" stroke="#fff" strokeWidth="300" />
        <rect width="2964" height="2100" fill="#3c3b6e" />
        <g fill="#fff">
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: row % 2 === 0 ? 6 : 5 }).map((__, column) => {
              const x = row % 2 === 0 ? 247 + column * 494 : 494 + column * 494;
              const y = 210 + row * 210;
              return (
                <path
                  key={`${row}-${column}`}
                  transform={`translate(${x} ${y}) scale(95)`}
                  d="m0-1 .225.691h.727l-.588.427.224.692L0 1.382l-.588.427.224-.692-.588-.427h.727z"
                />
              );
            }),
          )}
        </g>
      </svg>
    );
  }

  return (
    <svg className="h-4 w-6 overflow-hidden rounded-[0.2rem] shadow-sm ring-1 ring-black/10" viewBox="0 0 1200 600" aria-hidden="true">
      <rect width="1200" height="600" fill="#fff" />
      <rect width="300" height="600" fill="#f00" />
      <rect x="900" width="300" height="600" fill="#f00" />
      <path
        fill="#f00"
        d="m600 90 37 114c6 17 22 15 38 12l78-16-52 91c-11 19-3 25 11 32l58 29-103 22c-13 3-16 11-12 23l31 96-72-52c-10-7-20-7-20 8l3 107h-34l3-107c0-15-10-15-20-8l-72 52 31-96c4-12 1-20-12-23l-103-22 58-29c14-7 22-13 11-32l-52-91 78 16c16 3 32 5 38-12z"
      />
    </svg>
  );
}
