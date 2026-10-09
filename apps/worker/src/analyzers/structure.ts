export const STRUCTURE_PRODUCER = "structure-worker@1.0.0";

export type StructureResult = {
  quantTables: number[][];
  chroma: string | null;
  trailingBytes: number;
  pngChunks: string[];
  doubleCompression: boolean;
};

export function analyzeStructure(buf: Buffer, mime: string | null): StructureResult {
  if (mime === "image/jpeg") return jpeg(buf);
  if (mime === "image/png") return png(buf);
  return { quantTables: [], chroma: null, trailingBytes: 0, pngChunks: [], doubleCompression: false };
}

function jpeg(buf: Buffer): StructureResult {
  const tables: number[][] = [];
  let i = 0;
  let eoi = -1;
  let sof = false;
  let chroma: string | null = null;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xd9) {
      eoi = i;
      break;
    }
    if (marker === 0xdb) {
      const len = buf.readUInt16BE(i + 2);
      const data = buf.subarray(i + 4, i + 2 + len);
      let p = 0;
      while (p < data.length) {
        p += 1;
        const q = [...data.subarray(p, p + 64)];
        if (q.length === 64) tables.push(q);
        p += 64;
      }
      i += 2 + len;
      continue;
    }
    if (marker === 0xc0 || marker === 0xc2) {
      sof = true;
      const len = buf.readUInt16BE(i + 2);
      if (buf[i + 9] === 3) {
        chroma = "YCbCr";
      }
      i += 2 + len;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  const trailingBytes = eoi >= 0 ? Math.max(0, buf.length - (eoi + 2)) : 0;
  const doubleCompression = tables.length > 2;
  return { quantTables: tables, chroma: sof ? chroma : null, trailingBytes, pngChunks: [], doubleCompression };
}

function png(buf: Buffer): StructureResult {
  const chunks: string[] = [];
  let p = 8;
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.subarray(p + 4, p + 8).toString("ascii");
    chunks.push(type);
    p += 12 + len;
    if (type === "IEND") break;
  }
  const trailingBytes = Math.max(0, buf.length - p);
  return { quantTables: [], chroma: null, trailingBytes, pngChunks: chunks, doubleCompression: false };
}
