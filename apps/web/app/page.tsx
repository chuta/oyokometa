export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <p className="kicker">Image provenance</p>
          <h1>What can this image tell you?</h1>
          <p className="lede">
            Investigate an image&apos;s origin, metadata and editing history. Create a record of the
            file you control. Let another person independently check whether a file matches that
            record.
          </p>
          <p className="lede lede-follow">
            See what is verified, what is detected, and what is inferred — with the evidence and
            limitations made clear.
          </p>
          <div className="hero-actions">
            <a className="action-card primary" href="/analyze">
              <strong>Analyze an image</strong>
              <span>Free Quick Scan. Investigate origin, metadata and editing history.</span>
            </a>
            <a className="action-card" href="/create">
              <strong>Create a record</strong>
              <span>Register the exact bytes you control. Not a claim of authorship.</span>
            </a>
            <a className="action-card" href="/verify">
              <strong>Verify a file</strong>
              <span>Independently check whether a file matches a registered record.</span>
            </a>
          </div>
          <p className="meta-line">
            Forensic signals can be uncertain. A file&apos;s provenance does not establish whether
            the event depicted actually happened. Still images only — JPEG, PNG, WebP, HEIC/HEIF or
            TIFF, up to 25 MB.
          </p>
        </div>
      </section>
      <section className="pillars" aria-label="How statements are tagged">
        <article className="pillar">
          <h2>Verified</h2>
          <p>Cryptographic checks that hold or fail. A match is a match of bytes, not of meaning.</p>
        </article>
        <article className="pillar">
          <h2>Detected</h2>
          <p>Read from the file: hashes, metadata, structure, Content Credentials when present.</p>
        </article>
        <article className="pillar">
          <h2>Inferred</h2>
          <p>Analysis that can be wrong. Lower-tier signals never override a higher tier.</p>
        </article>
      </section>
      <section className="audiences" aria-labelledby="audiences-heading">
        <div className="audiences-inner">
          <h2 id="audiences-heading">Who we are building for</h2>
          <p className="audiences-intro">
            Analyze, Create and Verify are live. Some of the needs below are still ahead of the
            product. Each one starts with a feature you can use today.
          </p>
          <table className="audience-table">
            <thead>
              <tr>
                <th scope="col">Audience</th>
                <th scope="col">What they need from us</th>
                <th scope="col">Try it</th>
              </tr>
            </thead>
            <tbody>
              {audiences.map((row) => (
                <tr key={row.audience}>
                  <th scope="row">{row.audience}</th>
                  <td>{row.need}</td>
                  <td>
                    <a className="btn audience-cta" href={row.href}>
                      {row.action}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const audiences = [
  {
    audience: "Everyday users",
    need: "A fast, plain answer about a suspicious image, where they already are",
    action: "Analyze an image",
    href: "/analyze",
  },
  {
    audience: "Journalists and fact-checkers",
    need: "Evidence they can cite, share and defend before publishing",
    action: "Analyze an image",
    href: "/analyze",
  },
  {
    audience: "Lawyers and investigators",
    need: "Reproducible records, case organisation and exportable evidence",
    action: "Create a record",
    href: "/create",
  },
  {
    audience: "Creators, newsrooms and brands",
    need: "A way to establish a record before an image is copied or altered",
    action: "Create a record",
    href: "/create",
  },
  {
    audience: "Election observers and civic groups",
    need: "Rapid, non-partisan checks that can be shared publicly",
    action: "Check an image",
    href: "/check",
  },
  {
    audience: "Enterprises: banks, insurers, marketplaces, platforms",
    need: "Image checks at volume, inside their own systems",
    action: "Verify a file",
    href: "/verify",
  },
] as const;
