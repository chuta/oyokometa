import type { Metadata } from "next";
import { CivicLibrary } from "@/components/CivicLibrary";
import { CivicMine } from "@/components/CivicMine";

export const metadata: Metadata = {
  title: "Civic Evidence | Oyokometa",
  description: "Submit a claim, preserve the evidence, and help Oyokometa check it. Submissions are not published automatically.",
  alternates: { canonical: "/civic" },
};

export default function CivicPage() {
  return (
    <article className="page about-page">
      <header className="about-hero">
        <p className="kicker">Civic Evidence</p>
        <h1>See something questionable? Submit the claim. Preserve the evidence. Help us check it.</h1>
        <p className="lede">
          Oyokometa can take a claim about an election image, a result sheet, or an incident, keep
          the file that arrived, and hold it for a person to review. It is not an election authority
          and it does not declare winners.
        </p>
        <p className="lede lede-follow">
          A signature shows that a file matches a record. It does not show that a caption, a place,
          or an event is true. Submissions are not published automatically.
        </p>
      </header>
      <div className="platform-grid">
        <article className="service-card">
          <h2>Check a viral photo</h2>
          <p>Still images only. If the claim is about a video, send the link to the post. Do not upload a video file.</p>
          <a className="btn" href="/civic/viral">
            Check a post
          </a>
        </article>
        <article className="service-card">
          <h2>Check a polling-unit result sheet</h2>
          <p>Send the sheet and the concern. The figures are not official results.</p>
          <a className="btn" href="/civic/result-sheet">
            Check a sheet
          </a>
        </article>
        <article className="service-card">
          <h2>Report an election incident</h2>
          <p>Describe what you witnessed, were told, or saw online. Do not take a risk to collect it.</p>
          <a className="btn" href="/civic/incident">
            Report an incident
          </a>
        </article>
      </div>
      <CivicMine />
      <section className="about-section" id="method" aria-labelledby="method-heading">
        <h2 id="method-heading">How a case is read</h2>
        <p>
          The file, the technical signals, the claim, and a reviewer&apos;s finding stay separate. A
          case is published only after an editor approves a redacted page. Until then it is private.
        </p>
      </section>
      <section className="about-section" id="safety" aria-labelledby="safety-heading">
        <h2 id="safety-heading">Safety</h2>
        <p>
          Do not approach a dangerous situation to gather evidence. If someone is in immediate
          danger, contact local emergency services. Oyokometa does not dispatch help.
        </p>
      </section>
      <section className="about-section" id="corrections" aria-labelledby="corrections-heading">
        <h2 id="corrections-heading">Corrections and appeals</h2>
        <p>
          You can add information or report an error from your receipt. A published case keeps its
          earlier versions when it is corrected. A public appeal form arrives with published cases.
        </p>
        <p>
          <a href="/privacy">Privacy notice</a>
        </p>
      </section>
      <section className="about-section" aria-labelledby="library-heading">
        <h2 id="library-heading">Reviewed cases</h2>
        <CivicLibrary />
      </section>
    </article>
  );
}
