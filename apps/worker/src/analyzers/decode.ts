import sharp from "sharp";
import { LIMITS } from "@oyokometa/config";

export type DecodeResult = {
  width: number;
  height: number;
  channels: number;
  space: string | null;
  hasAlpha: boolean;
  pages: number;
  primaryFrameNote: string | null;
  previewJpeg: Buffer;
  iccName: string | null;
};

export async function decodeImage(buf: Buffer): Promise<DecodeResult> {
  const img = sharp(buf, {
    failOn: "none",
    limitInputPixels: LIMITS.maxMegapixels * 1_000_000,
    pages: -1,
  });
  const meta = await img.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width * height > LIMITS.maxMegapixels * 1_000_000) {
    throw Object.assign(new Error("too_large"), { code: "too_large" });
  }
  if (Math.max(width, height) > LIMITS.maxLongestSidePx) {
    throw Object.assign(new Error("too_large"), { code: "too_large" });
  }
  const pages = meta.pages ?? 1;
  const previewJpeg = await sharp(buf, { failOn: "none", page: 0 })
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  return {
    width,
    height,
    channels: meta.channels ?? 0,
    space: meta.space ?? null,
    hasAlpha: Boolean(meta.hasAlpha),
    pages,
    primaryFrameNote:
      pages > 1
        ? "Multi-frame file: only the primary frame was analyzed; other frames were not analyzed."
        : null,
    previewJpeg,
    iccName: meta.icc ? "embedded" : null,
  };
}
