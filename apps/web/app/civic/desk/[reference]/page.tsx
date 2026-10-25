import type { Metadata } from "next";
import { CivicCaptureDesk } from "@/components/CivicDesk";

export const metadata: Metadata = {
  title: "Request a photo | Oyokometa",
  robots: { index: false, follow: false },
};

export default async function CivicCapturePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Request a photo</h1>
      <CivicCaptureDesk reference={reference} />
    </article>
  );
}
