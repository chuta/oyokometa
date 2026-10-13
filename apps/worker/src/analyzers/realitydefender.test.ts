import { describe, expect, it } from "vitest";
import { RealityDefenderDetector, parseRealityDefenderMedia, uploadNameFor } from "./realitydefender.js";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("parseRealityDefenderMedia", () => {
  it("maps the ensemble score and keeps a low score from counting as a camera original", () => {
    expect(
      parseRealityDefenderMedia({
        requestId: "req_1",
        releaseVersion: "2.3.1",
        overallStatus: "FAKE",
        resultsSummary: { status: "FAKE", metadata: { finalScore: 90 } },
        models: [
          { name: "img-ensemble", status: "FAKE" },
          { name: "model-a", status: "AUTHENTIC" },
        ],
      }),
    ).toMatchObject({
      requestId: "req_1",
      status: "FAKE",
      rawScore: 0.9,
      band: "strong",
      modelsDisagree: true,
      inProgress: false,
    });
    expect(parseRealityDefenderMedia({ overallStatus: "SUSPICIOUS", resultsSummary: { status: "SUSPICIOUS", metadata: { finalScore: 50 } } }).band).toBe("weak");
    expect(parseRealityDefenderMedia({ overallStatus: "AUTHENTIC", resultsSummary: { status: "AUTHENTIC", metadata: { finalScore: 20 } } }).band).toBe("none");
  });

  it("stores a not-applicable reason without treating it as a failure", () => {
    const parsed = parseRealityDefenderMedia({
      overallStatus: "NOT_APPLICABLE",
      resultsSummary: { status: "NOT_APPLICABLE", metadata: { reasons: [{ code: "relevance", message: "no faces detected/faces too small" }] } },
    });
    expect(parsed.band).toBe("none");
    expect(parsed.notApplicableReason).toBe("no faces detected/faces too small");
    expect(parsed.inProgress).toBe(false);
  });

  it("rejects a check that could not be evaluated", () => {
    expect(() => parseRealityDefenderMedia({ overallStatus: "UNABLE_TO_EVALUATE", resultsSummary: { status: "UNABLE_TO_EVALUATE" } })).toThrow(/could not evaluate/);
  });
});

describe("uploadNameFor", () => {
  it("keeps JPEG, PNG, GIF and WebP, and renders anything else as JPEG", () => {
    expect(uploadNameFor(Buffer.from([0xff, 0xd8, 0xff])).fileName).toBe("image.jpg");
    expect(uploadNameFor(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0])).passthrough).toBe(true);
    expect(uploadNameFor(Buffer.from("GIF89a-more")).fileName).toBe("image.gif");
    const webp = Buffer.alloc(13);
    webp.write("RIFF", 0);
    webp.write("WEBP", 8);
    expect(uploadNameFor(webp).fileName).toBe("image.webp");
    expect(uploadNameFor(Buffer.from("not-an-image")).passthrough).toBe(false);
  });
});

describe("RealityDefenderDetector", () => {
  it("uploads the image and polls until the ensemble result is ready", async () => {
    let polls = 0;
    let t = 0;
    const putHeaders: string[] = [];
    const detector = new RealityDefenderDetector("rd_test", {
      now: () => t,
      sleep: async () => {
        t += 3_000;
      },
      fetch: async (url, init) => {
        const target = String(url);
        if (target.endsWith("/api/files/aws-presigned")) {
          expect(init?.headers).toMatchObject({ "x-api-key": "rd_test" });
          return json({ requestId: "req_1", mediaId: "med_1", response: { signedUrl: "https://api.prd.realitydefender.xyz/upload/1" } });
        }
        if (init?.method === "PUT") {
          putHeaders.push(JSON.stringify(init.headers));
          expect(init.headers).toEqual({ "content-type": "application/octet-stream" });
          return new Response(null, { status: 200 });
        }
        polls += 1;
        if (polls === 1) return json({ overallStatus: "ANALYZING", resultsSummary: { status: "ANALYZING" }, requestId: "req_1" });
        return json({
          requestId: "req_1",
          releaseVersion: "2.3.1",
          overallStatus: "FAKE",
          resultsSummary: { status: "FAKE", metadata: { finalScore: 72 } },
          models: [],
        });
      },
    });
    const result = await detector.analyze(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    expect(result).toMatchObject({
      band: "strong",
      raw_score: 0.72,
      model_id: "adapter-c",
      model_version: "2.3.1",
      request_id: "req_1",
      face_manipulation_score: null,
      rendition: false,
    });
    expect(putHeaders).toHaveLength(1);
    expect(detector.releasesHoldOnFailure).toBe(false);
  });
});
