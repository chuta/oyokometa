import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timestamps.js";

describe("timestamps", () => {
  it("never invents a single original date and flags unzoned EXIF", () => {
    const events = buildTimeline(
      [{ field: "EXIF:DateTimeOriginal", value: "2020:01:02 03:04:05" }],
      "2026-10-08T00:00:00.000Z",
    );
    expect(events[0]?.field).toBe("acquisition_time");
    expect(events[0]?.zone).toBe("utc");
    const exif = events.find((e) => e.field === "EXIF:DateTimeOriginal");
    expect(exif?.zone).toBe("local_unrecorded");
    expect(exif?.value).toMatch(/zone not recorded/);
  });

  it("flags default and future dates and reverse order", () => {
    const events = buildTimeline(
      [
        { field: "EXIF:CreateDate", value: "2020:06:01 00:00:00" },
        { field: "EXIF:ModifyDate", value: "2019:01:01 00:00:00" },
        { field: "EXIF:DateTimeOriginal", value: "1970:01:01 00:00:00" },
      ],
      "2026-10-08T00:00:00.000Z",
    );
    expect(events.some((e) => e.anomaly === "default date")).toBe(true);
    expect(events.some((e) => e.anomaly === "impossible ordering")).toBe(true);
  });
});
