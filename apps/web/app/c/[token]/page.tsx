import type { Metadata } from "next";
import { CaptureCamera } from "@/components/CaptureCamera";

export const metadata: Metadata = {
  title: "Take a photo | Oyokometa",
  description: "Take a photo through an Oyokometa capture link.",
  robots: { index: false, follow: false },
};

export default async function CaptureLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <article className="page about-page">
      <header className="about-hero">
        <p className="kicker">Capture</p>
        <h1>Take a photo.</h1>
      </header>
      <CaptureCamera token={token} />
    </article>
  );
}
