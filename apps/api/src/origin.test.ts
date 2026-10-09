import { afterEach, describe, expect, it } from "vitest";
import { publicAppOrigin } from "./origin.js";

afterEach(() => {
  delete process.env.AUTH_URL;
  delete process.env.WEB_ORIGIN;
});

describe("publicAppOrigin", () => {
  it("prefers AUTH_URL over the CORS list", () => {
    process.env.WEB_ORIGIN = "https://oyokometa.xyz,https://www.oyokometa.xyz";
    process.env.AUTH_URL = "https://oyokometa.xyz/";
    expect(publicAppOrigin()).toBe("https://oyokometa.xyz");
  });
});
