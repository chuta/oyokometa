import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import exifr from "exifr";

const execFileAsync = promisify(execFile);
export const METADATA_PRODUCER = "metadata-worker@1.0.0";

export type MetadataResult = {
  raw: Record<string, unknown>;
  producer: string;
  gps: { lat: number; lng: number } | null;
  make?: string;
  model?: string;
  software?: string;
  lens?: string;
  creatorTool?: string;
  digitalSourceType?: string;
  generatorStrings: string[];
  timestamps: { field: string; value: string; offset?: string }[];
  hasExif: boolean;
  screenshotHint: boolean;
  scannerHint: boolean;
  thumbnailMismatch: boolean;
};

export async function extractMetadata(buf: Buffer): Promise<MetadataResult> {
  let raw: Record<string, unknown> = {};
  let producer = `${METADATA_PRODUCER}+exifr`;
  const tmp = join(tmpdir(), `okm-${Date.now()}.img`);
  try {
    await writeFile(tmp, buf);
    const { stdout } = await execFileAsync(
      "exiftool",
      ["-json", "-G", "-struct", "-n", "-fast2", tmp],
      { timeout: 15_000, maxBuffer: 8 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as Record<string, unknown>[];
    raw = parsed[0] ?? {};
    producer = `${METADATA_PRODUCER}+exiftool`;
  } catch {
    try {
      raw = ((await exifr.parse(buf, { tiff: true, xmp: true, icc: true, iptc: true, mergeOutput: true })) ??
        {}) as Record<string, unknown>;
    } catch {
      raw = {};
    }
  } finally {
    await unlink(tmp).catch(() => undefined);
  }

  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v != null && v !== "") return String(v);
    }
    return undefined;
  };

  const lat = Number(get("EXIF:GPSLatitude", "GPSLatitude", "latitude"));
  const lng = Number(get("EXIF:GPSLongitude", "GPSLongitude", "longitude"));
  const gps = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  const software = get("EXIF:Software", "Software", "XMP:CreatorTool", "PNG:Software");
  const dst = get(
    "IPTC:DigitalSourceType",
    "XMP-iptcExt:DigitalSourceType",
    "digitalSourceType",
  );
  const generatorStrings: string[] = [];
  for (const [k, v] of Object.entries(raw)) {
    const s = String(v);
    if (/midjourney|dall-e|stable diffusion|firefly|chatgpt|sora|imagen|synthetic/i.test(s)) {
      generatorStrings.push(`${k}=${s.slice(0, 200)}`);
    }
  }

  const timestamps: MetadataResult["timestamps"] = [];
  const timeFields = [
    "EXIF:DateTimeOriginal",
    "EXIF:CreateDate",
    "EXIF:ModifyDate",
    "XMP:CreateDate",
    "XMP:ModifyDate",
    "PNG:CreationTime",
    "DateTimeOriginal",
    "CreateDate",
    "ModifyDate",
  ];
  for (const f of timeFields) {
    const v = get(f);
    if (v) timestamps.push({ field: f, value: v, offset: get(f.replace("DateTime", "OffsetTime"), "EXIF:OffsetTimeOriginal") });
  }

  const make = get("EXIF:Make", "Make");
  const model = get("EXIF:Model", "Model");

  return {
    raw,
    producer,
    gps,
    make,
    model,
    software,
    lens: get("EXIF:LensModel", "LensModel"),
    creatorTool: get("XMP:CreatorTool", "CreatorTool"),
    digitalSourceType: dst,
    generatorStrings,
    timestamps,
    hasExif: Boolean(make || model || get("EXIF:DateTimeOriginal", "DateTimeOriginal")),
    screenshotHint: /screenshot|screen capture/i.test(JSON.stringify(raw)),
    scannerHint: /scan|scanner|canooscan|epson/i.test(`${make} ${model} ${software}`),
    thumbnailMismatch: false,
  };
}
