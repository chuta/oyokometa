import { describe, expect, it } from "vitest";
import { manipulationCheckFromRaw } from "./manipulation.js";

describe("manipulationCheckFromRaw", () => {
  it("shows an authentic ensemble result without treating it as proof of the scene", () => {
    expect(
      manipulationCheckFromRaw({
        model_id: "adapter-c",
        status: "AUTHENTIC",
        raw_score: 0.2,
        band: "none",
      }),
    ).toEqual({
      status: "authentic",
      label: "Authentic",
      detail: "Low likelihood of manipulation. This is an inference. It does not establish that the scene is genuine.",
    });
  });

  it("ignores other detectors", () => {
    expect(manipulationCheckFromRaw({ model_id: "adapter-b", status: "FAKE" })).toBeNull();
    expect(manipulationCheckFromRaw({ model_id: "adapter-c", status: "ANALYZING" })).toBeNull();
  });

  it("keeps a not-applicable reason", () => {
    expect(
      manipulationCheckFromRaw({
        model_id: "adapter-c",
        status: "NOT_APPLICABLE",
        not_applicable_reason: "no faces detected/faces too small",
      })?.detail,
    ).toContain("no faces detected");
  });
});
