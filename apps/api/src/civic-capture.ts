import { and, eq, inArray, lte } from "drizzle-orm";
import { assets, captureRequests, civicAuditEvents, civicEvidenceItems, getDb } from "@oyokometa/db";

type CaptureEvent = "civic.capture.requested" | "civic.capture.completed" | "civic.capture.revoked" | "civic.capture.expired" | "civic.capture.refused";

export async function recordCivicCaptureEvent(input: {
  caseId: string;
  actorId: string | null;
  eventType: CaptureEvent;
  requestId: string;
  metadata: Record<string, string | boolean>;
}) {
  await getDb().insert(civicAuditEvents).values({
    caseId: input.caseId,
    actorId: input.actorId,
    eventType: input.eventType,
    targetType: "capture_request",
    targetId: input.requestId,
    metadata: input.metadata,
  });
}

/**
 * Point a case at the capture record that already exists.
 * Does not copy the file or rewrite the signed payload.
 */
export async function linkCivicCaptureEvidence(input: {
  caseId: string;
  requestId: string;
  ownerUserId: string;
  recordId: string;
  publicId: string;
  assetId: string;
  sha256: string;
  mime: string;
  byteSize: number;
  prompt: string;
  referenceCode: string;
  hasLocation: boolean;
}) {
  const db = getDb();
  const [existing] = await db
    .select({ id: civicEvidenceItems.id })
    .from(civicEvidenceItems)
    .where(eq(civicEvidenceItems.captureRecordId, input.recordId))
    .limit(1);
  if (!existing) {
    await db.insert(civicEvidenceItems).values({
      caseId: input.caseId,
      evidenceType: "capture_record",
      captureRecordId: input.recordId,
      assetId: input.assetId,
      sourceType: "capture",
      fileNameDisplay: "Capture photo",
      mimeType: input.mime,
      fileSize: input.byteSize,
      sha256: input.sha256,
      integrityState: "signed_record",
      technicalSummary: { credential_type: "platform_signed_record", public_id: input.publicId },
      declarationJson: { capture_prompt: input.prompt.slice(0, 500) },
      accessClassification: "restricted",
      publicRedactionState: "private",
      addedBy: input.ownerUserId,
    });
    await db.update(assets).set({ retainUntil: null, updatedAt: new Date() }).where(eq(assets.id, input.assetId));
  }
  await recordCivicCaptureEvent({
    caseId: input.caseId,
    actorId: input.ownerUserId,
    eventType: "civic.capture.completed",
    requestId: input.requestId,
    metadata: { capture_reference: input.referenceCode, has_location: input.hasLocation },
  });
}

export async function markCaptureCancelled(requestId: string, actorId: string | null) {
  const db = getDb();
  const [row] = await db
    .update(captureRequests)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(captureRequests.id, requestId), inArray(captureRequests.status, ["open", "capturing"])))
    .returning();
  if (row?.caseId) {
    await recordCivicCaptureEvent({
      caseId: row.caseId,
      actorId,
      eventType: "civic.capture.revoked",
      requestId: row.id,
      metadata: { capture_reference: row.referenceCode },
    });
  }
  return row ?? null;
}

export async function markCaptureExpired(requestId: string) {
  const db = getDb();
  const [row] = await db
    .update(captureRequests)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(captureRequests.id, requestId),
        inArray(captureRequests.status, ["open", "capturing"]),
        lte(captureRequests.expiresAt, new Date()),
      ),
    )
    .returning();
  if (row?.caseId) {
    await recordCivicCaptureEvent({
      caseId: row.caseId,
      actorId: null,
      eventType: "civic.capture.expired",
      requestId: row.id,
      metadata: { capture_reference: row.referenceCode },
    });
  }
  return row ?? null;
}
