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
        ink: "#f5f5f4",
        paper: "#070707",
        muted: "#a8a29e",
        accent: "#f5a524",
        line: "#2a2a2a",
        surface: "#121212",
        brand: "#f5a524",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        ui: ["var(--font-plex)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        shell: "72rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
