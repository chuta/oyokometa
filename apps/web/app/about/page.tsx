import type { Metadata } from "next";
import { SOLUTION_AUDIENCES } from "@oyokometa/config";
import { ServiceCards } from "@/components/ServiceCards";

export const metadata: Metadata = {
  title: "Oyokometa | Digital Media Integrity & Verification Solutions",
  description:
    "Explore Oyokometa's image analysis, provenance, verification, AI media assessment, enterprise integrations, and digital media integrity services.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Oyokometa | Digital Media Integrity & Verification Solutions",
    description:
      "Explore Oyokometa's image analysis, provenance, verification, AI media assessment, enterprise integrations, and digital media integrity services.",
    url: "/about",
    images: ["/favicon.png"],
  },
};

const steps = [
  ["Understand", "Learn about your business, workflow, media risks, constraints, and desired outcome."],
  ["Assess", "Determine the required capabilities, data sources, integrations, and evaluation criteria."],
  ["Design", "Recommend a solution using existing tools, specialist APIs, Oyokometa capabilities, or custom development."],
  ["Deliver", "Implement the agreed scope, test the solution, document its limitations, and support adoption."],
  ["Improve", "Measure performance, review operational feedback, and turn repeated requirements into reusable capabilities."],
] as const;

const reasons = [
  ["Evidence-aware", "Separate technical observations, verification results, inferences, and declarations."],
  ["Technology-flexible", "Use an appropriate tool rather than forcing every problem into one product."],
  ["Practical", "Design around the workflow and constraints that already exist."],
  ["Explainable", "Say what a finding supports, and where it is uncertain."],
  ["Integration-ready", "Connect a suitable check to a customer's systems when that is feasible."],
  ["Progressive", "Build a reusable capability when the same need shows up more than once."],
] as const;

export default function AboutPage() {
  return (
    <article className="page about-page">
      <header className="about-hero">
        <p className="kicker">Digital media integrity & verification</p>
        <h1>Understand the evidence. Build the right solution.</h1>
        <p className="lede">
          Oyokometa helps individuals and organisations assess digital media, understand provenance
          and authenticity signals, and build practical solutions for the risks associated with images
          and other digital content.
        </p>
        <p className="lede lede-follow">
          From self-service analysis and verification to enterprise integrations, specialist
          technology, advisory, and managed services, we help you move from uncertainty to an
          informed, evidence-based response.
        </p>
        <p className="hero-actions">
          <a className="btn" href="/request-solution">
            Request a Solution
          </a>
          <a className="btn btn-secondary" href="/">
            Explore the Platform
          </a>
        </p>
      </header>

      <section className="about-section" aria-labelledby="problem-heading">
        <h2 id="problem-heading">Digital media creates new opportunities and new risks.</h2>
        <p>
          Organisations rely on images and other media for communication, journalism, claims,
          transactions, investigations, marketing, and decisions. Metadata can be incomplete or
          altered. Provenance may be unavailable. AI-generated content can be difficult to assess.
          Many teams still lack a consistent way to review a file and write down what they found.
        </p>
        <p>
          Oyokometa helps identify the evidence that is available, select an appropriate check,
          interpret the finding carefully, and put that check into an operation. Not every image can
          be authenticated conclusively.
        </p>
      </section>

      <section className="about-section" aria-labelledby="platform-heading">
        <h2 id="platform-heading">Start with the image. Go further when you need to.</h2>
        <div className="platform-grid">
          <article className="service-card">
            <h3>Analyze</h3>
            <p>Inspect available image metadata, file characteristics, provenance information, and supported detection outputs.</p>
            <a className="btn" href="/analyze">
              Analyze an Image
            </a>
          </article>
          <article className="service-card">
            <h3>Create</h3>
            <p>
              Register a file fingerprint and create an Oyokometa platform-signed provenance record.
              Registration does not independently prove authorship, capture date, or the truth of the
              depicted event.
            </p>
            <a className="btn" href="/create">
              Create a Record
            </a>
          </article>
          <article className="service-card">
            <h3>Capture</h3>
            <p>
              Send a one-time link so someone can take a photo through the browser camera. The
              signed record says the file is unchanged since it arrived. It does not prove the
              camera was physical, or that the scene is what it appears to be.
            </p>
            <a className="btn" href="/capture">
              Capture a Photo
            </a>
          </article>
          <article className="service-card">
            <h3>Verify</h3>
            <p>
              Check whether an image matches an existing Oyokometa provenance record. An exact
              cryptographic match establishes a file match, not the truth of the image&apos;s contents.
            </p>
            <a className="btn" href="/verify">
              Verify a File
            </a>
          </article>
        </div>
      </section>

      <section className="about-section" aria-labelledby="services-heading">
        <h2 id="services-heading">The right capabilities for your actual problem.</h2>
        <p>
          Not every organisation needs a new platform, and not every problem requires a custom-built
          model. Oyokometa works with you to understand the requirement, evaluate suitable
          technologies, and deliver a practical solution using the right combination of software,
          integrations, specialist providers, and expertise.
        </p>
        <ServiceCards />
        <p>
          <a href="/services">Read the service catalogue</a>
        </p>
      </section>

      <section className="about-section" aria-labelledby="method-heading">
        <h2 id="method-heading">How we work</h2>
        <ol className="method-list">
          {steps.map(([title, copy]) => (
            <li key={title}>
              <strong>{title}.</strong> {copy}
            </li>
          ))}
        </ol>
        <p>
          Not every engagement needs custom software or a long implementation. Some clients need an
          assessment, a technical recommendation, a short pilot, training, or a managed service.
        </p>
      </section>

      <section className="about-section" aria-labelledby="audiences-heading">
        <h2 id="audiences-heading">Who we serve</h2>
        <p>These are intended customer segments, not confirmed customers or existing partnerships.</p>
        <ul className="audience-list">
          {SOLUTION_AUDIENCES.map((audience) => (
            <li key={audience.id}>
              <a href={`/request-solution?audience=${audience.id}`}>{audience.label}</a>
              <span>{audience.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section" aria-labelledby="why-heading">
        <h2 id="why-heading">Why Oyokometa</h2>
        <ul className="reason-list">
          {reasons.map(([title, copy]) => (
            <li key={title}>
              <strong>{title}.</strong> {copy}
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section about-close" aria-labelledby="close-heading">
        <h2 id="close-heading">Tell us what you need to solve.</h2>
        <p>
          Whether you need to investigate suspicious media, introduce AI-generated content screening,
          integrate verification into an existing workflow, or explore a problem that requires a
          different approach, start with your requirements.
        </p>
        <p className="hero-actions">
          <a className="btn" href="/request-solution">
            Request a Solution
          </a>
          <a className="btn btn-secondary" href="/">
            Explore the Platform
          </a>
        </p>
      </section>
    </article>
  );
}
