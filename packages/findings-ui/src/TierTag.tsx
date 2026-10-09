import type { TruthTier } from "@oyokometa/evidence";

const LABELS: Record<TruthTier, string> = {
  verified: "Verified",
  detected: "Detected",
  inferred: "Inferred",
  declared: "Declared",
};

export function TierTag({ tier }: { tier: TruthTier }) {
  return <span className={`tier-tag tier-${tier}`}>{LABELS[tier]}</span>;
}
