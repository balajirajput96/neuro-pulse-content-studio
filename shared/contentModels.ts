export const STUDY_TYPES = [
  "Human cohort",
  "Systematic review",
  "Replication study",
  "Clinical trial",
  "Preclinical model",
] as const;

export const SCREENING_STATUSES = ["passed", "needs_review", "rejected"] as const;
export const DRAFT_STATUSES = ["research", "scripted", "assets_ready", "blocked", "approved"] as const;
export const BLOCKER_TYPES = ["voice_sample", "video_quota", "facebook_page"] as const;
export const CONTENT_CATEGORIES = ["neuroscience", "psychology", "diet", "mental_health"] as const;
export const HIGH_SCRUTINY_CATEGORIES = ["diet", "mental_health"] as const;
export const HEALTH_CONTENT_RED_FLAGS = [
  "diagnosis_or_treatment_claim",
  "cure_or_guarantee_language",
  "dosage_guidance",
  "high_risk_diet_advice",
  "mental_health_crisis_content",
  "unverified_statistic",
  "missing_limitation",
  "missing_source_citation",
] as const;

export type ScreeningStatus = (typeof SCREENING_STATUSES)[number];
export type DraftStatus = (typeof DRAFT_STATUSES)[number];
export type BlockerType = (typeof BLOCKER_TYPES)[number];
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];
export type HealthContentRedFlag = (typeof HEALTH_CONTENT_RED_FLAGS)[number];

export type ReadinessChecklist = {
  sourceCited: boolean;
  limitationLinePresent: boolean;
  notMedicalAdvice: boolean;
};

export function normalizeTopic(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDraftReady(
  checklist: ReadinessChecklist,
  bgmStatus: string,
  voiceStatus: string,
  sourcePackStatus = "complete",
  healthRedFlagsCleared = true,
) {
  return (
    checklist.sourceCited &&
    checklist.limitationLinePresent &&
    checklist.notMedicalAdvice &&
    bgmStatus === "ready" &&
    voiceStatus === "ready" &&
    sourcePackStatus === "complete" &&
    healthRedFlagsCleared
  );
}

export function isWeeklyBundleReady(reelReadiness: boolean[]) {
  return reelReadiness.length === 7 && reelReadiness.every(Boolean);
}

export function isWorkspaceOwnerRole(role: string) {
  return role === "admin";
}

export function approvalBlocker(
  checklist: ReadinessChecklist,
  bgmStatus: string,
  voiceStatus: string,
  sourcePackStatus = "complete",
  healthRedFlagsCleared = true,
) {
  return isDraftReady(checklist, bgmStatus, voiceStatus, sourcePackStatus, healthRedFlagsCleared)
    ? null
    : "This draft cannot be approved until source-pack, health-safety, and production readiness requirements are complete";
}

export function isHighScrutinyCategory(category: ContentCategory) {
  return (HIGH_SCRUTINY_CATEGORIES as readonly string[]).includes(category);
}

export function buildEditorialFlags(category: ContentCategory, sourceUrl?: string, populationContext?: string) {
  const flags: HealthContentRedFlag[] = [];
  if (!sourceUrl) flags.push("missing_source_citation");
  if (isHighScrutinyCategory(category) && !populationContext) flags.push("missing_limitation");
  return flags;
}
