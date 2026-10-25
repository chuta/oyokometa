import type { Metadata } from "next";
import { CivicForm } from "@/components/CivicForm";

export const metadata: Metadata = {
  title: "Check a post | Oyokometa",
  description: "Submit a claim about a viral photo, with a link or a still image.",
  robots: { index: false, follow: false },
};

export default function ViralCivicPage() {
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Check a viral photo or video</h1>
      <p className="text-muted mb-4">Describe the claim as it is being told. Do not include a precise home address.</p>
      <CivicForm kind="viral_media" />
    </article>
  );
}
