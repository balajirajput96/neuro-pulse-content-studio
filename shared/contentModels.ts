export const STUDY_TYPES = [
  "Human cohort",
  "Systematic review",
  "Replication study",
  "Clinical trial",
  "Preclinical model",
] as const;

export const SCREENING_STATUSES = [
  "passed",
  "needs_review",
  "rejected",
] as const;
export const DRAFT_STATUSES = [
  "research",
  "scripted",
  "assets_ready",
  "blocked",
  "approved",
] as const;
export const BLOCKER_TYPES = [
  "voice_sample",
  "video_quota",
  "facebook_page",
] as const;
export const CONTENT_CATEGORIES = [
  "neuroscience",
  "psychology",
  "diet",
  "mental_health",
] as const;
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

export const HINGLISH_SCRIPT_QUALITY_CHECKS = [
  "evidence_first_hook",
  "plain_language_finding",
  "population_or_context",
  "limitation_line",
  "no_diagnosis_or_treatment_claim",
  "source_card",
  "owner_review_before_recording",
] as const;

export type ScreeningStatus = (typeof SCREENING_STATUSES)[number];
export type DraftStatus = (typeof DRAFT_STATUSES)[number];
export type BlockerType = (typeof BLOCKER_TYPES)[number];
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];
export type HealthContentRedFlag = (typeof HEALTH_CONTENT_RED_FLAGS)[number];
export type HinglishScriptQualityCheck =
  (typeof HINGLISH_SCRIPT_QUALITY_CHECKS)[number];

export type HinglishScriptTemplate = {
  title: string;
  sections: { label: string; prompt: string }[];
  requiredChecks: HinglishScriptQualityCheck[];
  safeClosingLine: string;
};

export type ReadinessChecklist = {
  sourceCited: boolean;
  limitationLinePresent: boolean;
  notMedicalAdvice: boolean;
};

export type ReelReadinessState = ReadinessChecklist & {
  bgmStatus: string;
  voiceStatus: string;
  sourcePackStatus: string;
  healthRedFlagsCleared: boolean;
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
  healthRedFlagsCleared = true
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

export function isReelDraftReady(draft: ReelReadinessState) {
  return isDraftReady(
    {
      sourceCited: draft.sourceCited,
      limitationLinePresent: draft.limitationLinePresent,
      notMedicalAdvice: draft.notMedicalAdvice,
    },
    draft.bgmStatus,
    draft.voiceStatus,
    draft.sourcePackStatus,
    draft.healthRedFlagsCleared
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
  healthRedFlagsCleared = true
) {
  return isDraftReady(
    checklist,
    bgmStatus,
    voiceStatus,
    sourcePackStatus,
    healthRedFlagsCleared
  )
    ? null
    : "This draft cannot be approved until source-pack, health-safety, and production readiness requirements are complete";
}

export function isHighScrutinyCategory(category: ContentCategory) {
  return (HIGH_SCRUTINY_CATEGORIES as readonly string[]).includes(category);
}

export function buildEditorialFlags(
  category: ContentCategory,
  sourceUrl?: string,
  populationContext?: string
) {
  const flags: HealthContentRedFlag[] = [];
  if (!sourceUrl) flags.push("missing_source_citation");
  if (isHighScrutinyCategory(category) && !populationContext)
    flags.push("missing_limitation");
  return flags;
}

export function buildHinglishScriptTemplate(
  topic: string,
  category: ContentCategory
): HinglishScriptTemplate {
  const highScrutiny = isHighScrutinyCategory(category);
  return {
    title: `60-second Hinglish evidence draft · ${topic}`,
    sections: [
      {
        label: "0–5s · Hook",
        prompt:
          "Surprising observation bolo, lekin certainty ya personal promise mat karo.",
      },
      {
        label: "5–18s · Study context",
        prompt:
          "Journal, study type, aur jis population/context par finding based hai woh clear karo.",
      },
      {
        label: "18–38s · Finding",
        prompt:
          "‘Study ne observe kiya’ language use karke plain Hinglish mein finding explain karo.",
      },
      {
        label: "38–50s · Why it matters",
        prompt:
          "Everyday relevance explain karo, bina diagnosis, treatment, dosage, ya guaranteed outcome claim kiye.",
      },
      {
        label: "50–60s · Caveat + source",
        prompt: highScrutiny
          ? "Limitation, medical-safety line, aur primary source card compulsory rakho."
          : "Limitation line aur primary source card compulsory rakho.",
      },
    ],
    requiredChecks: [...HINGLISH_SCRIPT_QUALITY_CHECKS],
    safeClosingLine:
      "Yeh general research context hai, personal medical advice nahi. Full source aur limitations description mein review karo.",
  };
}
