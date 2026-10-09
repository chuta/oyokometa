import { eq } from "drizzle-orm";
import {
  getDb,
  analysisJobs,
  assets,
  evidenceItems,
  rawOutputs,
  c2paResults,
  findings,
  config,
  captureHold,
  releaseHold,
} from "@oyokometa/db";
import { buildFindingsObject, type EvidenceItem } from "@oyokometa/evidence";
import { PROCESSED_BY_TEMPLATE, RULESET_VERSION } from "@oyokometa/config";
import { detectMagic } from "@oyokometa/shared";
import { readBlob, writeBlob, removeBlob } from "./blob.js";
import { sha256, perceptualHash } from "./analyzers/hash.js";
import { decodeImage } from "./analyzers/decode.js";
import { extractMetadata, METADATA_PRODUCER } from "./analyzers/metadata.js";
import { buildTimeline, TIMESTAMP_PRODUCER } from "./analyzers/timestamps.js";
import { analyzeStructure, STRUCTURE_PRODUCER } from "./analyzers/structure.js";
import { analyzeC2pa, C2PA_PRODUCER } from "./analyzers/c2pa.js";
import { detectorsForTier, mapScore, DETECTOR_PRODUCER } from "./analyzers/detectors.js";
import { scanMalware } from "./analyzers/malware.js";
import { ev } from "./evidence-factory.js";

const DECODE_PRODUCER = "decode-worker@1.0.0";
const HASH_PRODUCER = "hash-worker@1.0.0";

function failCode(err: unknown): { code: string; message: string } {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    return { code, message: (err as Error).message };
  }
  const msg = err instanceof Error ? err.message : "service unavailable";
  if (/unsupported|heif|input/i.test(msg)) return { code: "corrupt", message: msg };
  if (/timeout/i.test(msg)) return { code: "timeout", message: msg };
  return { code: "service_unavailable", message: msg };
}

async function setStage(jobId: string, stage: string, status = "running") {
  const db = getDb();
  await db
    .update(analysisJobs)
    .set({ stage, status, updatedAt: new Date() })
    .where(eq(analysisJobs.id, jobId));
}

export async function runPipeline(jobId: string): Promise<void> {
  const db = getDb();
  const [job] = await db.select().from(analysisJobs).where(eq(analysisJobs.id, jobId)).limit(1);
  if (!job || job.deletedAt) return;
  const [asset] = await db.select().from(assets).where(eq(assets.id, job.assetId)).limit(1);
  if (!asset) {
    await db
      .update(analysisJobs)
      .set({ status: "failed", errorCode: "not_found", errorMessage: "asset missing" })
      .where(eq(analysisJobs.id, jobId));
    return;
  }

  const items: EvidenceItem[] = [];
  const analyzerVersions: Record<string, string> = {
    hash: HASH_PRODUCER,
    decode: DECODE_PRODUCER,
    metadata: METADATA_PRODUCER,
    timestamps: TIMESTAMP_PRODUCER,
    structure: STRUCTURE_PRODUCER,
    c2pa: C2PA_PRODUCER,
    detector: DETECTOR_PRODUCER,
  };

  try {
    await setStage(jobId, "reading");
    const buf = await readBlob(asset.storageKey);

    const malware = await scanMalware(buf);
    if (malware === "flagged") {
      throw Object.assign(new Error("malware flagged"), { code: "malware_flagged" });
    }

    const magic = detectMagic(buf);
    if (!magic.mime) {
      throw Object.assign(new Error("unsupported type"), { code: "unsupported_type" });
    }
    const declared = (asset.declaredFilename ?? "").toLowerCase();
    if (declared && magic.mime === "image/jpeg" && !/\.jpe?g$/i.test(declared)) {
      items.push(
        ev({
          category: "structure",
          signal: "extension_mismatch",
          value: `extension does not match ${magic.mime}`,
          source: "magic-bytes",
          tier: "detected",
          producer: HASH_PRODUCER,
          raw_ref: "raw/magic",
        }),
      );
    }

    await setStage(jobId, "fingerprinting");
    const decode = await Promise.race([
      decodeImage(buf),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "timeout" })), 30_000),
      ),
    ]);

    const hash = sha256(buf);
    const phash = await perceptualHash(buf);

    await db
      .update(assets)
      .set({
        sha256: hash,
        phash,
        detectedMime: magic.mime,
        byteSize: buf.length,
        width: decode.width,
        height: decode.height,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, asset.id));

    const previewKey = `previews/${asset.id}.jpg`;
    await writeBlob(previewKey, decode.previewJpeg, "image/jpeg");
    await db.update(assets).set({ previewKey }).where(eq(assets.id, asset.id));

    await setStage(jobId, "metadata");
    const meta = await extractMetadata(buf);
    analyzerVersions.metadata = meta.producer;
    await db.insert(rawOutputs).values({
      jobId,
      producer: meta.producer,
      payload: meta.raw as Record<string, unknown>,
    });

    if (!meta.hasExif) {
      items.push(
        ev({
          category: "metadata",
          signal: "missing_exif",
          value: "no EXIF camera block",
          source: "ExifTool",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json",
        }),
      );
    }
    if (meta.make || meta.model) {
      items.push(
        ev({
          category: "metadata",
          signal: "camera_make_model",
          value: `${meta.make ?? ""} ${meta.model ?? ""}`.trim(),
          source: "EXIF:Make, EXIF:Model",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json#/EXIF/Model",
        }),
      );
    }
    if (meta.lens) {
      items.push(
        ev({
          category: "metadata",
          signal: "camera_lens",
          value: meta.lens,
          source: "EXIF:LensModel",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json#/EXIF/LensModel",
        }),
      );
    }
    const exposure = (meta.raw["EXIF:ExposureTime"] ?? meta.raw["ExposureTime"]) as string | undefined;
    if (exposure) {
      items.push(
        ev({
          category: "metadata",
          signal: "camera_exposure",
          value: String(exposure),
          source: "EXIF:ExposureTime",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json#/EXIF/ExposureTime",
        }),
      );
    }
    if (meta.raw["EXIF:MakerNote"] || meta.raw["MakerNote"]) {
      items.push(
        ev({
          category: "metadata",
          signal: "maker_notes",
          value: "maker notes present",
          source: "EXIF:MakerNote",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json#/EXIF/MakerNote",
        }),
      );
    }
    if (meta.software || meta.creatorTool) {
      const name = meta.software ?? meta.creatorTool ?? "unknown software";
      items.push(
        ev({
          category: "metadata",
          signal: "software_trace",
          value: PROCESSED_BY_TEMPLATE(name),
          source: "EXIF:Software, XMP:CreatorTool",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json#/EXIF/Software",
        }),
      );
    }
    if (meta.digitalSourceType) {
      items.push(
        ev({
          category: "metadata",
          signal: "iptc_digital_source_type",
          value: meta.digitalSourceType,
          source: "IPTC:DigitalSourceType",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json#/IPTC/DigitalSourceType",
        }),
      );
    }
    for (const g of meta.generatorStrings) {
      items.push(
        ev({
          category: "metadata",
          signal: "generator_string",
          value: g,
          source: "XMP/EXIF/PNG text",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json",
        }),
      );
    }
    if (meta.screenshotHint) {
      items.push(
        ev({
          category: "metadata",
          signal: "screenshot_indicator",
          value: "screenshot metadata",
          source: "metadata",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json",
        }),
      );
    }
    if (meta.scannerHint) {
      items.push(
        ev({
          category: "metadata",
          signal: "scanner_indicator",
          value: "scanner make or software",
          source: "EXIF:Make",
          tier: "detected",
          producer: meta.producer,
          raw_ref: "raw/exiftool.json",
        }),
      );
    }
    if (meta.thumbnailMismatch) {
      items.push(
        ev({
          category: "pixel",
          signal: "thumbnail_mismatch",
          value: "embedded thumbnail differs from image",
          source: "EXIF thumbnail vs primary frame",
          tier: "detected",
          producer: DECODE_PRODUCER,
          raw_ref: "raw/decode",
        }),
      );
    }

    const timeline = buildTimeline(meta.timestamps, job.createdAt.toISOString());
    for (const t of timeline.filter((x) => x.anomaly)) {
      items.push(
        ev({
          category: "metadata",
          signal: "timestamp_anomaly",
          value: `${t.field}: ${t.anomaly}`,
          source: t.field,
          tier: "inferred",
          producer: TIMESTAMP_PRODUCER,
          raw_ref: "raw/exiftool.json",
        }),
      );
    }

    await setStage(jobId, "credentials");
    const c2pa = await analyzeC2pa(buf);
    await db.insert(c2paResults).values({
      jobId,
      state: c2pa.state,
      signer: c2pa.signer,
      claimGenerator: c2pa.claim_generator,
      actions: c2pa.actions as object,
      ingredients: c2pa.ingredients as object,
      aiAssertion: c2pa.ai_assertion,
      failureReason: c2pa.failure_reason,
      trustListVersion: c2pa.trust_list_version,
    });
    if (c2pa.state === "not_detected") {
      items.push(
        ev({
          category: "provenance",
          signal: "missing_c2pa",
          value: "no manifest found",
          source: "c2pa-sdk",
          tier: "detected",
          producer: C2PA_PRODUCER,
          raw_ref: "raw/c2pa.json",
        }),
      );
    } else if (c2pa.state === "verified_and_trusted") {
      items.push(
        ev({
          category: "provenance",
          signal: "c2pa_verified_trusted",
          value: `${c2pa.signer ?? ""} ${c2pa.ai_assertion ?? ""} ${JSON.stringify(c2pa.actions)}`,
          source: "c2pa-sdk",
          tier: "verified",
          producer: C2PA_PRODUCER,
          raw_ref: "raw/c2pa.json",
        }),
      );
    } else if (c2pa.state === "valid_signer_not_recognised") {
      items.push(
        ev({
          category: "provenance",
          signal: "c2pa_valid_untrusted",
          value: c2pa.signer ?? "unrecognised signer",
          source: "c2pa-sdk",
          tier: "detected",
          producer: C2PA_PRODUCER,
          raw_ref: "raw/c2pa.json",
        }),
      );
    } else if (c2pa.state === "invalid") {
      items.push(
        ev({
          category: "provenance",
          signal: "c2pa_invalid",
          value: c2pa.failure_reason ?? "invalid",
          source: "c2pa-sdk",
          tier: "detected",
          producer: C2PA_PRODUCER,
          raw_ref: "raw/c2pa.json",
        }),
      );
    } else {
      items.push(
        ev({
          category: "provenance",
          signal: "c2pa_unable",
          value: c2pa.failure_reason ?? "unable to verify",
          source: "c2pa-sdk",
          tier: "detected",
          producer: C2PA_PRODUCER,
          raw_ref: "raw/c2pa.json",
        }),
      );
    }

    await setStage(jobId, "image_characteristics");
    const structure = analyzeStructure(buf, magic.mime);
    await db.insert(rawOutputs).values({
      jobId,
      producer: STRUCTURE_PRODUCER,
      payload: structure as unknown as Record<string, unknown>,
    });
    if (structure.doubleCompression) {
      items.push(
        ev({
          category: "structure",
          signal: "double_compression",
          value: "multiple quantisation tables",
          source: "JPEG DQT",
          tier: "detected",
          producer: STRUCTURE_PRODUCER,
          raw_ref: "raw/structure.json",
        }),
      );
    }
    if (structure.trailingBytes > 0) {
      items.push(
        ev({
          category: "structure",
          signal: "trailing_data",
          value: `${structure.trailingBytes} bytes after end marker`,
          source: "file structure",
          tier: "detected",
          producer: STRUCTURE_PRODUCER,
          raw_ref: "raw/structure.json",
        }),
      );
    }

    const [gate] = await db.select().from(config).where(eq(config.key, "ai_labels_enabled")).limit(1);
    const aiLabelsEnabled = gate?.value === true || gate?.value === "true";

    if (job.tier === "deep" || job.tier === "quick") {
      const dets = detectorsForTier(job.tier === "deep" ? "deep" : "quick");
      for (const d of dets) {
        const r = await d.analyze(buf);
        await db.insert(rawOutputs).values({
          jobId,
          producer: `${r.model_id}@${r.model_version}`,
          payload: r as unknown as Record<string, unknown>,
        });
        const band = mapScore(r.raw_score);
        if (band !== "none") {
          items.push(
            ev({
              category: "model",
              signal: band === "strong" ? "detector_strong" : "detector_weak",
              value: band,
              source: "detector-adapter",
              tier: "inferred",
              producer: `${r.model_id}@${r.model_version}`,
              raw_ref: "raw/detector.json",
            }),
          );
        }
      }
    }

    await setStage(jobId, "report");
    const findingsObj = buildFindingsObject({
      evidence_id: hash,
      items,
      identity: {
        file_name: asset.declaredFilename,
        detected_type: magic.mime,
        byte_size: buf.length,
        width: decode.width,
        height: decode.height,
        aspect_ratio:
          decode.width && decode.height ? `${decode.width}:${decode.height}` : null,
        colour_space: decode.space,
        bit_depth: null,
        icc_profile: decode.iccName,
        orientation: null,
        sha256: hash,
        phash,
        multi_frame_note: decode.primaryFrameNote,
      },
      timeline,
      c2pa: {
        state: c2pa.state,
        signer: c2pa.signer,
        claim_generator: c2pa.claim_generator,
        signed_at: c2pa.signed_at,
        actions: c2pa.actions,
        ingredients: c2pa.ingredients,
        ai_assertion: c2pa.ai_assertion,
        failure_reason: c2pa.failure_reason,
        trust_list_version: c2pa.trust_list_version,
      },
      acquisition_time_utc: job.createdAt.toISOString(),
      analyzer_versions: analyzerVersions,
      trust_list_version: c2pa.trust_list_version,
      tier_computed: job.tier === "deep" ? "deep" : "quick",
      gps_present: Boolean(meta.gps),
      ai_labels_enabled: Boolean(aiLabelsEnabled),
    });

    if (items.length) {
      await db.insert(evidenceItems).values(
        items.map((i) => ({
          id: i.id,
          jobId,
          category: i.category,
          signal: i.signal,
          value: i.value,
          source: i.source,
          tier: i.tier,
          strength: i.strength,
          producer: i.producer,
          rawRef: i.raw_ref,
        })),
      );
    }

    const cats = Object.values(findingsObj.categories);
    await db.insert(findings).values(
      cats.map((f) => ({
        jobId,
        category: f.category,
        classification: f.classification,
        confidence: String(f.confidence),
        ruleId: f.rule_id,
        evidenceIds: f.evidence_ids,
        summary: f.summary,
      })),
    );

    await db
      .update(analysisJobs)
      .set({
        status: "completed",
        stage: "report",
        findings: findingsObj as unknown as Record<string, unknown>,
        analyzerVersions,
        trustListVersion: c2pa.trust_list_version,
        rulesetVersion: RULESET_VERSION,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(analysisJobs.id, jobId));
    if (job.creditHoldId) await captureHold(jobId, "worker");
  } catch (err) {
    const { code, message } = failCode(err);
    await db
      .update(analysisJobs)
      .set({
        status: "failed",
        errorCode: code,
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(analysisJobs.id, jobId));
    if (job.creditHoldId) await releaseHold(jobId, "worker");
    if (code === "malware_flagged") {
      await removeBlob(asset.storageKey).catch(() => undefined);
    }
  }
}
