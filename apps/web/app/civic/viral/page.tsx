import type { Metadata } from "next";
import { CivicForm } from "@/components/CivicForm";

export const metadata: Metadata = {
  title: "Check a viral photo | Oyokometa",
  description: "Submit a claim about a viral photo. Still images only. For a video, send the link to the post.",
  robots: { index: false, follow: false },
};

export default function ViralCivicPage() {
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Check a viral photo</h1>
      <p className="text-muted mb-4">
        Still images only. If the claim is about a video, paste the link to the post. This form does
        not accept a video file.
      </p>
      <CivicForm kind="viral_media" />
    </article>
  );
}
