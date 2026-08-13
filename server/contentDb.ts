import { and, desc, eq, inArray } from "drizzle-orm";
import {
  blockerNotices,
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

  const [studies, drafts, bundles, blockers, usedTopics] = await Promise.all([
    db.select().from(studyCandidates).where(eq(studyCandidates.ownerId, ownerId)).orderBy(desc(studyCandidates.createdAt)),
    db.select().from(reelDrafts).where(eq(reelDrafts.ownerId, ownerId)).orderBy(desc(reelDrafts.updatedAt)),
    db.select().from(weeklyBundles).where(eq(weeklyBundles.ownerId, ownerId)).orderBy(desc(weeklyBundles.weekStart)),
    db.select().from(blockerNotices).where(and(eq(blockerNotices.ownerId, ownerId), eq(blockerNotices.resolved, false))),
    db.select().from(contentLog).where(eq(contentLog.ownerId, ownerId)).orderBy(desc(contentLog.usedAt)),
  ]);

  const draftIds = drafts.map(draft => draft.id);
  const bundleIds = bundles.map(bundle => bundle.id);
  const [citations, bundleLinks] = await Promise.all([
    draftIds.length ? db.select().from(citationRecords).where(inArray(citationRecords.reelDraftId, draftIds)).orderBy(desc(citationRecords.createdAt)) : [],
    bundleIds.length ? db.select().from(weeklyBundleReels).where(inArray(weeklyBundleReels.bundleId, bundleIds)) : [],
  ]);

  return { studies, drafts, citations, bundles, bundleLinks, blockers, usedTopics };
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
    journal: "Nature Neuroscience",
    doi: "10.1038/s41593-026-02359-0",
    studyType: "Replication study",
    publicationYear: 2026,
    screeningStatus: "passed",
    screeningReason: "Primary source identified; draft scope is limited to the reproducibility of specific structural-MRI measures.",
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
