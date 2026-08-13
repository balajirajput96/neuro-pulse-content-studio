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

export type ScreeningStatus = (typeof SCREENING_STATUSES)[number];
export type DraftStatus = (typeof DRAFT_STATUSES)[number];
export type BlockerType = (typeof BLOCKER_TYPES)[number];

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

export function isDraftReady(checklist: ReadinessChecklist, bgmStatus: string, voiceStatus: string) {
  return (
    checklist.sourceCited &&
    checklist.limitationLinePresent &&
    checklist.notMedicalAdvice &&
    bgmStatus === "ready" &&
    voiceStatus === "ready"
  );
}

export function isWeeklyBundleReady(reelReadiness: boolean[]) {
  return reelReadiness.length === 7 && reelReadiness.every(Boolean);
}

export function isWorkspaceOwnerRole(role: string) {
  return role === "admin";
}

export function approvalBlocker(checklist: ReadinessChecklist, bgmStatus: string, voiceStatus: string) {
  return isDraftReady(checklist, bgmStatus, voiceStatus)
    ? null
    : "This draft cannot be approved until all readiness requirements are complete";
}
