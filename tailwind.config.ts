import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0B1120",
          700: "#1E293B",
          500: "#334155",
          300: "#94A3B8",
          100: "#E2E8F0"
        },
        sky: {
          500: "#0EA5E9",
          400: "#38BDF8",
          300: "#7DD3FC"
        }
      }
    }
  },
  plugins: []
};

export default config;
