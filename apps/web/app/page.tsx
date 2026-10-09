export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-card">
          <p className="kicker kicker-dot">Image provenance</p>
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
          <div className="hero-ctas">
            <a className="cta-primary" href="/analyze">
              Analyze an image — Free Quick Scan
            </a>
            <div className="cta-pair">
              <a className="cta-secondary" href="/create">
                Create a record
              </a>
              <a className="cta-secondary" href="/verify">
                Verify a file
              </a>
            </div>
          </div>
          <p className="hero-disclaimer">
            Forensic signals can be uncertain. A file&apos;s provenance does not establish whether
            the event depicted actually happened.
          </p>
        </div>
      </section>
      <section className="loop" aria-label="How Oyokometa is used">
        <article>
          <p className="kicker">1</p>
          <h2>Investigate</h2>
          <p>Run a Quick Scan on the file. Facts, technical signals and inference stay in separate tiers.</p>
        </article>
        <article>
          <p className="kicker">2</p>
          <h2>Record what you control</h2>
          <p>Register these exact bytes. The record is what this account submitted, not a claim of authorship.</p>
        </article>
        <article>
          <p className="kicker">3</p>
          <h2>Verify independently</h2>
          <p>Anyone with the file can check whether it still matches the registered record.</p>
        </article>
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
