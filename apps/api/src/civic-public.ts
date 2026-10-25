import { asc, desc, eq, inArray } from "drizzle-orm";
import { civicAuditEvents, civicCaseVersions, civicCases, getDb } from "@oyokometa/db";
import {
  CIVIC_ASSESSMENT_LABEL,
  civicAuditMetadata,
  civicPublicPayloadOf,
  presentCivicVersion,
  readCivicPublicPayload,
  type CivicPublication,
  type CivicPublicHistory,
} from "./civic.js";

function historyOf(
  rows: Array<{ versionNumber: number; publishedAt: Date; changeReason: string; assessment: string }>,
): CivicPublicHistory[] {
  return rows.map((row) => ({
    version_number: row.versionNumber,
    published_at: row.publishedAt,
    change_reason: row.changeReason,
    assessment: row.assessment,
    assessment_label: CIVIC_ASSESSMENT_LABEL[row.assessment as keyof typeof CIVIC_ASSESSMENT_LABEL] ?? row.assessment,
  }));
}

export async function publicCaseRow(reference: string) {
  const [row] = await getDb()
    .select()
    .from(civicCases)
    .where(eq(civicCases.publicReference, reference))
    .limit(1);
  if (!row || row.publicationState !== "published" || !row.currentPublicVersionId) return null;
  return row;
}

export async function presentPublicCase(reference: string, versionNumber: number | null) {
  const row = await publicCaseRow(reference);
  if (!row) return null;
  const db = getDb();
  const versions = await db
    .select()
    .from(civicCaseVersions)
    .where(eq(civicCaseVersions.caseId, row.id))
    .orderBy(asc(civicCaseVersions.versionNumber));
  if (!versions.length) return null;
  const current = versions.find((item) => item.id === row.currentPublicVersionId) ?? versions[versions.length - 1]!;
  const selected = versionNumber == null ? current : versions.find((item) => item.versionNumber === versionNumber);
  if (!selected) return null;
  const payload = readCivicPublicPayload(selected.publicPayload);
  if (!payload) return null;
  const first = versions[0]!;
  return presentCivicVersion({
    reference: row.publicReference,
    versionNumber: selected.versionNumber,
    publishedAt: selected.publishedAt,
    firstPublishedAt: first.publishedAt,
    assessment: selected.assessment,
    rationale: selected.rationale,
    changeReason: selected.changeReason,
    payload,
    history: historyOf(versions),
    current: selected.id === current.id,
  });
}

export async function listPublishedCases() {
  const rows = await getDb()
    .select({
      reference: civicCases.publicReference,
      title: civicCases.title,
      publishedAt: civicCases.publishedAt,
      currentPublicVersionId: civicCases.currentPublicVersionId,
    })
    .from(civicCases)
    .where(eq(civicCases.publicationState, "published"))
    .orderBy(desc(civicCases.publishedAt))
    .limit(50);
  const ids = rows.map((row) => row.currentPublicVersionId).filter((id): id is string => Boolean(id));
  if (!ids.length) return [];
  const versions = await getDb().select().from(civicCaseVersions).where(inArray(civicCaseVersions.id, ids));
  const byId = new Map(versions.map((item) => [item.id, item]));
  return rows
    .map((row) => {
      const version = row.currentPublicVersionId ? byId.get(row.currentPublicVersionId) : null;
      if (!version) return null;
      return {
        reference: row.reference,
        title: row.title,
        published_at: row.publishedAt ?? version.publishedAt,
        assessment: version.assessment,
        assessment_label: CIVIC_ASSESSMENT_LABEL[version.assessment as keyof typeof CIVIC_ASSESSMENT_LABEL] ?? version.assessment,
        version_number: version.versionNumber,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function writeCivicVersion(input: {
  caseId: string;
  actorId: string;
  publication: CivicPublication;
  mode: "publish" | "correct";
}) {
  const db = getDb();
  const [existing] = await db
    .select({
      id: civicCaseVersions.id,
      versionNumber: civicCaseVersions.versionNumber,
    })
    .from(civicCaseVersions)
    .where(eq(civicCaseVersions.idempotencyKey, input.publication.idempotencyKey))
    .limit(1);
  if (existing) return { duplicate: true as const, versionId: existing.id, versionNumber: existing.versionNumber };

  const prior = await db
    .select({
      id: civicCaseVersions.id,
      versionNumber: civicCaseVersions.versionNumber,
    })
    .from(civicCaseVersions)
    .where(eq(civicCaseVersions.caseId, input.caseId))
    .orderBy(desc(civicCaseVersions.versionNumber))
    .limit(1);
  const versionNumber = (prior[0]?.versionNumber ?? 0) + 1;
  const versionId = crypto.randomUUID();
  const now = new Date();
  await db.insert(civicCaseVersions).values({
    id: versionId,
    caseId: input.caseId,
    versionNumber,
    publicPayload: civicPublicPayloadOf(input.publication),
    assessment: input.publication.assessment,
    rationale: input.publication.rationale,
    publishedBy: input.actorId,
    publishedAt: now,
    changeReason: input.publication.changeReason,
    supersedesVersionId: prior[0]?.id ?? null,
    idempotencyKey: input.publication.idempotencyKey,
  });
  await db
    .update(civicCases)
    .set({
      currentPublicVersionId: versionId,
      publicationState: "published",
      workflowStatus: "published",
      claimAssessment: input.publication.assessment,
      assessmentRationale: input.publication.rationale,
      updatedAt: now,
      ...(input.mode === "publish" ? { publishedAt: now } : {}),
    })
    .where(eq(civicCases.id, input.caseId));
  await db.insert(civicAuditEvents).values({
    caseId: input.caseId,
    actorId: input.actorId,
    eventType: input.mode === "publish" ? "civic.case.published" : "civic.case.corrected",
    targetType: "civic_case_version",
    targetId: versionId,
    reason: input.mode === "correct" ? input.publication.changeReason.slice(0, 200) : null,
    metadata: civicAuditMetadata({ version_number: versionNumber, assessment: input.publication.assessment }),
  });
  return { duplicate: false as const, versionId, versionNumber };
}
