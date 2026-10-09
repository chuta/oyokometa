import { TRUST_LINE } from "@oyokometa/config";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <p className="kicker">Image provenance</p>
          <h1>What can this image tell you?</h1>
          <p className="lede">{TRUST_LINE}</p>
          <p className="lede" style={{ marginTop: "1rem", fontSize: "1.02rem" }}>
            Upload a file. See what is verified, what is detected and what is inferred, and why.
            This product analyzes files. It does not judge whether a depicted event happened.
          </p>
          <div className="hero-actions">
            <a className="action-card primary" href="/analyze">
              <strong>Analyze an image</strong>
              <span>Free Quick Scan. Separate facts from inference.</span>
            </a>
            <a className="action-card" href="/create">
              <strong>Create a record</strong>
              <span>Register these exact bytes, signed by the platform.</span>
            </a>
            <a className="action-card" href="/verify">
              <strong>Verify a file</strong>
              <span>Check whether a file matches a registered record.</span>
            </a>
          </div>
          <p className="meta-line">
            This works with still images only — JPEG, PNG, WebP, HEIC/HEIF or TIFF, up to 25 MB.
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
