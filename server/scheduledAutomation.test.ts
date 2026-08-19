import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./automation", () => ({ runAutomationJobByTaskUid: vi.fn() }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn() } }));

import { runAutomationJobByTaskUid } from "./automation";
import { sdk } from "./_core/sdk";
import { handleScheduledAutomation } from "./scheduledAutomation";

function createResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { json, status } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };
}

describe("scheduled automation handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects requests that are not authenticated as a cron task", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      isCron: false,
    } as never);
    const response = createResponse();

    await handleScheduledAutomation(
      { originalUrl: "/api/scheduled/daily-research" } as Request,
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.status.mock.results[0]?.value.json).toHaveBeenCalledWith({
      error: "cron-only",
    });
    expect(runAutomationJobByTaskUid).not.toHaveBeenCalled();
  });

  it("returns the callback URL and authenticated task UID when scheduled work fails", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      isCron: true,
      taskUid: "cron-task-123",
    } as never);
    vi.mocked(runAutomationJobByTaskUid).mockRejectedValue(
      new Error("Database is unavailable")
    );
    const response = createResponse();

    await handleScheduledAutomation(
      { originalUrl: "/api/scheduled/weekly-compilation" } as Request,
      response
    );

    expect(runAutomationJobByTaskUid).toHaveBeenCalledWith("cron-task-123");
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.status.mock.results[0]?.value.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Database is unavailable",
        context: {
          url: "/api/scheduled/weekly-compilation",
          taskUid: "cron-task-123",
        },
      })
    );
  });
});
