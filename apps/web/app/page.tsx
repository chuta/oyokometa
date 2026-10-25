export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-stage">
            <div className="hero-copy">
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
            </div>
            <img
              className="hero-illustration"
              src="/hero-observers.webp"
              alt="Oyokometa volunteers on election monitoring duty, reviewing a polling-unit observation form"
              width={1280}
              height={927}
            />
          </div>
          <div className="hero-actions">
            <a className="action-card primary" href="/analyze">
              <strong>Analyze an image</strong>
              <span>Free Quick Scan. Inspect the file, its metadata and its technical signals.</span>
            </a>
            <a className="action-card" href="/create">
              <strong>Create a record</strong>
              <span>Register the exact bytes you control. Not a claim of authorship.</span>
            </a>
            <a className="action-card" href="/capture">
              <strong>Capture a photo</strong>
              <span>Send a one-time link. The photo is taken in the browser, then signed as received.</span>
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
      <section className="civic-band" aria-labelledby="civic-heading">
        <div className="audiences-inner">
          <h2 id="civic-heading">Civic Evidence</h2>
          <article className="civic-feature">
            <div className="civic-feature-lead">
              <p className="kicker">For everyone</p>
              <h3>See something questionable? Submit the claim. Preserve the evidence. Help us check it.</h3>
            </div>
            <div className="civic-feature-copy">
              <p>
                Anyone can send a claim about a viral image, a polling-unit result sheet, or an
                incident. Oyokometa keeps the file that arrived. A person reviews it before anything
                is published.
              </p>
              <p>
                It is not an election authority and it does not declare winners. A signature shows
                that a file matches a record. It does not show that a caption, a place, or an event
                is true.
              </p>
              <p>Submissions stay private until an editor publishes a reviewed case. There is no feed of unreviewed claims.</p>
            </div>
          </article>
          <div className="civic-paths">
            <a className="civic-path" href="/civic/viral">
              <strong>Check a post</strong>
              <span>A viral photo or a caption. Still images only. For a video, send the link.</span>
            </a>
            <a className="civic-path" href="/civic/result-sheet">
              <strong>Check a sheet</strong>
              <span>A polling-unit result sheet. The figures you send are not official results.</span>
            </a>
            <a className="civic-path" href="/civic/incident">
              <strong>Report an incident</strong>
              <span>What you witnessed, were told, or saw online. Do not take a risk to collect it.</span>
            </a>
          </div>
          <p className="civic-band-note">
            <a href="/civic">Open Civic Evidence</a> for the method, safety notes, and reviewed cases.
          </p>
        </div>
      </section>
      <section className="audiences" aria-labelledby="audiences-heading">
        <div className="audiences-inner">
          <h2 id="audiences-heading">Who we are building for</h2>
          <p className="audiences-intro">
            Analyze, Create, Capture, Verify and Civic Evidence are live. Some of the needs below are
            still ahead of the product. Each one starts with a feature you can use today.
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
    audience: "Insurers, lenders and claims teams",
    need: "A photo taken through a link, with a signed record of the file that arrived",
    action: "Capture a photo",
    href: "/capture",
  },
  {
    audience: "Election observers and civic groups",
    need: "A claim, a file, and a reviewed public note. Not an election result.",
    action: "Civic Evidence",
    href: "/civic",
  },
  {
    audience: "Enterprises: banks, insurers, marketplaces, platforms",
    need: "Image checks at volume, inside their own systems",
    action: "Request a solution",
    href: "/request-solution",
  },
] as const;
