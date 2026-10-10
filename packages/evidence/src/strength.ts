import type { Strength } from "./types.js";

/** Strength is assigned by signal type in server-side config, not by the worker (EV-2). */
export const SIGNAL_STRENGTH: Record<string, Strength> = {
  c2pa_verified_trusted: "very_strong",
  c2pa_valid_untrusted: "strong",
  c2pa_invalid: "strong",
  c2pa_not_detected: "none",
  c2pa_unable: "none",
  camera_make_model: "strong",
  camera_lens: "moderate",
  camera_exposure: "moderate",
  maker_notes: "strong",
  quant_table_camera_match: "strong",
  iptc_digital_source_type: "strong",
  generator_string: "strong",
  watermark_hit: "strong",
  software_trace: "moderate",
  screenshot_indicator: "strong",
  scanner_indicator: "strong",
  thumbnail_mismatch: "moderate",
  timestamp_anomaly: "moderate",
  extension_mismatch: "weak",
  missing_exif: "none",
  missing_c2pa: "none",
  detector_strong: "strong",
  detector_weak: "weak",
  detector_none: "none",
  face_manipulation: "strong",
  trailing_data: "weak",
  double_compression: "moderate",
};

export function strengthFor(signal: string): Strength {
  return SIGNAL_STRENGTH[signal] ?? "moderate";
}
