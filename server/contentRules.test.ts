import { describe, expect, it } from "vitest";
import { approvalBlocker, isDraftReady, isWeeklyBundleReady, isWorkspaceOwnerRole, normalizeTopic } from "../shared/contentModels";

describe("content workflow rules", () => {
  it("normalizes topic punctuation before duplicate matching", () => {
    expect(normalizeTopic("MRI Signatures: A Replication Study!")).toBe("mri signatures a replication study");
  });

  it("requires every safety flag plus prepared audio and music before a draft is ready", () => {
    expect(
      isDraftReady(
        { sourceCited: true, limitationLinePresent: true, notMedicalAdvice: true },
        "ready",
        "ready",
      ),
    ).toBe(true);
    expect(
      isDraftReady(
        { sourceCited: true, limitationLinePresent: false, notMedicalAdvice: true },
        "ready",
        "ready",
      ),
    ).toBe(false);
  });

  it("only marks a weekly compilation ready when exactly seven reels are ready", () => {
    expect(isWeeklyBundleReady([true, true, true, true, true, true, true])).toBe(true);
    expect(isWeeklyBundleReady([true, true, true, true, true, true])).toBe(false);
    expect(isWeeklyBundleReady([true, true, true, true, true, true, false])).toBe(false);
  });

  it("allows the manual approval path only for an administrator", () => {
    expect(isWorkspaceOwnerRole("admin")).toBe(true);
    expect(isWorkspaceOwnerRole("user")).toBe(false);
  });

  it("blocks manual approval without every readiness requirement", () => {
    expect(
      approvalBlocker(
        { sourceCited: true, limitationLinePresent: true, notMedicalAdvice: true },
        "ready",
        "ready",
      ),
    ).toBeNull();
    expect(
      approvalBlocker(
        { sourceCited: true, limitationLinePresent: true, notMedicalAdvice: false },
        "ready",
        "ready",
      ),
    ).toBe("This draft cannot be approved until all readiness requirements are complete");
  });
});
