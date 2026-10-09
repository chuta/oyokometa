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
        <nav className="footer-links" aria-label="Legal">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/acceptable-use">Acceptable use</a>
          <a href="/cookies">Cookies</a>
          <a href="/registration-terms">Registration terms</a>
          <a href="/dispute-policy">Disputes</a>
          <a href="/abuse">Report abuse</a>
        </nav>
      </div>
    </footer>
  );
}
