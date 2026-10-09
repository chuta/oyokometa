"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AuthBar } from "@/components/AuthBar";

const PRIMARY = [
  { href: "/analyze", label: "Analyze" },
  { href: "/create", label: "Create" },
  { href: "/verify", label: "Verify" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

const SECONDARY = [
  { href: "/sample", label: "Sample" },
  { href: "/credits", label: "Credits" },
  { href: "/account", label: "Account" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname() ?? "/";

  const active = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href="/" className="brand" aria-label="Oyokometa home">
          {/* PNG wordmark is designed on black — keep it on the dark header */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/oyokometa_logo.png" alt="Oyokometa" className="brand-mark" />
        </a>
        <nav className="nav-desktop" aria-label="Primary">
          {PRIMARY.map((l) => (
            <a key={l.href} href={l.href} className={active(l.href) ? "is-active" : undefined}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="header-end">
          <nav className="nav-meta" aria-label="Account">
            {SECONDARY.map((l) => (
              <a key={l.href} href={l.href} className={active(l.href) ? "is-active" : undefined}>
                {l.label}
              </a>
            ))}
            <AuthBar />
          </nav>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" className="nav-mobile" aria-label="Mobile">
          {[...PRIMARY, ...SECONDARY].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={active(l.href) ? "is-active" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <AuthBar />
        </nav>
      ) : null}
    </header>
  );
}
