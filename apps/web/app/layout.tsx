import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PRODUCT_NAME, TRUST_LINE } from "@oyokometa/config";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const outfit = localFont({
  src: "../fonts/outfit-latin.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  display: "swap",
});

const plex = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: TRUST_LINE,
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${plex.variable} ${mono.variable}`}>
      <body>
        <a className="sr-only" href="#main">
          Skip to content
        </a>
        <div className="shell">
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
