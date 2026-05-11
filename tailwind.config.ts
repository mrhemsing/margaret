import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12354f",
        cream: "#f8f4ed",
        sage: "#df319a",
        sunrise: "#f2b56b",
        brandBlue: "#5aa7df",
        brandButtonBlue: "#2f7fb8",
        brandButtonBlueHover: "#256a9d",
        brandNavy: "#12354f",
        brandPink: "#df319a",
      },
    },
  },
  plugins: [],
};

export default config;
