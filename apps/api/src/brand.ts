import { TRUST_LINE } from "@oyokometa/config";
import { publicAppOrigin } from "./origin.js";

export const BRAND = {
  name: "Oyokometa",
  kicker: "Image provenance",
  tagline: "Image history, stated in tiers. Not a verdict.",
  trustLine: TRUST_LINE,
  hex: {
    bg: "#000000",
    bg2: "#101010",
    surface: "#121212",
    ink: "#f5f5f4",
    muted: "#a8a29e",
    line: "#2a2a2a",
    brand: "#f5a524",
    brandDeep: "#c47a12",
    onBrand: "#111111",
  },
  fonts: {
    sans: 'IBM Plex Sans, "Helvetica Neue", Helvetica, Arial, sans-serif',
    display: 'Outfit, "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: 'IBM Plex Mono, ui-monospace, Menlo, Consolas, monospace',
  },
} as const;

export function brandLogoUrl() {
  return `${publicAppOrigin()}/oyokometa_logo.png`;
}

export function brandMarkUrl() {
  return `${publicAppOrigin()}/favicon.png`;
}
