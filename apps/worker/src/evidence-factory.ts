import { randomUUID } from "node:crypto";
import { strengthFor } from "@oyokometa/evidence";
import type { EvidenceItem } from "@oyokometa/evidence";

export function ev(partial: Omit<EvidenceItem, "id" | "strength"> & { strength?: EvidenceItem["strength"] }): EvidenceItem {
  return {
    id: randomUUID(),
    strength: partial.strength ?? strengthFor(partial.signal),
    ...partial,
  };
}
