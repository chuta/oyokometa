import { readFile } from "node:fs/promises";

/**
 * Benchmark harness (R1 step 13). Loads a labelled corpus manifest and reports
 * gate metrics. Does not enable AI labels; that is a config write after QA-1–QA-5 pass.
 */
export type Manifest = {
  version: string;
  holdout_fraction: number;
  images: { path: string; group: string; label: string }[];
};

export async function loadManifest(path: string): Promise<Manifest> {
  return JSON.parse(await readFile(path, "utf8")) as Manifest;
}

export function gateResult(stats: {
  strongFpOnGenuine: number;
  rule9FpOnGenuine: number;
  strongRecallOnAi: number;
}) {
  const pass =
    stats.strongFpOnGenuine <= 0.01 &&
    stats.rule9FpOnGenuine <= 0.005 &&
    stats.strongRecallOnAi >= 0.8;
  return { pass, stats, ai_labels_enabled: pass };
}
