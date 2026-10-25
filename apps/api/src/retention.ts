import { and, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { analysisJobs, assets, civicEvidenceItems, getDb } from "@oyokometa/db";
import { audit } from "./audit.js";
import { purgeAssetBytes, purgeJob } from "./purge.js";

export const ANONYMOUS_ANALYSIS_TTL_MS = 24 * 3600_000;
const BATCH = 200;
const HOUR_MS = 3600_000;

export function retentionCutoffs(now: Date) {
  return {
    assetsExpiredBefore: now,
    anonymousAnalysesBefore: new Date(now.getTime() - ANONYMOUS_ANALYSIS_TTL_MS),
  };
}

export async function runRetention(now = new Date()) {
  const db = getDb();
  const cut = retentionCutoffs(now);

  const expired = await db
    .select()
    .from(assets)
    .where(and(isNull(assets.imageDeletedAt), lt(assets.retainUntil, cut.assetsExpiredBefore)))
    .limit(BATCH);
  const heldIds = new Set<string>();
  if (expired.length) {
    const held = await db
      .select({ assetId: civicEvidenceItems.assetId })
      .from(civicEvidenceItems)
      .where(inArray(civicEvidenceItems.assetId, expired.map((asset) => asset.id)))
      .limit(BATCH);
    for (const row of held) if (row.assetId) heldIds.add(row.assetId);
  }
  let bytesDeleted = 0;
  for (const asset of expired) {
    if (heldIds.has(asset.id)) continue;
    try {
      await purgeAssetBytes(asset);
      bytesDeleted += 1;
    } catch (err) {
      console.error(JSON.stringify({ msg: "retention_asset_failed", asset_id: asset.id, error: String(err) }));
    }
  }

  const anonymous = await db
    .select({ id: analysisJobs.id })
    .from(analysisJobs)
    .where(
      and(
        isNull(analysisJobs.ownerUserId),
        isNotNull(analysisJobs.ownerSessionId),
        isNull(analysisJobs.deletedAt),
        lt(analysisJobs.createdAt, cut.anonymousAnalysesBefore),
      ),
    )
    .limit(BATCH);
  let analysesPurged = 0;
  for (const job of anonymous) {
    try {
      await purgeJob(job.id);
      analysesPurged += 1;
    } catch (err) {
      console.error(JSON.stringify({ msg: "retention_job_failed", job_id: job.id, error: String(err) }));
    }
  }

  const result = { bytes_deleted: bytesDeleted, anonymous_analyses_purged: analysesPurged };
  if (bytesDeleted || analysesPurged) {
    await audit("system:retention", "retention.run", undefined, "scheduled retention", result);
  }
  return result;
}

export function startRetentionSchedule() {
  if (process.env.RETENTION_JOB === "false") return;
  const tick = () => {
    runRetention()
      .then((r) => console.log(JSON.stringify({ msg: "retention_run", ...r })))
      .catch((err) => console.error(JSON.stringify({ msg: "retention_failed", error: String(err) })));
  };
  setTimeout(tick, 60_000).unref();
  setInterval(tick, HOUR_MS).unref();
}
