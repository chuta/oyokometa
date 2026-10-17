import type { Metadata } from "next";
import { ServiceCards } from "@/components/ServiceCards";

export const metadata: Metadata = {
  title: "Services | Oyokometa",
  description:
    "Oyokometa services for AI media assessment, image provenance, claims screening, API integration, and advisory.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Services | Oyokometa",
    description:
      "Oyokometa services for AI media assessment, image provenance, claims screening, API integration, and advisory.",
    url: "/services",
    images: ["/favicon.png"],
  },
};

export default function ServicesPage() {
  return (
    <article className="page about-page">
      <header className="about-hero">
        <p className="kicker">Services</p>
        <h1>The right capabilities for your actual problem.</h1>
        <p className="lede">
          Five services, plus room for a problem that does not fit. A check records what the file can
          support.
        </p>
      </header>
      <ServiceCards />
    </article>
  );
}
