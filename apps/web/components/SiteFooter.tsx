export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" width={36} height={36} className="footer-mark" />
          <div>
            <p className="footer-name">Oyokometa</p>
            <p className="footer-tag">Image history, stated in tiers. Not a verdict.</p>
          </div>
        </div>
        <nav className="footer-links" aria-label="Product">
          <a href="/analyze">Analyze</a>
          <a href="/create">Create</a>
          <a href="/verify">Verify</a>
          <a href="/how-it-works">How it works</a>
          <a href="/services">Services</a>
          <a href="/about">About</a>
          <a href="/request-solution">Request a Solution</a>
          <a href="/contact">Contact</a>
        </nav>
        <nav className="footer-links" aria-label="Legal">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/acceptable-use">Acceptable use</a>
          <a href="/cookies">Cookies</a>
          <a href="/registration-terms">Registration terms</a>
          <a href="/dispute-policy">Disputes</a>
          <a href="/abuse">Report abuse</a>
        </nav>
        <p className="footer-legal">
          Oyokometa is a product of Blockspace Technologies Limited. © 2026 All rights reserved.
        </p>
      </div>
    </footer>
  );
}
