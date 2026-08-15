import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const studyCandidates = mysqlTable("study_candidates", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: text("title").notNull(),
  topicKey: varchar("topicKey", { length: 512 }).notNull(),
  contentCategory: mysqlEnum("contentCategory", ["neuroscience", "psychology", "diet", "mental_health"])
    .default("neuroscience")
    .notNull(),
  journal: varchar("journal", { length: 255 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  doi: varchar("doi", { length: 512 }),
  pmid: varchar("pmid", { length: 64 }),
  studyType: mysqlEnum("studyType", [
    "Human cohort",
    "Systematic review",
    "Replication study",
    "Clinical trial",
    "Preclinical model",
    "Unclassified",
  ]).notNull(),
  screeningStatus: mysqlEnum("screeningStatus", ["passed", "needs_review", "rejected"])
    .default("needs_review")
    .notNull(),
  screeningReason: text("screeningReason"),
  populationContext: text("populationContext"),
  reviewRisk: mysqlEnum("reviewRisk", ["standard", "high_scrutiny"])
    .default("standard")
    .notNull(),
  crossValidationStatus: mysqlEnum("crossValidationStatus", ["not_started", "confirmed", "needs_review"])
    .default("not_started")
    .notNull(),
  requiresOwnerReview: boolean("requiresOwnerReview").default(false).notNull(),
  editorialFlags: json("editorialFlags").$type<string[]>(),
  publicationYear: int("publicationYear"),
  indexedAt: timestamp("indexedAt"),
  isDuplicate: boolean("isDuplicate").default(false).notNull(),
  duplicateOfStudyId: int("duplicateOfStudyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reelDrafts = mysqlTable("reel_drafts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  studyCandidateId: int("studyCandidateId").notNull(),
  topic: text("topic").notNull(),
  status: mysqlEnum("status", ["research", "scripted", "assets_ready", "blocked", "approved"])
    .default("research")
    .notNull(),
  narrationSpans: json("narrationSpans").$type<string[]>().notNull(),
  visualKeyframes: json("visualKeyframes").$type<{ label: string; status: string }[]>().notNull(),
  bgmStatus: mysqlEnum("bgmStatus", ["missing", "ready", "blocked"]).default("missing").notNull(),
  voiceStatus: mysqlEnum("voiceStatus", ["missing", "reference_ready", "ready", "blocked"])
    .default("missing")
    .notNull(),
  sourceCited: boolean("sourceCited").default(false).notNull(),
  limitationLinePresent: boolean("limitationLinePresent").default(false).notNull(),
  notMedicalAdvice: boolean("notMedicalAdvice").default(false).notNull(),
  sourcePack: json("sourcePack").$type<{
    primarySourceUrl: string;
    populationContext: string;
    crossValidationStatus: "not_started" | "confirmed" | "needs_review";
    limitationNotes: string;
    hinglishSafetyGuidance: string;
    healthRedFlags: string[];
  }>(),
  sourcePackStatus: mysqlEnum("sourcePackStatus", ["missing", "needs_review", "complete"])
    .default("missing")
    .notNull(),
  healthRedFlagsCleared: boolean("healthRedFlagsCleared").default(false).notNull(),
  approvedForPublish: boolean("approvedForPublish").default(false).notNull(),
  approvedByOwnerId: int("approvedByOwnerId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const citationRecords = mysqlTable("citation_records", {
  id: int("id").autoincrement().primaryKey(),
  reelDraftId: int("reelDraftId").notNull(),
  journal: varchar("journal", { length: 255 }).notNull(),
  publicationYear: int("publicationYear").notNull(),
  doi: varchar("doi", { length: 512 }),
  pmid: varchar("pmid", { length: 64 }),
  studyType: varchar("studyType", { length: 128 }).notNull(),
  limitationSentence: text("limitationSentence").notNull(),
  syntheticVoiceDisclosure: text("syntheticVoiceDisclosure").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const weeklyBundles = mysqlTable("weekly_bundles", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  weekStart: timestamp("weekStart").notNull(),
  status: mysqlEnum("status", ["collecting", "ready_to_compile", "compiled", "blocked"])
    .default("collecting")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const weeklyBundleReels = mysqlTable("weekly_bundle_reels", {
  id: int("id").autoincrement().primaryKey(),
  bundleId: int("bundleId").notNull(),
  reelDraftId: int("reelDraftId").notNull(),
  dayIndex: int("dayIndex").notNull(),
});

export const contentLog = mysqlTable(
  "content_log",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    reelDraftId: int("reelDraftId"),
    topic: text("topic").notNull(),
    topicKey: varchar("topicKey", { length: 512 }).notNull(),
    usedAt: timestamp("usedAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("content_log_owner_topic_key").on(table.ownerId, table.topicKey)],
);

export const blockerNotices = mysqlTable("blocker_notices", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  blockerType: mysqlEnum("blockerType", ["voice_sample", "video_quota", "facebook_page"]).notNull(),
  severity: mysqlEnum("severity", ["critical", "warning", "info"]).default("warning").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  detail: text("detail").notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const automationJobs = mysqlTable(
  "automation_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    jobType: mysqlEnum("jobType", ["daily_research", "weekly_compilation"]).notNull(),
    cronExpression: varchar("cronExpression", { length: 64 }).notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    enabled: boolean("enabled").default(true).notNull(),
    lastExecutedAt: timestamp("lastExecutedAt"),
    lastStatus: mysqlEnum("lastStatus", ["idle", "running", "succeeded", "failed", "blocked"])
      .default("idle")
      .notNull(),
    lastSummary: text("lastSummary"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("automation_jobs_owner_type").on(table.ownerId, table.jobType)],
);

export const automationRuns = mysqlTable("automation_runs", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  triggerType: mysqlEnum("triggerType", ["scheduled", "manual"]).notNull(),
  status: mysqlEnum("status", ["running", "succeeded", "failed", "blocked"]).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  resultSummary: text("resultSummary"),
  candidateCount: int("candidateCount").default(0).notNull(),
  sourceSystem: varchar("sourceSystem", { length: 64 }).default("neuropulse_heartbeat").notNull(),
  nextOwnerAction: text("nextOwnerAction"),
});

export const serviceIntegrations = mysqlTable(
  "service_integrations",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    serviceKey: varchar("serviceKey", { length: 64 }).notNull(),
    displayName: varchar("displayName", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["available", "private_only", "needs_owner_login", "needs_official_credential", "blocked"])
      .notNull(),
    privateAutomationAllowed: boolean("privateAutomationAllowed").default(false).notNull(),
    publicSubmissionAllowed: boolean("publicSubmissionAllowed").default(false).notNull(),
    detail: text("detail").notNull(),
    nextOwnerAction: text("nextOwnerAction"),
    lastCheckedAt: timestamp("lastCheckedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("service_integrations_owner_key").on(table.ownerId, table.serviceKey)],
);

export type StudyCandidate = typeof studyCandidates.$inferSelect;
export type ReelDraft = typeof reelDrafts.$inferSelect;
export type CitationRecord = typeof citationRecords.$inferSelect;
export type WeeklyBundle = typeof weeklyBundles.$inferSelect;
export type BlockerNotice = typeof blockerNotices.$inferSelect;
export type AutomationJob = typeof automationJobs.$inferSelect;
export type AutomationRun = typeof automationRuns.$inferSelect;
export type ServiceIntegration = typeof serviceIntegrations.$inferSelect;
