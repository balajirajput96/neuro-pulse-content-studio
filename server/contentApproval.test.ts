import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
}));

import { approveDraftForOwner } from "./contentDb";

const baseDraft = {
  id: 18,
  ownerId: 9,
  topic: "A brain scan finding that refused to repeat",
  sourceCited: true,
  limitationLinePresent: true,
  notMedicalAdvice: true,
  bgmStatus: "ready",
  voiceStatus: "ready",
};

function createFakeDb(draft: typeof baseDraft) {
  const updateWhere = vi.fn().mockResolvedValue({ affectedRows: 1 });
  const logUpsert = vi.fn().mockResolvedValue({ affectedRows: 1 });
  const selectLimit = vi.fn().mockResolvedValue([draft]);

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: selectLimit })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: updateWhere })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ onDuplicateKeyUpdate: logUpsert })),
    })),
  };

  return { db, updateWhere, logUpsert };
}

describe("approveDraftForOwner", () => {
  beforeEach(() => {
    mocks.getDb.mockReset();
  });

  it("rejects an incomplete draft before any approval state is written", async () => {
    const { db } = createFakeDb({ ...baseDraft, notMedicalAdvice: false });
    mocks.getDb.mockResolvedValue(db);

    await expect(approveDraftForOwner(9, 18)).rejects.toThrow("This draft cannot be approved until source-pack, health-safety, and production readiness requirements are complete");
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("writes only an owner approval record and content-log entry when the draft is fully ready", async () => {
    const { db, updateWhere, logUpsert } = createFakeDb(baseDraft);
    mocks.getDb.mockResolvedValue(db);

    await expect(approveDraftForOwner(9, 18)).resolves.toEqual({ success: true });
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(updateWhere).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(logUpsert).toHaveBeenCalledTimes(1);
  });
});
