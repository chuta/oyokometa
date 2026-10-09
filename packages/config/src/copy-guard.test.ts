import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_COPY, C2PA_NOT_DETECTED_LINE } from "./index.js";

describe("copy guardrails", () => {
  it("keeps forbidden authenticity words out of product config strings", () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "index.ts"), "utf8").replace(
      /export const FORBIDDEN_COPY[\s\S]*?as const;/,
      "",
    );
    for (const word of FORBIDDEN_COPY) {
      if (word === "genuine" && src.includes("whether the image is genuine")) continue;
      const re = new RegExp(`\\b${word.replace("-", "\\-")}\\b`, "i");
      const hits = [...src.matchAll(new RegExp(re, "gi"))];
      const allowed = hits.filter((h) => {
        const i = h.index ?? 0;
        const window = src.slice(Math.max(0, i - 100), i + 100);
        return /FORBIDDEN|must not|never|not evidence|says nothing|not proof|not a forensic/i.test(
          window,
        );
      });
      expect(hits.length).toBe(allowed.length);
    }
  });

  it("includes required C2PA absence disclaimer", () => {
    expect(C2PA_NOT_DETECTED_LINE).toMatch(/Most images have no Content Credentials/);
  });
});
