import { AnalyzeForm } from "@/components/AnalyzeForm";

export default function AnalyzePage() {
  return (
    <div>
      <h1 className="text-3xl mb-2">Analyze an image</h1>
      <p className="text-muted mb-8">
        One file. We separate verified facts from technical signals and inference. Missing metadata is
        not evidence of AI generation or deception.
      </p>
      <AnalyzeForm />
    </div>
  );
}
