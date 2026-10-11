export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <p className="kicker">Image provenance</p>
          <h1>What can this image tell you?</h1>
          <p className="lede">
            An image can tell a story its file does not. See what can be established, what has been
            detected, and what remains uncertain.
          </p>
          <p className="lede lede-follow">
            There is no real or fake verdict, and no authenticity score. The evidence and its limits
            stay visible.
          </p>
          <div className="hero-actions">
            <a className="action-card primary" href="/analyze">
              <strong>Analyze an image</strong>
              <span>Free Quick Scan. Inspect the file, its metadata and its technical signals.</span>
            </a>
            <a className="action-card" href="/create">
              <strong>Create a record</strong>
              <span>Register the exact bytes you control. Not a claim of authorship.</span>
            </a>
            <a className="action-card" href="/verify">
              <strong>Verify a file</strong>
              <span>Check whether a file matches a registered record. A match is of bytes.</span>
            </a>
          </div>
          <p className="meta-line">
            Forensic signals can be uncertain. A file&apos;s provenance does not establish whether
            the event depicted actually happened. Still images only: JPEG, PNG, WebP, HEIC/HEIF or
            TIFF, up to 25 MB.
          </p>
        </div>
      </section>
      <section className="pillars" aria-label="How statements are tagged">
        <article className="pillar">
          <h2>Verified</h2>
          <p>A cryptographic check with an established result. It does not settle what the image depicts.</p>
        </article>
        <article className="pillar">
          <h2>Detected</h2>
          <p>Read from the file. Metadata and Content Credentials can be missing, altered or misleading.</p>
        </article>
        <article className="pillar">
          <h2>Inferred</h2>
          <p>A conclusion from analysis or a detection tool. It can be wrong.</p>
        </article>
        <article className="pillar">
          <h2>Declared</h2>
          <p>Stated by a person. The record keeps the claim. It does not prove it.</p>
        </article>
        <p className="pillars-note">
          These tags are not a ranking of truth. When they disagree, a lower tier does not override a
          higher one.
        </p>
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
      <section className="roadmap" aria-labelledby="roadmap-heading">
        <div className="audiences-inner">
          <h2 id="roadmap-heading">Coming soon</h2>
          <article className="soon-card">
            <div className="soon-lead">
              <p className="kicker">Location</p>
              <h3>A Nigerian Digital Postcode from the file</h3>
            </div>
            <div className="soon-copy">
              <p>
                When a file still carries location metadata, Oyokometa will resolve it to a Digital
                Postcode: state, local government area, and the distance to the nearest registered
                building. Someone registering a record will be able to declare a postcode and see
                whether that declaration agrees with the metadata.
              </p>
              <p>
                This is aimed at journalists, observers and investigators who receive files that
                still hold location metadata. Images forwarded through chat and social apps usually
                do not. Location metadata can be edited or removed before the file reaches us, so a
                postcode is not proof of where the picture was taken.
              </p>
              <p className="soon-note">
                <a href="/analyze">Analyze an image</a> already reads the metadata in the file.
                Postcode resolution is not available yet.
              </p>
            </div>
          </article>
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
