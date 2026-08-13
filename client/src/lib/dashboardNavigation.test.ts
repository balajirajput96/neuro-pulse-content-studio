import { describe, expect, it, vi } from "vitest";
import { scrollToDashboardSection } from "./dashboardNavigation";

describe("dashboard section navigation", () => {
  it("scrolls each workflow section into the visible viewport", () => {
    const scrollIntoView = vi.fn();
    const root = {
      getElementById: vi.fn(() => ({ scrollIntoView })),
    } as unknown as Document;

    for (const section of ["daily-research", "draft-reels", "weekly-compilation", "publishing-status", "content-log"]) {
      scrollToDashboardSection(section, root);
    }

    expect(root.getElementById).toHaveBeenCalledTimes(5);
    expect(scrollIntoView).toHaveBeenCalledTimes(5);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "start" });
  });
});
