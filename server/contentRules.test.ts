import { describe, expect, it } from "vitest";
import {
  approvalBlocker,
  buildEditorialFlags,
  buildHinglishScriptTemplate,
  isDraftReady,
  isHighScrutinyCategory,
  isReelDraftReady,
  isWeeklyBundleReady,
  isWorkspaceOwnerRole,
  normalizeTopic,
} from "../shared/contentModels";

describe("content workflow rules", () => {
  it("normalizes topic punctuation before duplicate matching", () => {
    expect(normalizeTopic("MRI Signatures: A Replication Study!")).toBe(
      "mri signatures a replication study"
    );
  });

  it("requires every safety flag plus prepared audio and music before a draft is ready", () => {
    expect(
      isDraftReady(
        {
          sourceCited: true,
          limitationLinePresent: true,
          notMedicalAdvice: true,
        },
        "ready",
        "ready"
      )
    ).toBe(true);
    expect(
      isDraftReady(
        {
          sourceCited: true,
          limitationLinePresent: false,
          notMedicalAdvice: true,
        },
        "ready",
        "ready"
      )
    ).toBe(false);
  });

  it("only marks a weekly compilation ready when exactly seven reels are ready", () => {
    expect(
      isWeeklyBundleReady([true, true, true, true, true, true, true])
    ).toBe(true);
    expect(isWeeklyBundleReady([true, true, true, true, true, true])).toBe(
      false
    );
    expect(
      isWeeklyBundleReady([true, true, true, true, true, true, false])
    ).toBe(false);
  });

  it("allows the manual approval path only for an administrator", () => {
    expect(isWorkspaceOwnerRole("admin")).toBe(true);
    expect(isWorkspaceOwnerRole("user")).toBe(false);
  });

  it("blocks manual approval without every readiness requirement", () => {
    expect(
      approvalBlocker(
        {
          sourceCited: true,
          limitationLinePresent: true,
          notMedicalAdvice: true,
        },
        "ready",
        "ready"
      )
    ).toBeNull();
    expect(
      approvalBlocker(
        {
          sourceCited: true,
          limitationLinePresent: true,
          notMedicalAdvice: false,
        },
        "ready",
        "ready"
      )
    ).toBe(
      "This draft cannot be approved until source-pack, health-safety, and production readiness requirements are complete"
    );
  });

  it("blocks approval when the private source pack is incomplete or health red flags remain uncleared", () => {
    const checklist = {
      sourceCited: true,
      limitationLinePresent: true,
      notMedicalAdvice: true,
    };
    expect(isDraftReady(checklist, "ready", "ready", "missing", true)).toBe(
      false
    );
    expect(isDraftReady(checklist, "ready", "ready", "complete", false)).toBe(
      false
    );
    expect(isDraftReady(checklist, "ready", "ready", "complete", true)).toBe(
      true
    );
    expect(
      approvalBlocker(checklist, "ready", "ready", "needs_review", true)
    ).toContain("source-pack");
  });

  it("uses one record-level readiness contract for dashboard and weekly automation consumers", () => {
    const readyDraft = {
      sourceCited: true,
      limitationLinePresent: true,
      notMedicalAdvice: true,
      sourcePackStatus: "complete",
      healthRedFlagsCleared: true,
      bgmStatus: "ready",
      voiceStatus: "ready",
    };
    expect(isReelDraftReady(readyDraft)).toBe(true);
    expect(
      isReelDraftReady({ ...readyDraft, sourcePackStatus: "needs_review" })
    ).toBe(false);
    expect(
      isReelDraftReady({ ...readyDraft, healthRedFlagsCleared: false })
    ).toBe(false);
  });

  it("keeps Diet and Mental Health in high-scrutiny review while primary research categories remain standard", () => {
    expect(isHighScrutinyCategory("diet")).toBe(true);
    expect(isHighScrutinyCategory("mental_health")).toBe(true);
    expect(isHighScrutinyCategory("neuroscience")).toBe(false);
    expect(isHighScrutinyCategory("psychology")).toBe(false);
  });

  it("flags missing evidence context for high-scrutiny candidates", () => {
    expect(
      buildEditorialFlags(
        "diet",
        "https://pubmed.ncbi.nlm.nih.gov/123456/",
        undefined
      )
    ).toContain("missing_limitation");
    expect(
      buildEditorialFlags(
        "mental_health",
        undefined,
        "Adult cohort with a stated observational limitation"
      )
    ).toContain("missing_source_citation");
    expect(
      buildEditorialFlags(
        "neuroscience",
        "https://pubmed.ncbi.nlm.nih.gov/123456/",
        undefined
      )
    ).toEqual([]);
  });

  it("uses a reusable Hinglish template that preserves source, caveat, and owner-review requirements", () => {
    const template = buildHinglishScriptTemplate(
      "Memory and sleep",
      "psychology"
    );
    expect(template.sections).toHaveLength(5);
    expect(template.requiredChecks).toContain("source_card");
    expect(template.requiredChecks).toContain("owner_review_before_recording");
    expect(template.safeClosingLine).toContain("medical advice");
  });
});
