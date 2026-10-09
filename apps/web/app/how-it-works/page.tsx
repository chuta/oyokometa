export default function HowPage() {
  return (
    <article className="page page-narrow">
      <p className="kicker">Method</p>
      <h1 className="text-4xl mb-6">How it works</h1>
      <p>
        Oyokometa runs a fixed pipeline: validate, hash, decode, metadata, Content Credentials,
        file structure, pixel analysis, detectors, rules, explanation.
      </p>
      <p>
        Every statement is tagged as Verified (cryptographic check), Detected (read from the file),
        Inferred (analysis), or Declared (typed by a user). A lower tier never overrides a higher
        one.
      </p>
      <p>
        There is no real/fake label and no authenticity score. Absence of EXIF or Content
        Credentials is not evidence of AI generation or deception.
      </p>
      <p>
        Create issues a platform-signed record (not a Content Credential): this account registered
        these exact bytes no later than this time. Verify checks a file against that record. A match
        does not confirm who created the image.
      </p>
    </article>
  );
}
