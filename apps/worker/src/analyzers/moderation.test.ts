import { describe, expect, it } from "vitest";
import {
  ADULT_THRESHOLD,
  adultClassesPresent,
  collectClassScores,
  moderateAdultContent,
  refusesAdultContent,
} from "./moderation.js";

const clean = [
  { class: "general_nsfw", score: 0.01 },
  { class: "general_suggestive", score: 0.99 },
  { class: "general_not_nsfw_not_suggestive", score: 0 },
  { class: "yes_sexual_activity", score: 0.02 },
  { class: "no_sexual_activity", score: 0.98 },
  { class: "yes_realistic_nsfw", score: 0.03 },
  { class: "no_realistic_nsfw", score: 0.97 },
];

function v2(classes: { class: string; score: number }[]) {
  return { status: [{ response: { output: [{ time: 0, classes }] } }] };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("adult content decision", () => {
  it("reads class scores from either response shape", () => {
    expect(collectClassScores(v2(clean)).map((score) => score.className)).toContain("general_nsfw");
    expect(collectClassScores({ output: [{ classes: clean }] })).toHaveLength(clean.length);
    const v3 = {
      output: [{ classes: clean.map((score) => ({ class: score.class, value: score.score })) }],
    };
    expect(collectClassScores(v3).find((score) => score.className === "general_nsfw")?.score).toBe(0.01);
    expect(refusesAdultContent(collectClassScores(v3))).toBe(false);
  });

  it("refuses sexual classes at the threshold and leaves suggestive clothing alone", () => {
    expect(ADULT_THRESHOLD).toBe(0.9);
    expect(refusesAdultContent(collectClassScores(v2(clean)))).toBe(false);
    expect(adultClassesPresent(collectClassScores(v2(clean)))).toBe(true);
    for (const name of ["general_nsfw", "yes_sexual_activity", "yes_realistic_nsfw"]) {
      const classes = clean.map((score) => (score.class === name ? { ...score, score: 0.9 } : score));
      expect(refusesAdultContent(collectClassScores(v2(classes)))).toBe(true);
      const below = clean.map((score) => (score.class === name ? { ...score, score: 0.89 } : score));
      expect(refusesAdultContent(collectClassScores(v2(below)))).toBe(false);
    }
  });

  it("fails closed when the sexual classes are missing", () => {
    expect(adultClassesPresent(collectClassScores(v2([{ class: "general_suggestive", score: 0.2 }])))).toBe(false);
  });
});

describe("moderateAdultContent", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

  it("posts the jpeg to visual moderation and accepts a clean score", async () => {
    let auth = "";
    let url = "";
    let fileType = "";
    const fetchImpl = async (input: string, init: RequestInit) => {
      url = input;
      auth = String(new Headers(init.headers).get("authorization"));
      const form = init.body as FormData;
      const file = form.get("media");
      fileType = file instanceof Blob ? file.type : "";
      return json(v2(clean));
    };
    await expect(moderateAdultContent(jpeg, { HIVE_API_KEY: "secret" }, fetchImpl)).resolves.toEqual({
      decision: "accepted",
    });
    expect(url).toBe("https://api.thehive.ai/api/v3/hive/visual-moderation");
    expect(auth).toBe("Bearer secret");
    expect(fileType).toBe("image/jpeg");
  });

  it("refuses without naming the class", async () => {
    const classes = clean.map((score) => (score.class === "general_nsfw" ? { ...score, score: 0.97 } : score));
    const fetchImpl = async () => json(v2(classes));
    await expect(moderateAdultContent(jpeg, { HIVE_API_KEY: "secret" }, fetchImpl)).rejects.toMatchObject({
      code: "content_refused",
      message: "This file can't be accepted.",
    });
  });

  it("fails closed when the key is missing, the call errors, or the body is incomplete", async () => {
    await expect(moderateAdultContent(jpeg, {}, async () => json(v2(clean)))).rejects.toMatchObject({
      code: "service_unavailable",
    });
    await expect(
      moderateAdultContent(jpeg, { HIVE_API_KEY: "secret" }, async () => json({ error: "limited" }, 429)),
    ).rejects.toMatchObject({ code: "service_unavailable" });
    await expect(
      moderateAdultContent(jpeg, { HIVE_API_KEY: "secret" }, async () => json({ output: [] })),
    ).rejects.toMatchObject({ code: "service_unavailable" });
    await expect(
      moderateAdultContent(jpeg, { HIVE_API_KEY: "secret" }, async () => {
        throw new Error("network");
      }),
    ).rejects.toMatchObject({ code: "service_unavailable" });
  });
});
