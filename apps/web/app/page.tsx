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
    </>
  );
}
