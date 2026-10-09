import type { Declarations } from "@oyokometa/shared";

type FindingsLite = {
  timeline?: Array<{ value?: string; field?: string }>;
  c2pa?: { ai_assertion?: string | null };
  evidence?: Array<{ signal?: string; value?: string }>;
};

export function declarationContradictions(
  declarations: Declarations,
  findings: FindingsLite | null | undefined,
): string[] {
  const notes: string[] = [];
  const declaredDate = declarations.creation_date?.slice(0, 10);
  const detectedDates = (findings?.timeline ?? [])
    .map((t) => String(t.value ?? "").slice(0, 10))
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))
    .sort();
  const earliest = detectedDates[0];
  if (declaredDate && earliest && declaredDate < earliest) {
    notes.push(
      "Declared creation date is earlier than the earliest timestamp detected in the file.",
    );
  }
  const aiUse = declarations.ai_use;
  const assertion = findings?.c2pa?.ai_assertion?.toLowerCase() ?? "";
  const evidenceHit = (findings?.evidence ?? []).some((e) =>
    /ai|synthetic|generated/i.test(`${e.signal ?? ""} ${e.value ?? ""}`),
  );
  if (aiUse === "none" && (assertion.includes("ai") || assertion.includes("trainedalgorithmic") || evidenceHit)) {
    notes.push('You declared no AI use, but the file contains an AI-related disclosure or signal.');
  }
  return notes;
}
