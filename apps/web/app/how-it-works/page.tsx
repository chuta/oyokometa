export default function HowPage() {
  return (
    <article className="page page-narrow">
      <p className="kicker">Method</p>
      <h1 className="text-4xl mb-4">How it works</h1>
      <p className="text-muted mb-4">Understand the evidence behind an image.</p>
      <p>
        An image can tell a story, but its file data, provenance records and technical signals may
        tell a different one. Oyokometa helps you examine what can be established, what has been
        detected, and what remains uncertain.
      </p>
      <p>
        The analysis inspects the file and its metadata, checks Content Credentials, and applies
        technical checks and the detection tools that are available. The report separates observed
        facts from inferences and states the limitations. It does not reduce an image to a real or
        fake verdict.
      </p>

      <h2 className="text-2xl mt-10 mb-3">1. Analyze an image</h2>
      <p>
        <a href="/analyze">Upload an image</a> to examine the evidence in the file. Still images
        only: JPEG, PNG, WebP, HEIC/HEIF or TIFF, up to 25 MB. A free Quick Scan runs this
        inspection. Deep Analysis is a deeper pass and can include additional detection tools.
        Results from those tools are shown only when the check is available.
      </p>
      <ul className="list-disc pl-6 mt-4 space-y-2">
        <li>
          <strong>Validate the file</strong> so it can be processed safely.
        </li>
        <li>
          <strong>Calculate a cryptographic hash</strong> of the exact bytes, as a fingerprint of
          that file.
        </li>
        <li>
          <strong>Inspect file properties and metadata</strong>, including camera, device, software
          and timestamp information when the file still has them.
        </li>
        <li>
          <strong>Check Content Credentials</strong> carried in the file.
        </li>
        <li>
          <strong>Examine file structure and image characteristics</strong> for technical
          inconsistencies and other relevant indicators.
        </li>
        <li>
          <strong>Apply available detection tools and evidence rules</strong> to interpret the
          findings. A detector result is an inference, and it is omitted when that check is not
          available.
        </li>
        <li>
          <strong>Generate an explained report</strong> that separates observed facts from technical
          inferences and names the limitations.
        </li>
      </ul>
      <p className="mt-4">
        What can be established depends on the evidence in the file and on the checks that can be
        completed. Metadata can be missing, modified or incomplete. Detection results can be
        uncertain, especially after an image is edited, compressed, screenshotted or processed by an
        unfamiliar tool.
      </p>

      <h2 className="text-2xl mt-10 mb-3">2. Understand the evidence</h2>
      <p>
        Findings are tagged in four categories so you can tell a completed check from something
        read from the file, inferred, or typed by a person.
      </p>
      <h3 className="text-xl mt-6 mb-2">Verified</h3>
      <p>
        A supported cryptographic or record check has been performed and its result established.
        Examples include Content Credentials that validate against the trust list, and a file whose
        fingerprint matches a registered record. The check establishes that result. It does not
        establish the truth of everything the image depicts.
      </p>
      <h3 className="text-xl mt-6 mb-2">Detected</h3>
      <p>
        Information found in the file: readable metadata, embedded fields, file properties and
        technical signals. These can be useful, and they can be altered, removed or misleading.
      </p>
      <h3 className="text-xl mt-6 mb-2">Inferred</h3>
      <p>
        A conclusion drawn from analysis: image characteristics, detection tools and rules that
        interpret several signals. Inferences can be wrong. Read them with the evidence and the
        limitations.
      </p>
      <h3 className="text-xl mt-6 mb-2">Declared</h3>
      <p>
        Information a person stated, such as a claimed creator, capture date or description. A
        declaration records what was stated. It does not independently prove the claim.
      </p>
      <p className="mt-4">
        These categories are not a ranking of truth. A cryptographic check, a metadata field, a
        detector result and a human declaration establish different things. When they disagree, a
        lower tier does not override a higher one. The disagreement is shown.
      </p>

      <h2 className="text-2xl mt-10 mb-3">3. Create a provenance record</h2>
      <p>
        <a href="/create">Create</a> registers an image with Oyokometa. The record is signed by the
        platform and tied to the fingerprint of the exact file and the time of registration. Someone
        can later check whether another file matches those bytes.
      </p>
      <p>
        A provenance record states one thing with cryptographic backing: this account registered
        these exact bytes no later than this time. It does not, by itself, prove who created the
        image, when it was originally captured, or whether the scene it depicts is genuine.
        Everything else on the record is a declaration.
      </p>
      <p>An Oyokometa registration is not a C2PA Content Credential, and it is not presented as one.</p>

      <h2 className="text-2xl mt-10 mb-3">4. Verify a file</h2>
      <p>
        <a href="/verify">Verify</a> compares a file with an Oyokometa provenance record. No account
        is required.
      </p>
      <p>
        An exact match means the submitted file has the same fingerprint as the registered file, so
        the bytes are unchanged since registration. If the bytes differ, the files do not share that
        fingerprint. A resized, cropped, recompressed or edited image may no longer match exactly.
      </p>
      <p>
        Verify can also report that a file is visually similar to a registered image. Similarity
        does not establish that one file came from the other, or who owns either.
      </p>
      <p>
        Verification answers a specific question: does this file match the record? It does not
        independently answer who created the image, or whether what it shows is true.
      </p>

      <h2 className="text-2xl mt-10 mb-3">What Oyokometa does not claim</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>We do not issue a real or fake verdict.</li>
        <li>We do not use a single authenticity score.</li>
        <li>
          Missing metadata or Content Credentials does not prove that an image was AI-generated,
          manipulated or deceptive.
        </li>
        <li>A detector result is not proof that an image is AI-generated or camera-captured.</li>
        <li>
          A cryptographic match proves a match to a record, not authorship, and not that the
          depicted event occurred.
        </li>
        <li>
          A platform-signed registration is not a legal finding, and it is not proof that a record
          would be admissible in court.
        </li>
      </ul>

      <h2 className="text-2xl mt-10 mb-3">Built around evidence, not assumptions</h2>
      <p>
        Oyokometa is meant to make image provenance and technical findings easier to understand,
        share and verify. The report shows what the evidence supports, separates that from what the
        analysis suggests, and leaves uncertainty visible.
      </p>
      <p className="mt-4">Analyze the image. Understand the evidence. Create a record. Verify the match.</p>
    </article>
  );
}
