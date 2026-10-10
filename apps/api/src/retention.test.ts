import { beforeEach, describe, expect, it, vi } from "vitest";

const queue: unknown[][] = [];
const chain = {
  from: () => chain,
  where: () => chain,
  limit: async () => queue.shift() ?? [],
};

vi.mock("@oyokometa/db", () => ({
  getDb: () => ({ select: () => chain }),
  assets: { imageDeletedAt: "image_deleted_at", retainUntil: "retain_until" },
  analysisJobs: {
    id: "id",
    ownerUserId: "owner_user_id",
    ownerSessionId: "owner_session_id",
    deletedAt: "deleted_at",
    createdAt: "created_at",
  },
}));

const purgeAssetBytes = vi.fn(async () => undefined);
const purgeJob = vi.fn(async () => undefined);
const audit = vi.fn(async () => undefined);
vi.mock("./purge.js", () => ({ purgeAssetBytes, purgeJob }));
vi.mock("./audit.js", () => ({ audit }));

const { retentionCutoffs, runRetention } = await import("./retention.js");

describe("retention", () => {
  beforeEach(() => {
    queue.length = 0;
    purgeAssetBytes.mockClear();
    purgeJob.mockClear();
    audit.mockClear();
  });

  it("purges anonymous analyses older than 24 hours", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    const cut = retentionCutoffs(now);
    expect(cut.assetsExpiredBefore).toEqual(now);
    expect(cut.anonymousAnalysesBefore.toISOString()).toBe("2026-10-08T12:00:00.000Z");
  });

  it("deletes expired bytes and anonymous analyses, then audits the run", async () => {
    queue.push([{ id: "a1" }, { id: "a2" }], [{ id: "j1" }]);
    const result = await runRetention(new Date());
    expect(purgeAssetBytes).toHaveBeenCalledTimes(2);
    expect(purgeJob).toHaveBeenCalledWith("j1");
    expect(result).toEqual({ bytes_deleted: 2, anonymous_analyses_purged: 1 });
    expect(audit).toHaveBeenCalledWith(
      "system:retention",
      "retention.run",
      undefined,
      "scheduled retention",
      result,
    );
  });

  it("keeps going when one asset fails and does not audit an empty run", async () => {
    purgeAssetBytes.mockRejectedValueOnce(new Error("disk"));
    queue.push([{ id: "a1" }], []);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await runRetention(new Date());
    expect(result).toEqual({ bytes_deleted: 0, anonymous_analyses_purged: 0 });
    expect(audit).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
