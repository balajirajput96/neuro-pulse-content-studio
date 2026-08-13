import { describe, expect, it } from "vitest";
import { AUTOMATION_CRONS } from "./automation";

describe("free content automation schedule", () => {
  it("defines only the daily intake and weekly preparation jobs", () => {
    expect(Object.keys(AUTOMATION_CRONS).sort()).toEqual(["daily_research", "weekly_compilation"]);
  });

  it("uses six-field UTC cron expressions for periodic, not continuous, execution", () => {
    expect(AUTOMATION_CRONS.daily_research.trim().split(/\s+/)).toHaveLength(6);
    expect(AUTOMATION_CRONS.weekly_compilation.trim().split(/\s+/)).toHaveLength(6);
    expect(AUTOMATION_CRONS.daily_research).toBe("0 30 3 * * *");
    expect(AUTOMATION_CRONS.weekly_compilation).toBe("0 30 4 * * 0");
  });
});
