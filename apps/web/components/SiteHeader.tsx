"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthBar } from "@/components/AuthBar";

const PRIMARY = [
  { href: "/analyze", label: "Analyze" },
  { href: "/create", label: "Create" },
  { href: "/capture", label: "Capture" },
  { href: "/verify", label: "Verify" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

const ACCOUNT = [
  { href: "/sample", label: "Sample" },
  { href: "/credits", label: "Credits" },
  { href: "/account", label: "Account" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();
  const path = usePathname() ?? "/";

  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const accountActive =
    ACCOUNT.some((l) => active(l.href)) ||
    active("/admin") ||
    active("/sign-in") ||
    active("/sign-up");

  useEffect(() => {
    setAccountOpen(false);
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAccountOpen(false);
      accountButtonRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

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
          <a className="btn nav-cta" href="/request-solution">
            Request a Solution
          </a>
          <div className="account-menu" ref={accountRef}>
            <button
              ref={accountButtonRef}
              type="button"
              className={accountActive ? "is-active" : undefined}
              aria-expanded={accountOpen}
              aria-controls={accountMenuId}
              onClick={() => setAccountOpen((v) => !v)}
            >
              Account
            </button>
            <div id={accountMenuId} className="account-menu-panel" hidden={!accountOpen}>
              <nav aria-label="Account">
                {ACCOUNT.map((l) => (
                  <a key={l.href} href={l.href} className={active(l.href) ? "is-active" : undefined}>
                    {l.label}
                  </a>
                ))}
                <AuthBar />
              </nav>
            </div>
          </div>
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
          <a href="/request-solution" onClick={() => setOpen(false)}>
            Request a Solution
          </a>
          {PRIMARY.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={active(l.href) ? "is-active" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <p className="nav-mobile-label">Account</p>
          {ACCOUNT.map((l) => (
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
