import { describe, expect, it } from "vitest";
import {
  AUTOMATION_CRONS,
  inferEditorialCategory,
  isDraftReadyForWeeklyCompilation,
  type WeeklyCompilationDraftReadiness,
} from "./automation";

const weeklyReadyDraft: WeeklyCompilationDraftReadiness = {
  sourceCited: true,
  limitationLinePresent: true,
  notMedicalAdvice: true,
  sourcePackStatus: "complete",
  healthRedFlagsCleared: true,
  bgmStatus: "ready",
  voiceStatus: "ready",
};

describe("free content automation schedule", () => {
  it("defines only the daily intake and weekly preparation jobs", () => {
    expect(Object.keys(AUTOMATION_CRONS).sort()).toEqual([
      "daily_research",
      "weekly_compilation",
    ]);
  });

  it("uses six-field UTC cron expressions for periodic, not continuous, execution", () => {
    expect(AUTOMATION_CRONS.daily_research.trim().split(/\s+/)).toHaveLength(6);
    expect(
      AUTOMATION_CRONS.weekly_compilation.trim().split(/\s+/)
    ).toHaveLength(6);
    expect(AUTOMATION_CRONS.daily_research).toBe("0 30 3 * * *");
    expect(AUTOMATION_CRONS.weekly_compilation).toBe("0 30 4 * * 0");
  });

  it("routes behavioural and cognitive research to the permanent Psychology review track", () => {
    expect(
      inferEditorialCategory(
        "Cognitive flexibility and resilience in adolescence"
      )
    ).toBe("psychology");
    expect(
      inferEditorialCategory("Neural mechanisms of memory consolidation")
    ).toBe("neuroscience");
  });

  it("keeps the secondary literature discovery inside the existing private daily job", () => {
    expect(Object.keys(AUTOMATION_CRONS)).toContain("daily_research");
    expect(Object.keys(AUTOMATION_CRONS)).not.toContain("public_publish");
  });

  it("requires a complete source pack before a draft can count toward weekly readiness", () => {
    expect(isDraftReadyForWeeklyCompilation(weeklyReadyDraft)).toBe(true);
    expect(
      isDraftReadyForWeeklyCompilation({
        ...weeklyReadyDraft,
        sourcePackStatus: "needs_review",
      })
    ).toBe(false);
  });

  it("requires cleared health red flags before a draft can count toward weekly readiness", () => {
    expect(
      isDraftReadyForWeeklyCompilation({
        ...weeklyReadyDraft,
        healthRedFlagsCleared: false,
      })
    ).toBe(false);
  });
});
