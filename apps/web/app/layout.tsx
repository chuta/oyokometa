import type { Metadata } from "next";
import "./globals.css";
import { PRODUCT_NAME, TRUST_LINE } from "@oyokometa/config";
import { AuthBar } from "@/components/AuthBar";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: TRUST_LINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="sr-only" href="#main">
          Skip to content
        </a>
        <div className="site">
          <header className="flex items-baseline justify-between gap-4 mb-10">
            <a href="/" className="font-semibold tracking-tight text-lg no-underline text-ink">
              {PRODUCT_NAME}
            </a>
            <nav className="nav" aria-label="Primary">
              <a href="/analyze">Analyze</a>
              <a href="/create">Create</a>
              <a href="/verify">Verify</a>
              <a href="/how-it-works">How it works</a>
              <a href="/sample">Sample report</a>
              <a href="/pricing">Pricing</a>
              <a href="/credits">Credits</a>
              <a href="/account">Account</a>
              <a href="/privacy">Privacy</a>
              <AuthBar />
            </nav>
          </header>
          <main id="main">{children}</main>
          <footer className="mt-16 pt-6 border-t border-line text-sm text-muted flex flex-wrap gap-4">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/acceptable-use">Acceptable use</a>
            <a href="/cookies">Cookies</a>
            <a href="/registration-terms">Registration terms</a>
            <a href="/dispute-policy">Disputes</a>
            <a href="/abuse">Report abuse</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
