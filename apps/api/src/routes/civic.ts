import type { Context } from "hono";
import { Hono } from "hono";
import { and, desc, eq, inArray, ne, notInArray, or } from "drizzle-orm";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import {
  captureRequests,
  civicAppeals,
  civicAuditEvents,
  civicCaseVersions,
  civicCases,
  civicEvidenceItems,
  civicSources,
  getDb,
  provenanceRecords,
  releaseHold,
} from "@oyokometa/db";
import { allowEndpoint } from "../rate-limit.js";
import { notFound } from "../session.js";
import { randomToken, sha256Hex } from "../crypto.js";
import { holdCivicAsset, screenCivicAsset } from "../civic-file.js";
import { captureReferenceCode, captureRequiresHold } from "../capture.js";
import { markCaptureCancelled, recordCivicCaptureEvent } from "../civic-capture.js";
import { listPublishedCases, presentPublicCase, writeCivicVersion } from "../civic-public.js";
import { publicAppOrigin } from "../origin.js";
import {
  CIVIC_CAPTURE_BLOCKED,
  CIVIC_EDITOR_QUEUE,
  CIVIC_LIMITS,
  canCorrectCivicCase,
  canPublishCivicCase,
  canReadCivicCase,
  canRequestCivicCapture,
  canUnpublishCivicCase,
  civicAuditMetadata,
  civicReferenceCode,
  contributorCanOpen,
  parseCivicAppeal,
  parseCivicCaptureRequest,
  parseCivicNote,
  parseCivicPublication,
  parseCivicResolution,
  parseCivicUnpublish,
  parseCivicSubmission,
  OBSERVATION_BASIS_LABEL,
} from "../civic.js";

const STATUS_LABEL: Record<string, string> = {
  received: "Received",
  triage: "In triage",
  under_review: "Under review",
  awaiting_corroboration: "Waiting for more sources",
  awaiting_contributor: "Waiting for more information",
  proposed_finding: "Finding proposed",
  editor_review: "With an editor",
  published: "Published",
  referred: "Referred",
  closed: "Closed",
  reopened: "Reopened",
  withdrawn: "Withdrawn",
};

const NEXT_STEP =
  "A person reviews the submission before anything is published. Oyokometa does not declare an election result, and a file check is not a verdict on the claim.";

export const civicRoutes = new Hono();

function referenceOrRetry() {
  return civicReferenceCode();
}

civicRoutes.post("/civic/cases", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`civic:${auth.ipHash}`, CIVIC_LIMITS.intakePerHour, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many submissions. Try again later.", auth.requestId), 429);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = parseCivicSubmission(body);
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, auth.requestId), 400);

  const db = getDb();
  const submission = parsed.value;
  const [existing] = await db
    .select({ reference: civicCases.publicReference })
    .from(civicCases)
    .where(eq(civicCases.idempotencyKey, submission.idempotencyKey))
    .limit(1);
  if (existing) return c.json({ reference: existing.reference, duplicate: true });

  let screened: { sha256: string; mime: string; byteSize: number; fileName: string | null } | null = null;
  if (submission.assetId) {
    const screen = await screenCivicAsset(submission.assetId, { userId: auth.user?.id ?? null, anonId: auth.anon?.id ?? null });
    if (!screen.ok) {
      return c.json(apiError(screen.code, screen.message, auth.requestId), screen.status as 400 | 404 | 409 | 503);
    }
    screened = screen.asset;
  }

  const token = randomToken(32);
  const id = crypto.randomUUID();
  let reference = referenceOrRetry();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await db.insert(civicCases).values({
        id,
        publicReference: reference,
        idempotencyKey: submission.idempotencyKey,
        caseType: submission.caseType,
        title: submission.title,
        claimText: submission.claimText,
        contributorExplanation: submission.contributorExplanation,
        specificCheck: submission.specificCheck,
        claimSourceUrl: submission.sourceUrl,
        claimedEventAt: submission.claimedEventAt,
        claimedEventTimePrecision: submission.claimedEventTimePrecision,
        claimedLocationText: submission.claimedLocationText,
        locationPrecision: submission.locationPrecision,
        electionOrEvent: submission.electionOrEvent,
        state: submission.state,
        lga: submission.lga,
        ward: submission.ward,
        pollingUnitCode: submission.pollingUnitCode,
        contributorId: auth.user?.id ?? null,
        contributorEmail: submission.contributorEmail,
        contributorSessionId: auth.user ? null : auth.anon?.id ?? null,
        receiptTokenHash: sha256Hex(token),
        ipHash: auth.ipHash,
        workflowStatus: "received",
        publicationState: "private",
        sensitivityLevel: submission.sensitivityLevel,
        identityRestricted: true,
        incidentCategory: submission.incidentCategory,
        observationBasis: submission.observationBasis,
        restrictedHandling: submission.restrictedHandling,
      });
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/idempotency_key/.test(message)) {
        const [again] = await db
          .select({ reference: civicCases.publicReference })
          .from(civicCases)
          .where(eq(civicCases.idempotencyKey, submission.idempotencyKey))
          .limit(1);
        if (again) return c.json({ reference: again.reference, duplicate: true });
      }
      if (/public_reference/.test(message) && attempt < 2) {
        reference = referenceOrRetry();
        continue;
      }
      console.error(JSON.stringify({ msg: "civic_case_insert_failed" }));
      return c.json(apiError(ERROR_CODES.service_unavailable, "The submission could not be saved. Try again.", auth.requestId), 503);
    }
  }

  if (screened && submission.assetId) {
    await db.insert(civicEvidenceItems).values({
      caseId: id,
      evidenceType: "submitted_image",
      assetId: submission.assetId,
      sha256: screened.sha256,
      mimeType: screened.mime,
      fileSize: screened.byteSize,
      fileNameDisplay: screened.fileName?.slice(0, 180) ?? null,
      sourceType: "contributor",
      accessClassification: "restricted",
      publicRedactionState: "private",
      addedBy: auth.user?.id ?? null,
    });
    await holdCivicAsset(submission.assetId);
  }
  if (submission.sourceUrl) {
    await db.insert(civicSources).values({
      caseId: id,
      url: submission.sourceUrl,
      title: "Source link",
      sourceType: "submission",
      accessedAt: new Date(),
      addedBy: auth.user?.id ?? null,
    });
  }
  await db.insert(civicAuditEvents).values({
    caseId: id,
    actorId: auth.user?.id ?? null,
    eventType: "civic.case.created",
    targetType: "civic_case",
    targetId: id,
    metadata: { case_type: submission.caseType, has_file: Boolean(screened), has_url: Boolean(submission.sourceUrl) },
  });
  console.log(JSON.stringify({ msg: "civic_case", reference }));

  return c.json({ reference, receipt_token: token, duplicate: false }, 201);
});

civicRoutes.get("/civic/cases", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) return c.json({ cases: [] });
  const rows = await getDb()
    .select({
      reference: civicCases.publicReference,
      caseType: civicCases.caseType,
      title: civicCases.title,
      workflowStatus: civicCases.workflowStatus,
      publicationState: civicCases.publicationState,
      createdAt: civicCases.createdAt,
    })
    .from(civicCases)
    .where(eq(civicCases.contributorId, auth.user.id))
    .orderBy(desc(civicCases.createdAt))
    .limit(20);
  return c.json({
    cases: rows.map((row) => ({
      reference: row.reference,
      case_type: row.caseType,
      title: row.title,
      workflow_status: row.workflowStatus,
      status_label: STATUS_LABEL[row.workflowStatus] ?? row.workflowStatus,
      publication_state: row.publicationState,
      created_at: row.createdAt,
    })),
  });
});

async function openCase(c: Context) {
  const auth = c.get("auth");
  const reference = c.req.param("reference") ?? "";
  const [row] = await getDb().select().from(civicCases).where(eq(civicCases.publicReference, reference)).limit(1);
  if (!row) return null;
  const allowed = contributorCanOpen({
    userId: auth.user?.id ?? null,
    anonSessionId: auth.user ? null : auth.anon?.id ?? null,
    receiptToken: c.req.header("x-civic-receipt") ?? null,
    contributorId: row.contributorId,
    contributorSessionId: row.contributorSessionId,
    receiptTokenHash: row.receiptTokenHash,
  });
  if (!allowed) return null;
  return row;
}

civicRoutes.get("/civic/cases/:reference", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`civic-receipt:${auth.ipHash}`, CIVIC_LIMITS.receiptReadPerHour, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests. Try again later.", auth.requestId), 429);
  }
  const row = await openCase(c);
  if (!row) return notFound(c);
  const db = getDb();
  const evidence = await db
    .select({
      fileName: civicEvidenceItems.fileNameDisplay,
      mimeType: civicEvidenceItems.mimeType,
    })
    .from(civicEvidenceItems)
    .where(and(eq(civicEvidenceItems.caseId, row.id), eq(civicEvidenceItems.evidenceType, "submitted_image")));
  const sources = await db
    .select({ sourceType: civicSources.sourceType, url: civicSources.url, notes: civicSources.reliabilityNotes })
    .from(civicSources)
    .where(eq(civicSources.caseId, row.id));
  const explanation =
    row.contributorExplanation ||
    sources.find((item) => item.sourceType === "context")?.notes ||
    null;
  return c.json({
    reference: row.publicReference,
    case_type: row.caseType,
    title: row.title,
    claim_text: row.claimText,
    contributor_explanation: explanation,
    specific_check: row.specificCheck,
    workflow_status: row.workflowStatus,
    status_label: STATUS_LABEL[row.workflowStatus] ?? row.workflowStatus,
    publication_state: row.publicationState,
    publication_label: row.publicationState === "published" ? "Published" : "Private",
    created_at: row.createdAt,
    what_happens_next: NEXT_STEP,
    contributor_email: row.contributorEmail,
    observation_basis: row.observationBasis,
    observation_label: row.observationBasis
      ? OBSERVATION_BASIS_LABEL[row.observationBasis as keyof typeof OBSERVATION_BASIS_LABEL] ?? row.observationBasis
      : null,
    restricted_handling: row.restrictedHandling || row.sensitivityLevel === "restricted",
    evidence: evidence.map((item) => ({ kind: "image", file_name: item.fileName, mime_type: item.mimeType })),
    sources: sources
      .filter((item) => item.sourceType !== "context")
      .map((item) => ({ kind: item.sourceType, url: item.url, notes: item.notes })),
  });
});

civicRoutes.post("/civic/cases/:reference/notes", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`civic-note:${auth.ipHash}`, CIVIC_LIMITS.notesPerHour, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many updates. Try again later.", auth.requestId), 429);
  }
  const row = await openCase(c);
  if (!row) return notFound(c);
  const parsed = parseCivicNote(await c.req.json().catch(() => null));
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, auth.requestId), 400);
  const db = getDb();
  const [note] = await db
    .insert(civicSources)
    .values({
      caseId: row.id,
      url: parsed.value.sourceUrl,
      title: parsed.value.kind === "error" ? "Error report" : "Additional information",
      sourceType: parsed.value.kind === "error" ? "error_report" : "contributor_update",
      reliabilityNotes: parsed.value.text,
      addedBy: auth.user?.id ?? null,
    })
    .returning({ id: civicSources.id });
  await db.insert(civicAuditEvents).values({
    caseId: row.id,
    actorId: auth.user?.id ?? null,
    eventType: "civic.contributor.note",
    targetType: "civic_source",
    targetId: note?.id ?? null,
    metadata: { kind: parsed.value.kind, has_url: Boolean(parsed.value.sourceUrl) },
  });
  return c.json({ ok: true }, 201);
});

function deskScope(user: { id: string; role: string }) {
  if (user.role !== "reviewer" && user.role !== "editor") return null;
  const open = notInArray(civicCases.workflowStatus, [...CIVIC_CAPTURE_BLOCKED]);
  if (user.role === "reviewer") return and(eq(civicCases.assignedReviewerId, user.id), open);
  return and(
    or(
      eq(civicCases.assignedReviewerId, user.id),
      and(inArray(civicCases.workflowStatus, [...CIVIC_EDITOR_QUEUE]), ne(civicCases.sensitivityLevel, "restricted")),
    ),
    open,
  );
}

async function deskCase(c: Context) {
  const auth = c.get("auth");
  if (!auth.user) return { kind: "unauthorized" as const };
  const reference = c.req.param("reference") ?? "";
  const [row] = await getDb().select().from(civicCases).where(eq(civicCases.publicReference, reference)).limit(1);
  if (!row || !canRequestCivicCapture({ id: auth.user.id, role: auth.user.role }, row)) return { kind: "missing" as const };
  return { kind: "ok" as const, row, user: auth.user };
}

function publicationGate(row: typeof civicCases.$inferSelect) {
  return {
    contributorId: row.contributorId,
    assignedReviewerId: row.assignedReviewerId,
    workflowStatus: row.workflowStatus,
    sensitivityLevel: row.sensitivityLevel,
    identityRestricted: row.identityRestricted,
    publicationState: row.publicationState,
    hasPublicVersion: Boolean(row.currentPublicVersionId),
  };
}

async function editorCase(c: Context) {
  const auth = c.get("auth");
  if (!auth.user) return { kind: "unauthorized" as const };
  if (auth.user.role !== "editor") return { kind: "missing" as const };
  const reference = c.req.param("reference") ?? "";
  const [row] = await getDb().select().from(civicCases).where(eq(civicCases.publicReference, reference)).limit(1);
  if (!row || !canReadCivicCase({ id: auth.user.id, role: auth.user.role }, row)) return { kind: "missing" as const };
  return { kind: "ok" as const, row, user: auth.user };
}

async function caseCaptures(caseId: string) {
  const db = getDb();
  const links = await db
    .select()
    .from(captureRequests)
    .where(eq(captureRequests.caseId, caseId))
    .orderBy(desc(captureRequests.createdAt))
    .limit(20);
  const recordIds = links.map((link) => link.provenanceRecordId).filter((id): id is string => Boolean(id));
  const records = recordIds.length
    ? await db
        .select({ id: provenanceRecords.id, publicId: provenanceRecords.publicId })
        .from(provenanceRecords)
        .where(inArray(provenanceRecords.id, recordIds))
    : [];
  const publicIds = new Map(records.map((record) => [record.id, record.publicId]));
  return links.map((link) => ({
    id: link.id,
    reference: link.referenceCode,
    prompt: link.prompt,
    address: link.address,
    status: link.status,
    expires_at: link.expiresAt,
    created_at: link.createdAt,
    record_public_id: link.provenanceRecordId ? publicIds.get(link.provenanceRecordId) ?? null : null,
  }));
}

civicRoutes.get("/civic/desk", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  const where = deskScope(auth.user);
  if (!where) return notFound(c);
  const rows = await getDb()
    .select({
      reference: civicCases.publicReference,
      caseType: civicCases.caseType,
      title: civicCases.title,
      workflowStatus: civicCases.workflowStatus,
    })
    .from(civicCases)
    .where(where)
    .orderBy(desc(civicCases.createdAt))
    .limit(50);
  return c.json({
    cases: rows.map((row) => ({
      reference: row.reference,
      case_type: row.caseType,
      title: row.title,
      workflow_status: row.workflowStatus,
      status_label: STATUS_LABEL[row.workflowStatus] ?? row.workflowStatus,
    })),
  });
});

civicRoutes.get("/civic/desk/:reference", async (c) => {
  const opened = await deskCase(c);
  if (opened.kind === "unauthorized") {
    const auth = c.get("auth");
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  if (opened.kind === "missing") return notFound(c);
  const row = opened.row;
  if (row.sensitivityLevel === "sensitive" || row.sensitivityLevel === "restricted") {
    await getDb().insert(civicAuditEvents).values({
      caseId: row.id,
      actorId: opened.user.id,
      eventType: "civic.case.accessed",
      targetType: "civic_case",
      targetId: row.id,
      metadata: civicAuditMetadata({ sensitivity: row.sensitivityLevel }),
    });
  }
  const actor = { id: opened.user.id, role: opened.user.role };
  const gate = {
    contributorId: row.contributorId,
    assignedReviewerId: row.assignedReviewerId,
    workflowStatus: row.workflowStatus,
    sensitivityLevel: row.sensitivityLevel,
    identityRestricted: row.identityRestricted,
    publicationState: row.publicationState,
    hasPublicVersion: Boolean(row.currentPublicVersionId),
  };
  const appeals =
    opened.user.role === "editor"
      ? await getDb()
          .select({
            id: civicAppeals.id,
            status: civicAppeals.status,
            reason: civicAppeals.reason,
            supporting: civicAppeals.supportingEvidenceReference,
            createdAt: civicAppeals.createdAt,
            resolution: civicAppeals.resolution,
          })
          .from(civicAppeals)
          .where(eq(civicAppeals.caseId, row.id))
          .orderBy(desc(civicAppeals.createdAt))
          .limit(20)
      : [];
  const [current] = row.currentPublicVersionId
    ? await getDb()
        .select({ versionNumber: civicCaseVersions.versionNumber })
        .from(civicCaseVersions)
        .where(eq(civicCaseVersions.id, row.currentPublicVersionId))
        .limit(1)
    : [];
  let explanation = row.contributorExplanation;
  if (!explanation) {
    const [legacy] = await getDb()
      .select({ notes: civicSources.reliabilityNotes })
      .from(civicSources)
      .where(and(eq(civicSources.caseId, row.id), eq(civicSources.sourceType, "context")))
      .limit(1);
    explanation = legacy?.notes ?? null;
  }
  return c.json({
    reference: row.publicReference,
    case_type: row.caseType,
    title: row.title,
    claim_text: row.claimText,
    contributor_explanation: explanation,
    specific_check: row.specificCheck,
    observation_basis: row.observationBasis,
    observation_label: row.observationBasis
      ? OBSERVATION_BASIS_LABEL[row.observationBasis as keyof typeof OBSERVATION_BASIS_LABEL] ?? row.observationBasis
      : null,
    sensitivity_level: row.sensitivityLevel,
    restricted_handling: row.restrictedHandling || row.sensitivityLevel === "restricted",
    workflow_status: row.workflowStatus,
    status_label: STATUS_LABEL[row.workflowStatus] ?? row.workflowStatus,
    publication_state: row.publicationState,
    can_publish: canPublishCivicCase(actor, gate),
    can_correct: canCorrectCivicCase(actor, gate),
    can_unpublish: canUnpublishCivicCase(actor, gate),
    current_version_number: current?.versionNumber ?? null,
    captures: await caseCaptures(row.id),
    appeals: appeals.map((item) => ({
      id: item.id,
      status: item.status,
      reason: item.reason,
      supporting_url: item.supporting,
      created_at: item.createdAt,
      resolution: item.resolution,
    })),
  });
});

civicRoutes.post("/civic/desk/:reference/captures", async (c) => {
  const auth = c.get("auth");
  const opened = await deskCase(c);
  if (opened.kind === "unauthorized") return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  if (opened.kind === "missing") return notFound(c);
  if (!auth.user) return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  if (!allowEndpoint(`cap:${auth.user.id}`, 20, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many capture links. Try again later.", auth.requestId), 429);
  }
  const parsed = parseCivicCaptureRequest(await c.req.json().catch(() => null));
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, auth.requestId), 400);
  if (captureRequiresHold(opened.row.id)) {
    return c.json(apiError(ERROR_CODES.service_unavailable, "The link could not be created.", auth.requestId), 503);
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(captureRequests)
    .where(and(eq(captureRequests.idempotencyKey, parsed.value.idempotencyKey), eq(captureRequests.ownerUserId, auth.user.id)))
    .limit(1);
  if (existing) return c.json({ id: existing.id, reference: existing.referenceCode, link: null, duplicate: true });

  const token = randomToken(32);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parsed.value.expiresInHours * 3_600_000);
  let reference = captureReferenceCode();
  let saved = false;
  for (let attempt = 0; attempt < 3 && !saved; attempt += 1) {
    try {
      await db.insert(captureRequests).values({
        id,
        ownerUserId: auth.user.id,
        referenceCode: reference,
        idempotencyKey: parsed.value.idempotencyKey,
        tokenHash: sha256Hex(token),
        prompt: parsed.value.prompt,
        address: parsed.value.address,
        status: "open",
        expiresAt,
        caseId: opened.row.id,
      });
      saved = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/idempotency_key/.test(message)) {
        const [again] = await db
          .select()
          .from(captureRequests)
          .where(eq(captureRequests.idempotencyKey, parsed.value.idempotencyKey))
          .limit(1);
        if (again && again.ownerUserId === auth.user.id) {
          return c.json({ id: again.id, reference: again.referenceCode, link: null, duplicate: true });
        }
      }
      if (/reference_code/.test(message) && attempt < 2) {
        reference = captureReferenceCode();
        continue;
      }
      console.error(JSON.stringify({ msg: "civic_capture_insert_failed" }));
      return c.json(apiError(ERROR_CODES.service_unavailable, "The link could not be created.", auth.requestId), 503);
    }
  }
  if (!saved) return c.json(apiError(ERROR_CODES.service_unavailable, "The link could not be created.", auth.requestId), 503);

  await recordCivicCaptureEvent({
    caseId: opened.row.id,
    actorId: auth.user.id,
    eventType: "civic.capture.requested",
    requestId: id,
    metadata: { capture_reference: reference },
  });
  return c.json(
    {
      id,
      reference,
      link: `${publicAppOrigin()}/c/${token}`,
      expires_at: expiresAt,
      duplicate: false,
    },
    201,
  );
});

civicRoutes.post("/civic/desk/:reference/captures/:id/revoke", async (c) => {
  const auth = c.get("auth");
  const opened = await deskCase(c);
  if (opened.kind === "unauthorized") return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  if (opened.kind === "missing") return notFound(c);
  const db = getDb();
  const [link] = await db
    .select()
    .from(captureRequests)
    .where(and(eq(captureRequests.id, c.req.param("id") ?? ""), eq(captureRequests.caseId, opened.row.id)))
    .limit(1);
  if (!link) return notFound(c);
  if (link.status !== "open" && link.status !== "capturing") {
    return c.json(apiError(ERROR_CODES.conflict, "This link can no longer be cancelled.", auth.requestId), 409);
  }
  await releaseHold(link.id, auth.user?.id ?? "system:civic-capture");
  await markCaptureCancelled(link.id, auth.user?.id ?? null);
  return c.json({ ok: true, status: "cancelled" });
});

function allowPublicRead(c: Context) {
  const auth = c.get("auth");
  return allowEndpoint(`civic-pub:${auth.ipHash}`, CIVIC_LIMITS.publicReadPerHour, 3_600_000)
    ? null
    : c.json(apiError(ERROR_CODES.rate_limited, "Too many requests. Try again later.", auth.requestId), 429);
}

civicRoutes.get("/civic/public", async (c) => {
  const blocked = allowPublicRead(c);
  if (blocked) return blocked;
  return c.json({ cases: await listPublishedCases() });
});

civicRoutes.get("/civic/public/:reference", async (c) => {
  const blocked = allowPublicRead(c);
  if (blocked) return blocked;
  const page = await presentPublicCase(c.req.param("reference") ?? "", null);
  if (!page) return notFound(c);
  return c.json(page);
});

civicRoutes.get("/civic/public/:reference/versions/:n", async (c) => {
  const blocked = allowPublicRead(c);
  if (blocked) return blocked;
  const n = Number(c.req.param("n"));
  if (!Number.isInteger(n) || n < 1) return notFound(c);
  const page = await presentPublicCase(c.req.param("reference") ?? "", n);
  if (!page) return notFound(c);
  return c.json(page);
});

civicRoutes.post("/civic/public/:reference/appeals", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`civic-appeal:${auth.ipHash}`, CIVIC_LIMITS.appealsPerHour, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many appeals. Try again later.", auth.requestId), 429);
  }
  const parsed = parseCivicAppeal(await c.req.json().catch(() => null));
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, auth.requestId), 400);
  const row = await presentPublicCase(c.req.param("reference") ?? "", null);
  if (!row) return notFound(c);
  const db = getDb();
  const [caseRow] = await db
    .select({ id: civicCases.id, currentPublicVersionId: civicCases.currentPublicVersionId })
    .from(civicCases)
    .where(eq(civicCases.publicReference, row.reference))
    .limit(1);
  if (!caseRow) return notFound(c);
  const [existing] = await db
    .select({ id: civicAppeals.id })
    .from(civicAppeals)
    .where(eq(civicAppeals.idempotencyKey, parsed.value.idempotencyKey))
    .limit(1);
  if (existing) return c.json({ ok: true, duplicate: true });
  try {
    const [appeal] = await db
      .insert(civicAppeals)
      .values({
        caseId: caseRow.id,
        publicVersionId: caseRow.currentPublicVersionId,
        submittedBy: auth.user?.id ?? null,
        reason: parsed.value.reason,
        supportingEvidenceReference: parsed.value.supportingUrl,
        status: "open",
        idempotencyKey: parsed.value.idempotencyKey,
      })
      .returning({ id: civicAppeals.id });
    await db.insert(civicAuditEvents).values({
      caseId: caseRow.id,
      actorId: auth.user?.id ?? null,
      eventType: "civic.appeal.submitted",
      targetType: "civic_appeal",
      targetId: appeal?.id ?? null,
      metadata: { has_url: Boolean(parsed.value.supportingUrl) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/idempotency_key/.test(message)) return c.json({ ok: true, duplicate: true });
    console.error(JSON.stringify({ msg: "civic_appeal_insert_failed" }));
    return c.json(apiError(ERROR_CODES.service_unavailable, "The appeal could not be saved. Try again.", auth.requestId), 503);
  }
  return c.json({ ok: true, duplicate: false }, 201);
});

civicRoutes.post("/civic/desk/:reference/publish", async (c) => {
  const opened = await editorCase(c);
  if (opened.kind === "unauthorized") return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", c.get("auth").requestId), 401);
  if (opened.kind === "missing") return notFound(c);
  if (!canPublishCivicCase({ id: opened.user.id, role: opened.user.role }, publicationGate(opened.row))) {
    return c.json(apiError(ERROR_CODES.conflict, "This case is not ready to publish.", c.get("auth").requestId), 409);
  }
  const parsed = parseCivicPublication(await c.req.json().catch(() => null), "publish");
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, c.get("auth").requestId), 400);
  const written = await writeCivicVersion({
    caseId: opened.row.id,
    actorId: opened.user.id,
    publication: parsed.value,
    mode: "publish",
  });
  return c.json({ reference: opened.row.publicReference, version_number: written.versionNumber, duplicate: written.duplicate }, written.duplicate ? 200 : 201);
});

civicRoutes.post("/civic/desk/:reference/correct", async (c) => {
  const opened = await editorCase(c);
  if (opened.kind === "unauthorized") return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", c.get("auth").requestId), 401);
  if (opened.kind === "missing") return notFound(c);
  if (!canCorrectCivicCase({ id: opened.user.id, role: opened.user.role }, publicationGate(opened.row))) {
    return c.json(apiError(ERROR_CODES.conflict, "This case cannot be corrected yet.", c.get("auth").requestId), 409);
  }
  const parsed = parseCivicPublication(await c.req.json().catch(() => null), "correct");
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, c.get("auth").requestId), 400);
  const written = await writeCivicVersion({
    caseId: opened.row.id,
    actorId: opened.user.id,
    publication: parsed.value,
    mode: "correct",
  });
  return c.json({ reference: opened.row.publicReference, version_number: written.versionNumber, duplicate: written.duplicate }, written.duplicate ? 200 : 201);
});

civicRoutes.post("/civic/desk/:reference/unpublish", async (c) => {
  const opened = await editorCase(c);
  if (opened.kind === "unauthorized") return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", c.get("auth").requestId), 401);
  if (opened.kind === "missing") return notFound(c);
  if (!canUnpublishCivicCase({ id: opened.user.id, role: opened.user.role }, publicationGate(opened.row))) {
    return c.json(apiError(ERROR_CODES.conflict, "This page is not public.", c.get("auth").requestId), 409);
  }
  const parsed = parseCivicUnpublish(await c.req.json().catch(() => null));
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, c.get("auth").requestId), 400);
  const db = getDb();
  await db
    .update(civicCases)
    .set({ publicationState: "unpublished", updatedAt: new Date() })
    .where(eq(civicCases.id, opened.row.id));
  await db.insert(civicAuditEvents).values({
    caseId: opened.row.id,
    actorId: opened.user.id,
    eventType: "civic.case.unpublished",
    targetType: "civic_case",
    targetId: opened.row.id,
    reason: parsed.value.reason.slice(0, 200),
  });
  return c.json({ ok: true, publication_state: "unpublished" });
});

civicRoutes.post("/civic/desk/:reference/appeals/:id/resolve", async (c) => {
  const opened = await editorCase(c);
  if (opened.kind === "unauthorized") return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", c.get("auth").requestId), 401);
  if (opened.kind === "missing") return notFound(c);
  const parsed = parseCivicResolution(await c.req.json().catch(() => null));
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, c.get("auth").requestId), 400);
  const db = getDb();
  const [appeal] = await db
    .update(civicAppeals)
    .set({
      status: parsed.value.status,
      resolution: parsed.value.resolution,
      assignedEditorId: opened.user.id,
      resolvedAt: new Date(),
    })
    .where(and(eq(civicAppeals.id, c.req.param("id") ?? ""), eq(civicAppeals.caseId, opened.row.id), eq(civicAppeals.status, "open")))
    .returning({ id: civicAppeals.id });
  if (!appeal) return c.json(apiError(ERROR_CODES.conflict, "This appeal is no longer open.", c.get("auth").requestId), 409);
  await db.insert(civicAuditEvents).values({
    caseId: opened.row.id,
    actorId: opened.user.id,
    eventType: "civic.appeal.resolved",
    targetType: "civic_appeal",
    targetId: appeal.id,
    metadata: { status: parsed.value.status },
  });
  return c.json({ ok: true, status: parsed.value.status });
});
