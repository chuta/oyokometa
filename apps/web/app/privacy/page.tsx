import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy notice | Oyokometa",
  description:
    "How Oyokometa collects, uses, stores, shares and deletes information for Analyze, Create, Capture, Verify and Civic Evidence.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="page doc-page">
      <h1>Privacy notice</h1>
      <p className="privacy-meta">Last updated 25 October 2026. This notice takes effect on the same date.</p>
      <p className="lede">
        Digital evidence can be useful without exposing more about the people behind it than the work
        requires. This notice describes what Oyokometa collects, why, who can see it, and how long it
        is kept when you use the website or Analyze, Create, Capture, Verify, Civic Evidence, or a
        related form.
      </p>
      <p>
        Read it before you send personal information, upload a file, or open a capture link. You do
        not have to give every kind of information listed here to use every feature.
      </p>

      <h2 id="controller">Who is responsible</h2>
      <p>
        Oyokometa is a product of Blockspace Technologies Limited. That company is the data
        controller for personal data processed through https://oyokometa.xyz, unless a separate
        agreement says an institutional customer is the controller for information it supplies or
        instructs us to process.
      </p>
      <p>
        Privacy questions, data-rights requests, and concerns about a Civic Evidence case go to the{" "}
        <a href="/contact">contact form</a>. Use a subject that names the request, for example
        Oyokometa privacy request, and include an account, file, capture link, or case reference if
        you have one. We may ask enough to confirm you are the person the record is about. We do not
        ask for identity documents unless the law requires it.
      </p>
      <p>
        A dedicated privacy mailbox will be published here once it is monitored. Until then the
        contact form is the route we actually read.
      </p>

      <h2 id="collect">What we collect</h2>
      <h3>What you send</h3>
      <p>Depending on the feature, this can include:</p>
      <ul>
        <li>Still images and other files you upload for analysis, registration, verification, or a civic case.</li>
        <li>Claims, captions, explanations, and other text you type.</li>
        <li>Links you want examined. Video files are not accepted on Civic Evidence. A claim about a video is sent as a link, with a still frame if you have one.</li>
        <li>
          Civic Evidence fields such as an election or event name, a claimed date, a broad location, a
          polling-unit identifier, a specific question about a result sheet, an incident category, and
          whether you witnessed the event, were told about it, or found it online.
        </li>
        <li>An email address or other contact detail, if you choose to give one.</li>
        <li>
          Messages on the contact form, a solution request, an appeal on a published case, an abuse
          report, or a data-rights request.
        </li>
      </ul>
      <p>
        Do not send personal information about yourself or someone else unless it is needed for that
        submission. We do not ask for precise coordinates, a home address, or a source&apos;s identity
        unless a later step explains why.
      </p>

      <h3>What the file and the service produce</h3>
      <p>We may also process:</p>
      <ul>
        <li>File name, type, size, time of receipt, hashes, and other integrity values.</li>
        <li>Embedded metadata and available Content Credentials (C2PA), when the file carries them.</li>
        <li>Technical findings, including detected signals, scores we store, and stated limits.</li>
        <li>Browser and device strings needed to run, secure, or debug a session.</li>
        <li>Security logs, authentication records, request identifiers, and information used to refuse abuse.</li>
        <li>A session cookie so an anonymous analysis can be retrieved and later claimed into an account.</li>
      </ul>
      <p>
        A file can carry a camera model, a date, a location, or an author tag that is not visible in
        the picture. Uploading it can disclose that information.
      </p>

      <h3>Capture</h3>
      <p>
        A signed-in account can create a one-time camera link. The recipient takes one photo in the
        browser. There is no gallery upload. We may store the JPEG that arrives, the time it arrived,
        the request and its status, a hash and a platform-signed record, the browser string, and any
        camera name, facing, device model, or platform the page reports. Location is stored only if
        the person taking the photo chooses to include it. Token and session values are stored as
        hashes.
      </p>
      <p>
        Those device reports are Declared. They are not a check that a physical camera was used, that
        the scene is what it appears to be, or that the coordinates show where the camera was pointed.
        If a location is present, the coordinates may be sent to OpenStreetMap Nominatim so we can
        name the surrounding area for the account that created the link. That place name is cached. It
        is not written into the signed record. A coarse reading is named at area level, without a road
        or house number.
      </p>
      <p>
        A civic-linked capture stays with that case. An ordinary capture stays private to the account
        that created the link.
      </p>

      <h3>Civic Evidence</h3>
      <p>
        A civic submission can include the claim, a separate explanation, a specific check question
        on a result sheet, a still image or link, optional contact details, case status, review notes,
        evidence references, and audit rows. Follow-up notes, capture photos, appeals, and corrections
        are stored with the case.
      </p>
      <p>
        A report can contain sensitive information even if you did not mean to include it. Send only
        what is relevant.
      </p>

      <h2 id="purposes">Why we use it</h2>
      <p>We use information for defined work:</p>
      <ul>
        <li>To run the service you asked for: receive a file, analyse it, register it, verify it, or open a civic case.</li>
        <li>To record integrity: hashes, signatures, timestamps, and what arrived.</li>
        <li>To read available provenance and technical signals, and to show their limits.</li>
        <li>To review a civic claim, keep the file, seek corroboration, and contact you if you left a way to do so.</li>
        <li>To restrict sensitive cases, refuse abuse, and keep an audit of who opened what.</li>
        <li>To publish a reviewed civic page only after an editor approves an allowlisted summary.</li>
        <li>To diagnose errors and keep the service running, using only what that work needs.</li>
        <li>To answer privacy requests, appeals, corrections, and support.</li>
        <li>To meet a legal duty, or to protect legal rights, where that is lawful.</li>
      </ul>
      <p>
        Uploading a file does not authorise every later use. A new purpose must fit the original one
        or have its own lawful basis.
      </p>
      <p>
        We do not use private uploads or Civic Evidence files to train or tune a general-purpose
        model. Detector vendors named below are not asked to train on those files. A later use for
        training would need its own assessment, a notice, and a valid basis.
      </p>

      <h2 id="law">Lawful basis</h2>
      <p>
        Where the Nigeria Data Protection Act 2023 applies, processing may rest on consent, on steps
        you asked us to take or a contract to provide the service, on a legitimate interest that is
        proportionate and does not override your rights, on a legal obligation, or, only where the
        law allows, on vital interests or a public-interest task.
      </p>
      <p>
        The basis depends on the activity. We will not call everything consent. If we do rely on
        consent, you can withdraw it. Withdrawal does not unwind earlier lawful processing, and it
        does not force deletion of a record we must keep for another valid reason.
      </p>

      <h2 id="public">When a record stays private, and when it can be public</h2>
      <p>
        Sending a file does not, by itself, authorise publication. Ordinary analysis, registration,
        and verification stay with the service you requested. If you use a sharing feature, what
        other people can see depends on that feature and the choices you make.
      </p>
      <p>
        Civic submissions stay private until an editor publishes a reviewed page. There is no feed of
        unreviewed claims. Assigned reviewers, assigned editors, and, for a sensitive or restricted
        case, trust-and-safety may open what they need to triage, examine, and prepare a finding. An
        admin can assign a reviewer and cannot read the claim or the contributor identity by that
        role alone.
      </p>
      <p>
        A request for restricted handling sets the case to restricted access. Then only you, an
        assigned reviewer, an assigned editor, and trust-and-safety can open it. It is not a promise
        of absolute anonymity or of confidentiality beyond this notice. An optional email is still
        stored with the case. A person may still be inferred from a photo, a public link, or the
        wording of a claim.
      </p>
      <p>
        A published civic page is built from an allowlist: the claim, the assessment, a conclusion, a
        rationale, an evidence summary, limits, method, a broad location, sources, and
        Verified, Detected, Inferred, or Declared lines. Contributor identity, exact coordinates,
        user-agent strings, and capture tokens are not published. We may decline to publish, redact,
        restrict, or refer a case when publication would create a disproportionate privacy, safety,
        or legal risk.
      </p>
      <p>
        Once a page is public, other people may copy it, search engines may index it, and archives
        may keep it. We cannot guarantee that every copy can be removed. We will consider a
        reasonable request to correct, redact, restrict, or take a page down. Public-interest
        recordkeeping is not a licence to expose personal information that the finding does not need.
      </p>

      <h2 id="evidence">Files, signatures, and provenance</h2>
      <p>
        A hash, a valid signature, or a timestamp supports a statement about a file or a record. It
        does not prove that a caption is true, that a scene happened, that a named person made the
        image, or that an event took place at the claimed time or place.
      </p>
      <p>
        Missing metadata is not proof that a file is fake. The absence of Content Credentials is not
        proof that an image is inauthentic. An automated detector is a technical signal. A
        device-reported location is not independent proof of presence. A capture photo is not proof
        that a physical camera was used.
      </p>
      <p>
        Where we present findings, we keep Verified, Detected, Inferred, and Declared separate. A
        lower tier does not override a higher one.
      </p>
      <p>
        Hashes, signatures, timestamp tokens, case references, and audit rows may be kept after an
        original file is deleted, when that is necessary and lawful. A hash is not anonymous in every
        setting.
      </p>

      <h2 id="location">Location, camera, and device reports</h2>
      <ul>
        <li>We do not embed your precise location or IP address into an image by default.</li>
        <li>If a feature asks for location, you can decline. Capture location stays off unless you include it.</li>
        <li>Device location can be approximate, wrong, or altered.</li>
        <li>Browser-reported camera and device details are not independent proof of the hardware.</li>
        <li>Nominatim may receive coordinates only to name an area for the capture owner, as described above.</li>
        <li>Public civic pages use a broad location when that is enough to understand the issue.</li>
      </ul>

      <h2 id="retention">How long we keep it</h2>
      <p>
        We keep information for as long as the stated purpose needs, subject to law, a legitimate
        need to preserve evidence, and data-protection duties. The hourly job that deletes ordinary
        originals runs while the API process is up.
      </p>
      <div className="privacy-table-wrap">
        <table className="privacy-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">What happens today</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ordinary image from an anonymous visitor</td>
              <td>Original bytes and previews are deleted about 24 hours after receipt, unless a civic case holds the file.</td>
            </tr>
            <tr>
              <td>Ordinary image from a signed-in account</td>
              <td>Original bytes and previews are deleted about 30 days after receipt, unless you delete sooner or a civic case holds the file.</td>
            </tr>
            <tr>
              <td>Account deletion</td>
              <td>
                You can delete the account from the account page. Images, analyses, reports, and share
                links are removed from primary storage. Provenance records are withdrawn. The user
                row is anonymised. Ledger and payment rows stay for accounting against that
                anonymised user. Unused credits are forfeited.
              </td>
            </tr>
            <tr>
              <td>Civic Evidence files and case rows</td>
              <td>
                They are not removed by the ordinary image clock. They stay until a recorded
                editorial or legal decision. A numbered post-closure schedule is not published yet.
                When a case is closed or withdrawn we will assess which files and personal details
                remain necessary.
              </td>
            </tr>
            <tr>
              <td>Published civic pages</td>
              <td>Kept while the public record is needed, with earlier versions retained when a case is corrected.</td>
            </tr>
            <tr>
              <td>Capture linked to a civic case</td>
              <td>Kept with that case, on the same basis as other civic evidence.</td>
            </tr>
            <tr>
              <td>Ordinary capture</td>
              <td>Private to the requesting account, subject to the ordinary image clock unless registered as a record.</td>
            </tr>
            <tr>
              <td>Contact messages and solution requests</td>
              <td>Kept until deleted or archived by the team that reads them.</td>
            </tr>
            <tr>
              <td>Security and audit logs</td>
              <td>Kept for security and accountability. Civic case audit rows are append-only.</td>
            </tr>
            <tr>
              <td>Backups</td>
              <td>Fall off through the backup cycle. Access stays restricted until they expire.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        A request to delete personal information is not automatically a request to erase every hash,
        signature, or published finding. We assess each request.
      </p>

      <h2 id="recipients">Who may receive information</h2>
      <p>We do not sell personal data. We may disclose it where necessary and lawful to:</p>
      <h3>Processors that run the product today</h3>
      <ul>
        <li>Hosting and the application process on Fly.io, currently in London.</li>
        <li>PostgreSQL on Supabase.</li>
        <li>ClamAV on a private Fly app, for a malware scan before a file is accepted.</li>
        <li>
          Hive, for an adult-content check on the decoded JPEG before a preview, analysis,
          registration, capture, or civic file is stored. Hive is not asked to run any other model
          on the file. If that check cannot be completed, the file is refused.
        </li>
        <li>
          An on-platform detector for Quick Scan and Deep Analysis. Deep Analysis also sends the
          image to Sightengine for an AI-image score and a face-manipulation score, and to Reality
          Defender for a manipulation score. Sightengine states that it deletes the file after
          processing. Oyokometa does not submit images to Sightengine training feedback. Detector
          names stay in this notice, not in the analysis you see.
        </li>
        <li>DigiCert, for an RFC 3161 timestamp when a record is signed.</li>
        <li>AWS KMS in eu-west-1, to sign platform records. The service sees a hash to sign, not the image.</li>
        <li>Resend, to send login links and confirmation mail when that is configured.</li>
        <li>Bachs, when you pay for credits by hosted checkout.</li>
        <li>OpenStreetMap Nominatim, only for the optional capture place name described above.</li>
      </ul>
      <p>Each processor should see only what its function needs.</p>
      <h3>People at Oyokometa</h3>
      <p>
        Access is role-based. Working on the product is not, by itself, a reason to open a sensitive
        civic case. Restricted handling is enforced as described above. Sensitive access can be
        audited.
      </p>
      <h3>Partners and authorities</h3>
      <p>
        A civic referral shares only what that referral needs. We will take reasonable steps to
        explain sharing to contributors, and to ask before sharing identifiable or sensitive material
        unless another lawful basis or a legal requirement applies.
      </p>
      <p>
        We may disclose information when a valid legal process requires it, or where the law
        otherwise allows it to protect rights, safety, or security. We will limit what we send to
        what is required or justified, and we will notify affected people when the law permits.
      </p>
      <h3>The public</h3>
      <p>Only the allowlisted civic page, if an editor publishes one, and any report you yourself share.</p>

      <h2 id="transfers">Where processing happens</h2>
      <p>
        Some providers store or process information outside Nigeria, including in the United Kingdom
        and the European Union. Where a transfer needs safeguards under Nigerian law, we will use
        contractual and other lawful mechanisms. The set of countries depends on the providers
        actually in use.
      </p>

      <h2 id="cookies">Cookies and similar technology</h2>
      <p>
        We use an HTTP-only session cookie so anonymous analyses can be retrieved and later claimed
        into an account. We do not use advertising cookies. We have not added a separate analytics
        vendor. If that changes, this notice and the <a href="/cookies">cookie notice</a> will say so,
        and we will ask for consent where the law requires it. Blocking essential cookies can stop
        some features from working.
      </p>

      <h2 id="security">How we protect it</h2>
      <p>
        We use access control, encrypted transport, hashed capture tokens, a malware scan and an
        adult-content check before a preview is stored, separation of public civic text from
        restricted source material, append-only civic audit rows, and retention jobs for ordinary
        originals. No website or storage system is completely secure. If a personal-data breach
        occurs we will take the steps the law requires.
      </p>

      <h2 id="rights">Your rights</h2>
      <p>
        Subject to the Nigeria Data Protection Act 2023 and the facts of the processing, you may be
        able to be informed, to access personal data, to correct it, to request deletion or
        restriction, to object, to port data where that right applies, to withdraw consent, to
        challenge a solely automated decision where the law gives that right, and to complain to the
        Nigeria Data Protection Commission.
      </p>
      <p>
        Those rights are not unlimited. We may keep information to comply with the law, to protect
        someone else&apos;s rights, to hold evidence under a valid legal hold, or to keep a
        proportionate public record.
      </p>
      <p>
        Use the <a href="/contact">contact form</a> to exercise a right. Name the account, file,
        capture, or civic reference if you can. We aim to acknowledge promptly and to respond within
        the time the law sets. You can also contact the Commission at{" "}
        <a href="https://ndpc.gov.ng/" rel="noopener noreferrer">
          ndpc.gov.ng
        </a>
        .
      </p>

      <h2 id="civic-safety">Civic Evidence, safety, and children</h2>
      <p>
        Civic cases can involve allegations, political activity, or a risk of retaliation. Submissions
        are private by default. A person reviews them. Restricted handling is extra care, not
        invisibility. We aim to collect a broad location rather than a precise one. Public pages are
        redacted to an allowlist. Referrals need a defined purpose. Published findings can be
        corrected or appealed.
      </p>
      <p>
        Oyokometa does not dispatch help. If someone is in immediate danger, contact local emergency
        services or a trusted support organisation. Do not put yourself or someone else at risk to
        collect a file, and do not send information you are not entitled to share.
      </p>
      <p>
        The product is not designed for a child to disclose personal information. Do not submit a
        child&apos;s identifying image, name, or location unless it is genuinely necessary and you
        are authorised to provide it. If you think a child&apos;s information was sent or published
        in error, use the contact form or <a href="/abuse">report abuse</a> promptly.
      </p>

      <h2 id="third-parties">Other websites</h2>
      <p>
        You can send us a link to a post, an article, or a document. Those sites have their own
        practices. Following a link, or posting on another platform, is not processing we control.
        Giving Oyokometa a URL does not give us control of that site.
      </p>

      <h2 id="civic-changes">Correcting or withdrawing a civic submission</h2>
      <p>
        If you sent a civic report and want to correct it, withdraw it, or raise a privacy concern,
        use the receipt if you still have it, or the contact form with the case reference. We will
        look at the status of the case, reliability, safety, legal duties, and whether a public
        record still needs to exist.
      </p>
      <p>
        We may correct the record, add a notice, restrict a file, redact personal details, take a
        public page down, delete what is no longer needed, or keep a limited record where that is
        lawful and proportionate. We will not promise automatic deletion of every published page,
        third-party copy, backup, or cryptographic reference. If we cannot do all of what you asked,
        we will say so to the extent the law requires.
      </p>

      <h2 id="changes">Changes to this notice</h2>
      <p>
        We will change this notice when the product, the law, or the processors change. The last
        updated date will move when a revision is published. If a change materially affects how
        personal information is used or shared, we will give extra notice or ask for consent where
        the law requires it. A routine update does not authorise processing that needs its own basis.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Blockspace Technologies Limited, for Oyokometa. Website{" "}
        <a href="https://oyokometa.xyz">oyokometa.xyz</a>. Privacy and data-rights requests:{" "}
        <a href="/contact">contact form</a>. Supervisory authority: Nigeria Data Protection
        Commission,{" "}
        <a href="https://ndpc.gov.ng/" rel="noopener noreferrer">
          ndpc.gov.ng
        </a>
        .
      </p>
      <p>
        Oyokometa aims to keep a file&apos;s integrity visible without treating that integrity as
        proof of a caption, and without treating a public finding as a licence to disclose more
        personal information than the finding needs.
      </p>
    </article>
  );
}
