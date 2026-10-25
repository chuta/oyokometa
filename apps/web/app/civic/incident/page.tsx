import type { Metadata } from "next";
import { CivicForm } from "@/components/CivicForm";

export const metadata: Metadata = {
  title: "Report an incident | Oyokometa",
  description: "Report an election incident without putting yourself at risk.",
  robots: { index: false, follow: false },
};

export default function IncidentCivicPage() {
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Report an election incident</h1>
      <p className="text-muted mb-4">Say what you witnessed, what someone told you, or what you saw online.</p>
      <CivicForm kind="incident" />
    </article>
  );
}
