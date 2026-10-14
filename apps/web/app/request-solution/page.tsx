import type { Metadata } from "next";
import { Suspense } from "react";
import { RequestSolutionForm } from "@/components/RequestSolutionForm";

export const metadata: Metadata = {
  title: "Request a Digital Media Integrity Solution | Oyokometa",
  description:
    "Tell Oyokometa about your digital media verification, AI detection, image fraud screening, API integration, advisory, or managed-service requirements.",
  alternates: { canonical: "/request-solution" },
  openGraph: {
    title: "Request a Digital Media Integrity Solution | Oyokometa",
    description:
      "Tell Oyokometa about your digital media verification, AI detection, image fraud screening, API integration, advisory, or managed-service requirements.",
    url: "/request-solution",
    images: ["/favicon.png"],
  },
};

export default function RequestSolutionPage() {
  return (
    <article className="page about-page">
      <header className="about-hero">
        <p className="kicker">Work with Oyokometa</p>
        <h1>Tell us what you need to solve.</h1>
        <p className="lede">
          Every organisation has different requirements. Tell us about your challenge, your current
          workflow, and the outcome you need. We&apos;ll review the request and determine whether it
          is best addressed through an existing Oyokometa capability, a third-party technology, a
          custom integration, an advisory engagement, or a combination of these.
        </p>
        <p>
          Submitting a request does not commit you to a purchase or guarantee that Oyokometa can
          deliver every requested capability. We will assess feasibility, scope, data requirements,
          and appropriate next steps.
        </p>
      </header>
      <Suspense fallback={<p>Loading the form.</p>}>
        <RequestSolutionForm />
      </Suspense>
    </article>
  );
}
