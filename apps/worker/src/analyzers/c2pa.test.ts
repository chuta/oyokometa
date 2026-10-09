import { describe, expect, it } from "vitest";
import { analyzeC2pa } from "./c2pa.js";

describe("C2PA adapter", () => {
  it("reports not_detected on a plain JPEG without hanging", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const r = await analyzeC2pa(jpeg);
    expect(["not_detected", "unable_to_verify"]).toContain(r.state);
    expect(r.trust_list_version).toBeTruthy();
  });
});
