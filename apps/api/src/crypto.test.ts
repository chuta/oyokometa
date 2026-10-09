import { describe, expect, it } from "vitest";
import { sign, unsign } from "./crypto.js";

describe("session tokens", () => {
  it("round-trips HMAC cookies", () => {
    const s = sign("abc", "secret");
    expect(unsign(s, "secret")).toBe("abc");
    expect(unsign(s, "other")).toBeNull();
  });
});
