export default function PrivacyPage() {
  return (
    <article className="page doc-page">
      <h1>Privacy notice</h1>
      <p>
        This is a draft notice for Release 1. Counsel must confirm the data controller, hosting
        region, and NDPA 2023 / GDPR basis before public launch.
      </p>
      <ul className="list-disc pl-6 mt-4 space-y-2">
        <li>Uploaded images are never used to train or tune any model.</li>
        <li>Anonymous originals are deleted after 24 hours; signed-in after 30 days, unless you delete sooner.</li>
        <li>Analytics events never contain file names, hashes, metadata values, GPS, or image content.</li>
        <li>
          Every upload is sent to Hive for an adult-content check before a preview, analysis, or
          registration is stored. Hive is not asked to run any other model on the file. If that check
          cannot be completed, the file is not accepted.
        </li>
        <li>
          Deep Analysis sends the image to Sightengine for an AI-image score and a face-manipulation score.
          Sightengine deletes the file after processing. Oyokometa does not submit images to Sightengine&apos;s
          training feedback. Deep Analysis also sends the image to Reality Defender for a manipulation
          score. Quick Scan is scored on Oyokometa&apos;s own server and is not sent to either provider.
        </li>
        <li>Delete now removes the image, previews, evidence record and reports from primary storage within minutes.</li>
        <li>
          A solution request stores the details you submit so Oyokometa can review the enquiry. A
          confirmation may be emailed to you, and a short notice goes to the Oyokometa team. The
          request is not used to train a model. Marketing email is sent only if you opt in separately.
        </li>
      </ul>
    </article>
  );
}
