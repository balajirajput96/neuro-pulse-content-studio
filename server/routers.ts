import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { approveDraftForOwner, findLoggedTopic, getWorkspaceData, initializeCurrentWorkingDraft } from "./contentDb";
import { getDb } from "./db";
import { studyCandidates } from "../drizzle/schema";
import { isWorkspaceOwnerRole, normalizeTopic } from "../shared/contentModels";

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
      };
    }),
    addStudyCandidate: ownerProcedure
      .input(
        z.object({
          title: z.string().min(8),
          journal: z.string().min(2),
          doi: z.string().optional(),
          pmid: z.string().optional(),
          studyType: z.enum(["Human cohort", "Systematic review", "Replication study", "Clinical trial", "Preclinical model"]),
          publicationYear: z.number().int().min(1900).max(2100).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable" });
        const topicKey = normalizeTopic(input.title);
        const priorLog = await findLoggedTopic(ctx.user.id, topicKey);
        await db.insert(studyCandidates).values({
          ownerId: ctx.user.id,
          title: input.title,
          topicKey,
          journal: input.journal,
          doi: input.doi,
          pmid: input.pmid,
          studyType: input.studyType,
          publicationYear: input.publicationYear,
          screeningStatus: priorLog ? "needs_review" : "passed",
          screeningReason: priorLog
            ? "Potential duplicate: this normalized topic is already present in the content log."
            : "Awaiting editorial review of source scope and limitation language.",
          isDuplicate: Boolean(priorLog),
        });
        return { success: true as const, isDuplicate: Boolean(priorLog) };
      }),
    approveForPublish: ownerProcedure
      .input(z.object({ reelDraftId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => approveDraftForOwner(ctx.user.id, input.reelDraftId)),
    initializeCurrentDraft: ownerProcedure.mutation(async ({ ctx }) => initializeCurrentWorkingDraft(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
