import { and, eq, isNull } from "drizzle-orm";
import {
  getDb,
  analysisJobs,
  assets,
  evidenceItems,
  findings,
  provenanceRecords,
  rawOutputs,
  reports,
  shareLinks,
} from "@oyokometa/db";
import { removeBlob } from "./blob.js";

type AssetRow = typeof assets.$inferSelect;

/** Legacy provenance records point their thumbnail at the asset preview, so that blob must survive. */
async function previewInUse(previewKey: string) {
  const [row] = await getDb()
    .select({ id: provenanceRecords.id })
    .from(provenanceRecords)
    .where(eq(provenanceRecords.thumbnailKey, previewKey))
    .limit(1);
  return Boolean(row);
}

/** Deletes the uploaded bytes and preview. The sha256 stays so provenance lookups keep working. */
export async function purgeAssetBytes(asset: AssetRow) {
  await removeBlob(asset.storageKey);
  if (asset.previewKey && !(await previewInUse(asset.previewKey))) {
    await removeBlob(asset.previewKey);
  }
  await getDb()
    .update(assets)
    .set({ imageDeletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(assets.id, asset.id), isNull(assets.imageDeletedAt)));
}

/** Removes everything derived from an analysis and marks the job deleted. */
export async function purgeJob(jobId: string) {
  const db = getDb();
  const reportRows = await db.select().from(reports).where(eq(reports.jobId, jobId));
  for (const r of reportRows) await removeBlob(r.storageKey);
  await db.delete(findings).where(eq(findings.jobId, jobId));
  await db.delete(evidenceItems).where(eq(evidenceItems.jobId, jobId));
  await db.delete(rawOutputs).where(eq(rawOutputs.jobId, jobId));
  await db.delete(reports).where(eq(reports.jobId, jobId));
  await db
    .update(shareLinks)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(shareLinks.jobId, jobId), isNull(shareLinks.revokedAt)));
  await db
    .update(analysisJobs)
    .set({ deletedAt: new Date(), findings: null, updatedAt: new Date() })
    .where(eq(analysisJobs.id, jobId));
}
