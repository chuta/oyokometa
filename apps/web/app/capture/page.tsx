import type { Metadata } from "next";
import { CaptureDesk } from "@/components/CaptureDesk";

export const metadata: Metadata = {
  title: "Capture | Oyokometa",
  description: "Create a one-time link so someone can take a photo through the browser camera.",
  alternates: { canonical: "/capture" },
  openGraph: {
    title: "Capture | Oyokometa",
    description: "Create a one-time link so someone can take a photo through the browser camera.",
    url: "/capture",
    images: ["/favicon.png"],
  },
};

export default function CapturePage() {
  return (
    <article className="page about-page">
      <header className="about-hero">
        <p className="kicker">Capture</p>
        <h1>Ask for a photo.</h1>
        <p className="lede">
          Send a one-time link. The recipient takes the photo in the browser, and Oyokometa signs the
          file it receives. The record says the file is unchanged since receipt.
        </p>
      </header>
      <CaptureDesk />
    </article>
  );
}
