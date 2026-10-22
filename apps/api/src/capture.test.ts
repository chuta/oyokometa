import { FORBIDDEN_COPY, captureStatement, formatCaptureTime } from "@oyokometa/config";
import { describe, expect, it } from "vitest";
import { captureBlock, captureDeviceLine, nonceMatches, parseCaptureCreate, parseDeviceReport, parseGps, requestCanAcceptFrame } from "./capture.js";
import { sha256Hex } from "./crypto.js";

describe("parseCaptureCreate", () => {
  const valid = {
    prompt: "Photograph the front of the car.",
    idempotency_key: "idem-key-1",
    expected_credits: 25,
  };

  it("accepts a prompt and applies the default expiry", () => {
    const parsed = parseCaptureCreate(valid);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.expiresInHours).toBe(72);
    expect(parsed.value.address).toBeNull();
    expect(parsed.value.expectedCredits).toBe(25);
  });

  it("rejects a short prompt, a bad expiry, and a missing price", () => {
    expect(parseCaptureCreate({ ...valid, prompt: "Hi" }).ok).toBe(false);
    expect(parseCaptureCreate({ ...valid, expires_in_hours: 0 }).ok).toBe(false);
    expect(parseCaptureCreate({ ...valid, expires_in_hours: 200 }).ok).toBe(false);
    expect(parseCaptureCreate({ ...valid, expected_credits: "25" }).ok).toBe(false);
    expect(parseCaptureCreate({ ...valid, idempotency_key: "short" }).ok).toBe(false);
  });
});

describe("parseGps", () => {
  it("treats an empty location as omitted", () => {
    expect(parseGps({ latitude: "", longitude: "", accuracyM: "" })).toEqual({ ok: true, value: null });
  });

  it("rejects a partial or impossible location", () => {
    expect(parseGps({ latitude: "6.5", longitude: "", accuracyM: "10" }).ok).toBe(false);
    expect(parseGps({ latitude: "95", longitude: "3", accuracyM: "10" }).ok).toBe(false);
  });

  it("keeps a consented reading", () => {
    expect(parseGps({ latitude: "6.5", longitude: "3.4", accuracyM: "12" })).toEqual({
      ok: true,
      value: { latitude: 6.5, longitude: 3.4, accuracyM: 12 },
    });
  });
});

describe("capture wording", () => {
  it("states the server time and the file match, and leaves camera and location out of that sentence", () => {
    const statement = captureStatement("2026-10-20T14:32:00.000Z");
    expect(formatCaptureTime("2026-10-20T14:32:00.000Z")).toBe("14:32 UTC on 20 Oct 2026");
    expect(statement).toBe(
      "This photo was received through an Oyokometa capture session at 14:32 UTC on 20 Oct 2026. The file matches the signed record.",
    );
    expect(statement.toLowerCase()).not.toContain("camera");
    expect(statement.toLowerCase()).not.toContain("location");
    for (const word of FORBIDDEN_COPY) expect(statement.toLowerCase()).not.toContain(word);
  });

  it("keeps the camera and location lines beside the verified sentence", () => {
    const block = captureBlock({
      receivedAt: "2026-10-20T14:32:00.000Z",
      cameraReported: true,
      location: { latitude: 6.5, longitude: 3.4, accuracyM: 12 },
      userAgent: "Test",
    });
    expect(block.statement).not.toContain(block.camera_line ?? "live camera");
    expect(block.subline).toContain("unchanged since receipt");
    expect(block.camera_line).toBe("The session reported a live camera.");
    expect(block.location_line).toBe("The device reported a location.");
    expect(block.subline.toLowerCase()).not.toContain("authentic");
  });
});

describe("capture device report", () => {
  it("keeps the camera name, facing, and model, and drops anything else", () => {
    const parsed = parseDeviceReport({
      camera_label: "  camera2 0, facing back ",
      facing_mode: "environment",
      platform: "Android",
      platform_version: "14",
      model: "Pixel 7",
      mobile: true,
      serial: "should-not-stick",
    });
    expect(parsed).toEqual({
      cameraLabel: "camera2 0, facing back",
      facingMode: "environment",
      platform: "Android",
      platformVersion: "14",
      model: "Pixel 7",
      mobile: true,
    });
    expect(captureDeviceLine(parsed)).toBe(
      "The page reported a back camera (camera2 0, facing back) on Pixel 7, Android 14.",
    );
  });

  it("ignores a report that names no camera and no device", () => {
    expect(parseDeviceReport("not-json")).toBeNull();
    expect(parseDeviceReport({ facing_mode: "left" })).toBeNull();
    expect(captureDeviceLine(null)).toBeNull();
  });
});

describe("capture session", () => {
  it("rejects a replayed, expired, or wrong nonce", () => {
    const nonce = "nonce-value-1";
    const hash = sha256Hex(nonce);
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 1000);
    expect(nonceMatches(hash, nonce, future)).toBe(true);
    expect(nonceMatches(hash, nonce, past)).toBe(false);
    expect(nonceMatches(hash, "other-nonce", future)).toBe(false);
    expect(nonceMatches(hash, "short", future)).toBe(false);
  });

  it("accepts a frame only while the session is open, or after a stuck submit", () => {
    const now = Date.now();
    expect(requestCanAcceptFrame("capturing", new Date(now))).toBe(true);
    expect(requestCanAcceptFrame("open", new Date(now))).toBe(false);
    expect(requestCanAcceptFrame("completed", new Date(now))).toBe(false);
    expect(requestCanAcceptFrame("refused", new Date(now))).toBe(false);
    expect(requestCanAcceptFrame("processing", new Date(now - 10_000), now)).toBe(false);
    expect(requestCanAcceptFrame("processing", new Date(now - 130_000), now)).toBe(true);
  });
});
