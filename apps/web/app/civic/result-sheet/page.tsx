import type { Metadata } from "next";
import { CivicForm } from "@/components/CivicForm";

export const metadata: Metadata = {
  title: "Check a result sheet | Oyokometa",
  description: "Submit a polling-unit result sheet and the concern you want checked.",
  robots: { index: false, follow: false },
};

export default function ResultSheetPage() {
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Check a polling-unit result sheet</h1>
      <p className="text-muted mb-4">
        You do not have to say that fraud occurred. Say what is being claimed, then what specifically
        you want checked.
      </p>
      <CivicForm kind="result_sheet" />
    </article>
  );
}
