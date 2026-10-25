import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  CAPTURE_CAMERA_LINE,
  CAPTURE_LOCATION_LINE,
  CAPTURE_SUBLINE,
  captureStatement,
} from "@oyokometa/config";
import { sha256Hex } from "./crypto.js";

export const CAPTURE_ACTION = "capture_request";
export const NONCE_TTL_MS = 10 * 60 * 1000;
const CAPTURE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function captureReferenceCode() {
  const bytes = randomBytes(8);
  let out = "OKM-C";
  for (const b of bytes) out += CAPTURE_ALPHABET[b % CAPTURE_ALPHABET.length];
  return out;
}

/** A civic case link is free. Every other capture link holds credits. */
export function captureRequiresHold(caseId: string | null | undefined) {
  return typeof caseId !== "string" || caseId.length === 0;
}
export const DEFAULT_EXPIRY_HOURS = 72;
export const PROCESSING_STALE_MS = 2 * 60 * 1000;
const KEY_RE = /^[A-Za-z0-9_-]{8,80}$/;

export type CaptureCreate = {
  prompt: string;
  address: string | null;
  expiresInHours: number;
  expectedCredits: number;
  idempotencyKey: string;
};

export function parseCaptureCreate(body: unknown): { ok: true; value: CaptureCreate } | { ok: false; message: string } {
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
  if (prompt.length < 3) return { ok: false, message: "Describe the photo you need, in a short sentence." };
  if (prompt.length > 500) return { ok: false, message: "Keep the request under 500 characters." };
  const addressRaw = typeof rec.address === "string" ? rec.address.trim() : "";
  if (addressRaw.length > 200) return { ok: false, message: "Keep the address under 200 characters." };
  const hours = rec.expires_in_hours === undefined ? DEFAULT_EXPIRY_HOURS : rec.expires_in_hours;
  if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 1 || hours > 168) {
    return { ok: false, message: "Choose an expiry between 1 and 168 hours." };
  }
  const key = typeof rec.idempotency_key === "string" ? rec.idempotency_key : "";
  if (!KEY_RE.test(key)) return { ok: false, message: "Refresh the page and create the link again." };
  if (typeof rec.expected_credits !== "number") {
    return { ok: false, message: "Confirm the price before creating the link." };
  }
  return {
    ok: true,
    value: {
      prompt,
      address: addressRaw || null,
      expiresInHours: hours,
      expectedCredits: rec.expected_credits,
      idempotencyKey: key,
    },
  };
}

export type Gps = { latitude: number; longitude: number; accuracyM: number };

export function parseGps(input: {
  latitude: unknown;
  longitude: unknown;
  accuracyM: unknown;
}): { ok: true; value: Gps | null } | { ok: false; message: string } {
  const blank = (value: unknown) => value == null || (typeof value === "string" && value.trim() === "");
  if (blank(input.latitude) && blank(input.longitude) && blank(input.accuracyM)) {
    return { ok: true, value: null };
  }
  if (blank(input.latitude) || blank(input.longitude) || blank(input.accuracyM)) {
    return { ok: false, message: "Location needs a latitude, longitude, and accuracy." };
  }
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const accuracyM = Number(input.accuracyM);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracyM)) {
    return { ok: false, message: "Location needs a latitude, longitude, and accuracy." };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || accuracyM < 0 || accuracyM > 100_000) {
    return { ok: false, message: "That location could not be read." };
  }
  return { ok: true, value: { latitude, longitude, accuracyM } };
}

function hashEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** A used or expired nonce cannot submit another frame. */
export function nonceMatches(storedHash: string, nonce: string, expiresAt: Date, now = new Date()) {
  if (expiresAt.getTime() <= now.getTime()) return false;
  if (nonce.length < 8 || nonce.length > 200) return false;
  return hashEquals(storedHash, sha256Hex(nonce));
}

export function requestCanAcceptFrame(status: string, updatedAt: Date, now = Date.now()) {
  if (status === "capturing") return true;
  return status === "processing" && now - updatedAt.getTime() > PROCESSING_STALE_MS;
}

export type DeviceReport = {
  cameraLabel: string | null;
  facingMode: "user" | "environment" | null;
  platform: string | null;
  platformVersion: string | null;
  model: string | null;
  mobile: boolean | null;
};

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
  return text || null;
}

/** Keeps only the fields the page is allowed to assert. A bad payload is ignored. */
export function parseDeviceReport(raw: unknown): DeviceReport | null {
  if (typeof raw === "string") {
    if (raw.length > 2000) return null;
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const report: DeviceReport = {
    cameraLabel: clip(rec.camera_label, 160),
    facingMode: rec.facing_mode === "user" || rec.facing_mode === "environment" ? rec.facing_mode : null,
    platform: clip(rec.platform, 40),
    platformVersion: clip(rec.platform_version, 40),
    model: clip(rec.model, 80),
    mobile: typeof rec.mobile === "boolean" ? rec.mobile : null,
  };
  if (!report.cameraLabel && !report.facingMode && !report.platform && !report.platformVersion && !report.model && report.mobile == null) {
    return null;
  }
  return report;
}

/** A sentence for the record page. The signed fields stay separate from this wording. */
export function captureDeviceLine(device: DeviceReport | null) {
  if (!device) return null;
  const camera =
    device.facingMode === "environment" ? "a back camera" : device.facingMode === "user" ? "a front camera" : device.cameraLabel ? "a camera" : null;
  const named = camera && device.cameraLabel ? `${camera} (${device.cameraLabel})` : camera;
  const system = [device.platform, device.platformVersion].filter(Boolean).join(" ");
  const hardware = [device.model, system].filter(Boolean);
  if (named && hardware.length) return `The page reported ${named} on ${hardware.join(", ")}.`;
  if (named) return `The page reported ${named}.`;
  if (hardware.length) return `The page reported ${hardware.join(", ")}.`;
  return null;
}

export function captureBlock(input: {
  receivedAt: string;
  cameraReported: boolean;
  location: Gps | null;
  userAgent: string | null;
  device?: DeviceReport | null;
}) {
  const device = input.device ?? null;
  return {
    received_at: input.receivedAt,
    statement: captureStatement(input.receivedAt),
    subline: CAPTURE_SUBLINE,
    camera_reported: input.cameraReported,
    camera_line: input.cameraReported ? CAPTURE_CAMERA_LINE : null,
    location_reported: Boolean(input.location),
    location_line: input.location ? CAPTURE_LOCATION_LINE : null,
    latitude: input.location?.latitude ?? null,
    longitude: input.location?.longitude ?? null,
    accuracy_m: input.location?.accuracyM ?? null,
    user_agent: input.userAgent,
    device: device
      ? {
          camera_label: device.cameraLabel,
          facing_mode: device.facingMode,
          platform: device.platform,
          platform_version: device.platformVersion,
          model: device.model,
          mobile: device.mobile,
        }
      : null,
  };
}
