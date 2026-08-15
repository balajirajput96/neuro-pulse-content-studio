import { and, desc, eq, inArray } from "drizzle-orm";
import {
  blockerNotices,
  automationJobs,
  automationRuns,
  serviceIntegrations,
  citationRecords,
  contentLog,
  reelDrafts,
  studyCandidates,
  weeklyBundleReels,
  weeklyBundles,
} from "../drizzle/schema";
import { approvalBlocker, normalizeTopic } from "../shared/contentModels";
import { getDb } from "./db";

export async function getWorkspaceData(ownerId: number) {
  const db = await getDb();
  if (!db) return null;

  await ensureServiceIntegrationStatuses(ownerId);
  const [studies, drafts, bundles, blockers, usedTopics, integrations] = await Promise.all([
    db.select().from(studyCandidates).where(eq(studyCandidates.ownerId, ownerId)).orderBy(desc(studyCandidates.createdAt)),
    db.select().from(reelDrafts).where(eq(reelDrafts.ownerId, ownerId)).orderBy(desc(reelDrafts.updatedAt)),
    db.select().from(weeklyBundles).where(eq(weeklyBundles.ownerId, ownerId)).orderBy(desc(weeklyBundles.weekStart)),
    db.select().from(blockerNotices).where(and(eq(blockerNotices.ownerId, ownerId), eq(blockerNotices.resolved, false))),
    db.select().from(contentLog).where(eq(contentLog.ownerId, ownerId)).orderBy(desc(contentLog.usedAt)),
    db.select().from(serviceIntegrations).where(eq(serviceIntegrations.ownerId, ownerId)).orderBy(serviceIntegrations.displayName),
  ]);

  const draftIds = drafts.map(draft => draft.id);
  const bundleIds = bundles.map(bundle => bundle.id);
  const [citations, bundleLinks] = await Promise.all([
    draftIds.length ? db.select().from(citationRecords).where(inArray(citationRecords.reelDraftId, draftIds)).orderBy(desc(citationRecords.createdAt)) : [],
    bundleIds.length ? db.select().from(weeklyBundleReels).where(inArray(weeklyBundleReels.bundleId, bundleIds)) : [],
  ]);

  const jobs = await db.select().from(automationJobs).where(eq(automationJobs.ownerId, ownerId)).orderBy(automationJobs.jobType);
  const jobIds = jobs.map(job => job.id);
  const runs = jobIds.length ? await db.select().from(automationRuns).where(inArray(automationRuns.jobId, jobIds)).orderBy(desc(automationRuns.startedAt)).limit(8) : [];
  return { studies, drafts, citations, bundles, bundleLinks, blockers, usedTopics, jobs, runs, integrations };
}

export async function ensureServiceIntegrationStatuses(ownerId: number) {
  const db = await getDb();
  if (!db) return;
  const statuses = [
    { serviceKey: "neuropulse_dashboard", displayName: "NeuroPulse dashboard", status: "private_only" as const, privateAutomationAllowed: true, publicSubmissionAllowed: false, detail: "Daily PubMed intake and weekly readiness checks are active as private workspace operations.", nextOwnerAction: "Review queued studies and private run history." },
    { serviceKey: "google_workspace", displayName: "Google Workspace", status: "available" as const, privateAutomationAllowed: true, publicSubmissionAllowed: false, detail: "Authorized Google Workspace access is available for owner-controlled Drive organization and internal documents.", nextOwnerAction: "Keep source packs and approved drafts in the private editorial folders." },
    { serviceKey: "github", displayName: "GitHub", status: "available" as const, privateAutomationAllowed: true, publicSubmissionAllowed: false, detail: "Authorized GitHub access is available for version-controlled code, policies, prompts, and tests. Credentials and raw media remain excluded.", nextOwnerAction: "Use a private repository for non-secret workflow assets and reviewed code changes." },
    { serviceKey: "gemini_spark", displayName: "Gemini Spark", status: "private_only" as const, privateAutomationAllowed: true, publicSubmissionAllowed: false, detail: "Private research, Hinglish draft preparation, and weekly readiness schedules are configured. Public posting is prohibited.", nextOwnerAction: "Use Spark outputs only as private editorial inputs." },
    { serviceKey: "instagram", displayName: "Instagram", status: "private_only" as const, privateAutomationAllowed: true, publicSubmissionAllowed: false, detail: "An authorized account is present, but this workspace does not grant any automatic posting or scheduled-publication capability.", nextOwnerAction: "Keep all platform submission work outside recurring automation and require a fresh owner confirmation." },
    { serviceKey: "google_antigravity", displayName: "Google Antigravity CLI", status: "needs_owner_login" as const, privateAutomationAllowed: false, publicSubmissionAllowed: false, detail: "The CLI is not installed in this execution environment. Official setup requires local installation and authenticated sign-in with scoped permissions.", nextOwnerAction: "Install and authenticate only on an owner-controlled machine; allow narrowly scoped workspace permissions." },
    { serviceKey: "julius", displayName: "Julius", status: "needs_owner_login" as const, privateAutomationAllowed: false, publicSubmissionAllowed: false, detail: "Julius supports data connectors and an MCP store, but no authorized Julius connector or inbound automation API is configured for this workspace.", nextOwnerAction: "Review the Julius MCP Store or data-connector UI in the owner account before authorizing a private data workflow." },
    { serviceKey: "youtube", displayName: "YouTube", status: "needs_owner_login" as const, privateAutomationAllowed: false, publicSubmissionAllowed: false, detail: "No YouTube integration is configured. The workflow has no upload or publish action.", nextOwnerAction: "If a future manual integration is needed, configure limited OAuth and retain a one-use owner confirmation gate." },
    { serviceKey: "meta", displayName: "Meta / Facebook", status: "blocked" as const, privateAutomationAllowed: false, publicSubmissionAllowed: false, detail: "Meta developer setup is blocked by unresolved official two-factor verification; no app, Page permission, or publishing scope exists.", nextOwnerAction: "Complete official account recovery and verification before any future manual integration review." },
    { serviceKey: "google_ai_studio", displayName: "Google AI Studio", status: "blocked" as const, privateAutomationAllowed: false, publicSubmissionAllowed: false, detail: "API key/project setup remains blocked by provider anti-abuse restrictions and missing project IAM permission.", nextOwnerAction: "Wait for Google clearance and obtain least-privilege project-owner access or an owner-created restricted key." },
  ];
  for (const status of statuses) {
    await db.insert(serviceIntegrations).values({ ownerId, ...status }).onDuplicateKeyUpdate({
      set: { ...status, lastCheckedAt: new Date() },
    });
  }
}

export async function findLoggedTopic(ownerId: number, topicKey: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(contentLog)
    .where(and(eq(contentLog.ownerId, ownerId), eq(contentLog.topicKey, topicKey)))
    .limit(1);
  return result[0] ?? null;
}

export async function approveDraftForOwner(ownerId: number, reelDraftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const rows = await db
    .select()
    .from(reelDrafts)
    .where(and(eq(reelDrafts.id, reelDraftId), eq(reelDrafts.ownerId, ownerId)))
    .limit(1);
  const draft = rows[0];
  if (!draft) throw new Error("Draft not found");

  const blocker = approvalBlocker(
    {
      sourceCited: draft.sourceCited,
      limitationLinePresent: draft.limitationLinePresent,
      notMedicalAdvice: draft.notMedicalAdvice,
    },
    draft.bgmStatus,
    draft.voiceStatus,
    draft.sourcePackStatus,
    draft.healthRedFlagsCleared,
  );

  if (blocker) {
    throw new Error(blocker);
  }

  await db
    .update(reelDrafts)
    .set({
      approvedForPublish: true,
      approvedByOwnerId: ownerId,
      approvedAt: new Date(),
      status: "approved",
    })
    .where(and(eq(reelDrafts.id, reelDraftId), eq(reelDrafts.ownerId, ownerId)));

  await db
    .insert(contentLog)
    .values({ ownerId, reelDraftId, topic: draft.topic, topicKey: normalizeTopic(draft.topic) })
    .onDuplicateKeyUpdate({ set: { reelDraftId } });

  return { success: true as const };
}

export async function initializeCurrentWorkingDraft(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const existing = await db
    .select()
    .from(studyCandidates)
    .where(and(eq(studyCandidates.ownerId, ownerId), eq(studyCandidates.doi, "10.1038/s41593-026-02359-0")))
    .limit(1);
  if (existing[0]) return { created: false as const, studyId: existing[0].id };

  const studyResult = await db.insert(studyCandidates).values({
    ownerId,
    title: "Why structural-MRI brain signatures must reproduce across independent sites",
    topicKey: normalizeTopic("Why structural-MRI brain signatures must reproduce across independent sites"),
    contentCategory: "neuroscience",
    journal: "Nature Neuroscience",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=10.1038%2Fs41593-026-02359-0",
    doi: "10.1038/s41593-026-02359-0",
    studyType: "Replication study",
    publicationYear: 2026,
    screeningStatus: "passed",
    screeningReason: "Primary source identified; draft scope is limited to the reproducibility of specific structural-MRI measures.",
    populationContext: "Independent study sites; result is limited to the assessed structural-MRI measures.",
    reviewRisk: "standard",
    crossValidationStatus: "confirmed",
    requiresOwnerReview: true,
    editorialFlags: [],
  });
  const studyCandidateId = Number(studyResult[0].insertId);

  const draftResult = await db.insert(reelDrafts).values({
    ownerId,
    studyCandidateId,
    topic: "A brain scan finding that refused to repeat",
    status: "blocked",
    narrationSpans: [
      "Socho, ek brain scan ek dramatic pattern dikhaye… aur jab doosri labs usi pattern ko check karein, woh repeat hi na ho.",
      "Ek nayi Nature Neuroscience analysis ne structural MRI measures ko independent study sites par compare kiya.",
      "Cortical thickness aur grey-matter volume ke patterns aksar consistently reproduce nahi hue.",
      "Yeh diagnosis advice nahi hai—bas ek reminder hai: science ko repeatable hona chahiye.",
    ],
    visualKeyframes: [
      { label: "Presenter + brain", status: "ready" },
      { label: "Repeat panels", status: "ready" },
      { label: "Research sites", status: "ready" },
      { label: "Data network", status: "ready" },
    ],
    bgmStatus: "ready",
    voiceStatus: "blocked",
    sourceCited: true,
    limitationLinePresent: true,
    notMedicalAdvice: true,
    sourcePack: {
      primarySourceUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=10.1038%2Fs41593-026-02359-0",
      populationContext: "Independent study sites; the finding concerns the assessed structural-MRI measures rather than individual diagnosis.",
      crossValidationStatus: "confirmed",
      limitationNotes: "This reel must state that reproducibility findings for selected MRI measures do not translate into diagnosis or treatment guidance.",
      hinglishSafetyGuidance: "Hinglish script should use ‘study ne observe kiya’ rather than certainty language, and must avoid personal medical inference.",
      healthRedFlags: [],
    },
    sourcePackStatus: "complete",
    healthRedFlagsCleared: true,
  });
  const reelDraftId = Number(draftResult[0].insertId);

  await db.insert(citationRecords).values({
    reelDraftId,
    journal: "Nature Neuroscience",
    publicationYear: 2026,
    doi: "10.1038/s41593-026-02359-0",
    studyType: "Replication study",
    limitationSentence: "This study examines repeatability of specific structural-MRI measures; it does not provide diagnostic or treatment advice.",
    syntheticVoiceDisclosure: "Narration will use the creator-authorized synthetic voice after a clean spoken reference is supplied.",
  });

  const bundleResult = await db.insert(weeklyBundles).values({
    ownerId,
    title: "Week of 10 August — Neuroscience research reel set",
    weekStart: new Date("2026-08-10T00:00:00.000Z"),
    status: "collecting",
  });
  const bundleId = Number(bundleResult[0].insertId);
  await db.insert(weeklyBundleReels).values({ bundleId, reelDraftId, dayIndex: 1 });

  await db.insert(blockerNotices).values([
    {
      ownerId,
      blockerType: "voice_sample",
      severity: "critical",
      title: "Clean voice sample required",
      detail: "Upload 60–90 seconds of clean spoken narration to prepare creator-authorized voice output.",
    },
    {
      ownerId,
      blockerType: "video_quota",
      severity: "warning",
      title: "Video generation quota reached",
      detail: "One opening clip is ready; remaining visual clips must wait for the next quota window.",
    },
    {
      ownerId,
      blockerType: "facebook_page",
      severity: "warning",
      title: "Facebook Page admin access missing",
      detail: "Facebook publishing remains unavailable until an administered Page is connected.",
    },
  ]);

  return { created: true as const, studyId: studyCandidateId };
}
