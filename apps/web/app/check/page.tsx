import { AnalyzeForm } from "@/components/AnalyzeForm";

export default function CheckPage() {
  return (
    <div>
      <p className="kicker">Election mode</p>
      <h1 className="text-3xl mb-2">Check an image</h1>
      <p className="text-muted mb-8">
        The same evidence engine as Analyze. No party, candidate, or claim-level logic. Share a
        result after you sign in.
      </p>
      <AnalyzeForm />
    </div>
  );
}
