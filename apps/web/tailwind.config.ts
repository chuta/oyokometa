import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/findings-ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1c1917",
        paper: "#f7f4ef",
        muted: "#6b635b",
        accent: "#3f4f46",
        line: "#d9d2c8",
      },
      fontFamily: {
        sans: ["Source Serif 4", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        ui: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
