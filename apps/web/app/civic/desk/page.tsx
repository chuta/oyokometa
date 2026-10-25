import type { Metadata } from "next";
import { CivicDeskList } from "@/components/CivicDesk";

export const metadata: Metadata = {
  title: "Case photos | Oyokometa",
  robots: { index: false, follow: false },
};

export default function CivicDeskPage() {
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Request a photo</h1>
      <p className="text-muted mb-4">
        A case link is free. The person who opens it consents before the camera starts. The photo stays private to the review.
      </p>
      <CivicDeskList />
    </article>
  );
}
