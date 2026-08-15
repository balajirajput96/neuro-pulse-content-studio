import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { approveDraftForOwner, findLoggedTopic, getWorkspaceData, initializeCurrentWorkingDraft } from "./contentDb";
import { getDb } from "./db";
import { studyCandidates } from "../drizzle/schema";
import { buildEditorialFlags, isHighScrutinyCategory, isWorkspaceOwnerRole, normalizeTopic, type ContentCategory } from "../shared/contentModels";
import { attachScheduleTaskUid, AUTOMATION_CRONS, ensureAutomationJobs, getAutomationState, runAutomationJobByOwner, setAutomationJobEnabled, type AutomationJobType } from "./automation";
import { createHeartbeatJob } from "./_core/heartbeat";
import { parse as parseCookie } from "cookie";

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isWorkspaceOwnerRole(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the workspace owner can perform this action" });
  }
  return next();
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  workspace: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const data = await getWorkspaceData(ctx.user.id);
      return data ?? {
        studies: [],
        drafts: [],
        citations: [],
        bundles: [],
        bundleLinks: [],
        blockers: [],
        usedTopics: [],
        jobs: [],
        runs: [],
      };
    }),
    addStudyCandidate: ownerProcedure
      .input(
        z.object({
          title: z.string().min(8),
          journal: z.string().min(2),
          doi: z.string().optional(),
          pmid: z.string().optional(),
          sourceUrl: z.string().url().optional(),
          contentCategory: z.enum(["neuroscience", "psychology", "diet", "mental_health"]),
          populationContext: z.string().min(12).optional(),
          studyType: z.enum(["Human cohort", "Systematic review", "Replication study", "Clinical trial", "Preclinical model"]),
          publicationYear: z.number().int().min(1900).max(2100).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable" });
        const topicKey = normalizeTopic(input.title);
        const priorLog = await findLoggedTopic(ctx.user.id, topicKey);
        const category = input.contentCategory as ContentCategory;
        const highScrutiny = isHighScrutinyCategory(category);
        const editorialFlags = buildEditorialFlags(category, input.sourceUrl, input.populationContext);
        const requiresOwnerReview = Boolean(priorLog || highScrutiny || editorialFlags.length);
        await db.insert(studyCandidates).values({
          ownerId: ctx.user.id,
          title: input.title,
          topicKey,
          contentCategory: category,
          journal: input.journal,
          sourceUrl: input.sourceUrl,
          doi: input.doi,
          pmid: input.pmid,
          studyType: input.studyType,
          publicationYear: input.publicationYear,
          screeningStatus: requiresOwnerReview ? "needs_review" : "passed",
          screeningReason: priorLog
            ? "Potential duplicate: this normalized topic is already present in the content log."
            : highScrutiny
              ? "High-scrutiny Diet or Mental Health candidate: editorial review, population context, limitation language, and non-diagnostic phrasing are required."
              : editorialFlags.length
                ? "Source or limitation metadata is incomplete; editorial review is required before drafting."
            : "Awaiting editorial review of source scope and limitation language.",
          populationContext: input.populationContext,
          reviewRisk: highScrutiny ? "high_scrutiny" : "standard",
          crossValidationStatus: input.sourceUrl ? "needs_review" : "not_started",
          requiresOwnerReview,
          editorialFlags,
          isDuplicate: Boolean(priorLog),
        });
        return { success: true as const, isDuplicate: Boolean(priorLog) };
      }),
    approveForPublish: ownerProcedure
      .input(z.object({ reelDraftId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => approveDraftForOwner(ctx.user.id, input.reelDraftId)),
    initializeCurrentDraft: ownerProcedure.mutation(async ({ ctx }) => initializeCurrentWorkingDraft(ctx.user.id)),
  }),
  automation: router({
    get: ownerProcedure.query(async ({ ctx }) => getAutomationState(ctx.user.id)),
    configureFreeSchedules: ownerProcedure.mutation(async ({ ctx }) => {
      const jobs = await ensureAutomationJobs(ctx.user.id);
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const configured = [];
      for (const job of jobs) {
        if (job.scheduleCronTaskUid) {
          configured.push({ jobType: job.jobType, taskUid: job.scheduleCronTaskUid, existing: true });
          continue;
        }
        const jobType = job.jobType as AutomationJobType;
        const created = await createHeartbeatJob({
          name: `neuropulse-${jobType}-${ctx.user.id}`,
          cron: AUTOMATION_CRONS[jobType],
          path: jobType === "daily_research" ? "/api/scheduled/daily-research" : "/api/scheduled/weekly-compilation",
          description: jobType === "daily_research"
            ? "Daily PubMed neuroscience intake. Imports candidates for editorial review only; never publishes externally."
            : "Weekly compilation readiness check. Prepares status only; never compiles or publishes externally.",
        }, sessionToken);
        await attachScheduleTaskUid(ctx.user.id, jobType, created.taskUid);
        configured.push({ jobType, taskUid: created.taskUid, existing: false, nextExecutionAt: created.nextExecutionAt });
      }
      return { configured };
    }),
    runNow: ownerProcedure
      .input(z.object({ jobType: z.enum(["daily_research", "weekly_compilation"]) }))
      .mutation(async ({ ctx, input }) => runAutomationJobByOwner(ctx.user.id, input.jobType, "manual")),
    setScheduleEnabled: ownerProcedure
      .input(z.object({ jobType: z.enum(["daily_research", "weekly_compilation"]), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        return setAutomationJobEnabled(ctx.user.id, input.jobType, input.enabled, sessionToken);
      }),
  }),
});

export type AppRouter = typeof appRouter;
