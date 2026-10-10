export default function PrivacyPage() {
  return (
    <article className="page page-narrow">
      <h1 className="text-3xl mb-4">Privacy notice</h1>
      <p>
        This is a draft notice for Release 1. Counsel must confirm the data controller, hosting
        region, and NDPA 2023 / GDPR basis before public launch.
      </p>
      <ul className="list-disc pl-6 mt-4 space-y-2">
        <li>Uploaded images are never used to train or tune any model.</li>
        <li>Anonymous originals are deleted after 24 hours; signed-in after 30 days, unless you delete sooner.</li>
        <li>Analytics events never contain file names, hashes, metadata values, GPS, or image content.</li>
        <li>
          Deep Analysis sends the image to Sightengine for an AI-image score and a face-manipulation score.
          Sightengine deletes the file after processing. Oyokometa does not submit images to Sightengine&apos;s
          training feedback. Quick Scan is scored on Oyokometa&apos;s own server and is not sent to Sightengine.
        </li>
        <li>Delete now removes the image, previews, evidence record and reports from primary storage within minutes.</li>
      </ul>
    </article>
  );
}
