import { TRUST_LINE } from "@oyokometa/config";

export default function HomePage() {
  return (
    <div>
      <p className="kicker">Image provenance</p>
      <h1 className="text-4xl leading-tight mt-2 mb-4">What can this image tell you?</h1>
      <p className="text-lg text-muted mb-8">{TRUST_LINE}</p>
      <p className="mb-8 max-w-prose">
        Upload an image. See what is verified, what is detected and what is inferred, and why. This
        product analyzes files. It does not judge whether a depicted event happened.
      </p>
      <a className="btn" href="/analyze">
        Analyze an image
      </a>{" "}
      <a className="btn-secondary btn" href="/create">
        Create a record
      </a>{" "}
      <a className="btn-secondary btn" href="/verify">
        Verify a file
      </a>
      <p className="mt-10 text-sm text-muted">
        Still images only · JPEG, PNG, WebP, HEIC/HEIF, TIFF · 25 MB limit
      </p>
    </div>
  );
}
