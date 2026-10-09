import { ERROR_CODES } from "@oyokometa/config";
import { z } from "zod";

export { canonicalJson, hammingHex } from "./canonical.js";

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ApiErrorBody = {
  error: { code: string; message: string; request_id: string };
};

export function apiError(
  code: string,
  message: string,
  requestId: string,
): ApiErrorBody {
  return { error: { code, message, request_id: requestId } };
}

export const MAGIC: Record<string, { mime: string; ext: string }> = {
  ffd8ff: { mime: "image/jpeg", ext: "jpg" },
  "89504e47": { mime: "image/png", ext: "png" },
  "52494646": { mime: "image/webp", ext: "webp" },
  "49492a00": { mime: "image/tiff", ext: "tiff" },
  "4d4d002a": { mime: "image/tiff", ext: "tiff" },
};

export function detectMagic(buf: Uint8Array): {
  mime: string | null;
  mismatchHint: boolean;
} {
  if (buf.length < 12) return { mime: null, mismatchHint: false };
  const hex8 = [...buf.slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex8.startsWith("ffd8ff")) return { mime: "image/jpeg", mismatchHint: false };
  if (hex8 === "89504e47") return { mime: "image/png", mismatchHint: false };
  if (hex8 === "49492a00" || hex8 === "4d4d002a") return { mime: "image/tiff", mismatchHint: false };
  const riff = String.fromCharCode(...buf.slice(0, 4));
  const webp = String.fromCharCode(...buf.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return { mime: "image/webp", mismatchHint: false };
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(...buf.slice(8, 12));
    if (brand.startsWith("heic") || brand.startsWith("mif1") || brand.startsWith("msf1") || brand === "heix") {
      return { mime: "image/heic", mismatchHint: false };
    }
  }
  return { mime: null, mismatchHint: false };
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/tiff":
      return "tiff";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "bin";
  }
}

export const declarationSchema = z.object({
  creator_name: z.string().max(200).optional(),
  creation_date: z.string().optional(),
  device_or_source: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
  ai_use: z.enum(["none", "ai_assisted", "ai_generated"]).optional(),
  licence_note: z.string().max(500).optional(),
});

export type Declarations = z.infer<typeof declarationSchema>;

export type AnalysisTier = "quick" | "deep";

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
