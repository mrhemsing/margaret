import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12354f",
        cream: "#f8f4ed",
        sage: "#cc1f88",
        sunrise: "#f2b56b",
        brandBlue: "#5aa7df",
        brandButtonBlue: "#256a9d",
        brandButtonBlueHover: "#1f5f8f",
        brandNavy: "#12354f",
        brandPink: "#cc1f88",
        brandPinkLight: "#f472b6",
      },
    },
  },
  plugins: [],
};

export default config;
