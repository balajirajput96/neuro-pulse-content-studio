import type { Express, Request, Response } from "express";
import { runAutomationJobByTaskUid } from "./automation";
import { sdk } from "./_core/sdk";

async function handleScheduledAutomation(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runAutomationJobByTaskUid(user.taskUid);
    return res.json({ ok: true, result, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

export function registerScheduledAutomationRoutes(app: Express) {
  app.post("/api/scheduled/daily-research", handleScheduledAutomation);
  app.post("/api/scheduled/weekly-compilation", handleScheduledAutomation);
}
