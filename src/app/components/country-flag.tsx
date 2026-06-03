export function CountryFlag({ country }: { country: "CA" | "US" }) {
  if (country === "US") {
    return (
      <svg className="h-[1.1rem] w-[2.1rem] overflow-hidden rounded-[0.2rem] shadow-sm ring-1 ring-black/10" viewBox="0 0 7410 3900" aria-hidden="true">
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
    <svg className="h-[1.1rem] w-[2.2rem] overflow-hidden rounded-[0.2rem] shadow-sm ring-1 ring-black/10" viewBox="0 0 1200 600" aria-hidden="true">
      <rect width="1200" height="600" fill="#fff" />
      <rect width="300" height="600" fill="#f00" />
      <rect x="900" width="300" height="600" fill="#f00" />
      <path
        fill="#f00"
        d="m600 132-44.5 82.3c-5.1 9.4-13.5 8.5-21.9 3.7l-32.9-18.6 17.7 98.6c3.7 20.7-8.7 20.7-15.2 11.7l-77.5-88.3-12.7 44.9c-1.5 5.8-7.8 11.9-17.3 10.4l-98.1-20.8 25.8 46c5.5 9.5 6.9 13.6-1.7 20.8l-35 28.5 76.9 16.3c13.9 2.9 19.8 9.5 14.9 23.1l-18.3 51.1 72.2-15.3c6.2-1.4 16.2 1.9 17.7 9.9l9.3 96.4h73.8l9.3-96.4c1.5-8 11.5-11.3 17.7-9.9l72.2 15.3-18.3-51.1c-4.9-13.6 1-20.2 14.9-23.1l76.9-16.3-35-28.5c-8.6-7.2-7.2-11.3-1.7-20.8l25.8-46-98.1 20.8c-9.5 1.5-15.8-4.6-17.3-10.4l-12.7-44.9-77.5 88.3c-6.5 9-18.9 9-15.2-11.7l17.7-98.6-32.9 18.6c-8.4 4.8-16.8 5.7-21.9-3.7z"
      />
    </svg>
  );
}
