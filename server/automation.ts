import { and, desc, eq, inArray } from "drizzle-orm";
import {
  automationJobs,
  automationRuns,
  contentLog,
  reelDrafts,
  studyCandidates,
  weeklyBundleReels,
  weeklyBundles,
} from "../drizzle/schema";
import {
  buildEditorialFlags,
  isReelDraftReady,
  normalizeTopic,
} from "../shared/contentModels";
import { updateHeartbeatJob } from "./_core/heartbeat";
import { getDb } from "./db";

export const AUTOMATION_CRONS = {
  daily_research: "0 30 3 * * *",
  weekly_compilation: "0 30 4 * * 0",
} as const;

export type AutomationJobType = keyof typeof AUTOMATION_CRONS;
export type AutomationTrigger = "scheduled" | "manual";

export function inferEditorialCategory(
  title: string
): "neuroscience" | "psychology" {
  return /\b(psychology|psychological|behavioral|behavioural|cognitive|emotion|wellbeing)\b/i.test(
    title
  )
    ? "psychology"
    : "neuroscience";
}

export type WeeklyCompilationDraftReadiness = Pick<
  typeof reelDrafts.$inferSelect,
  | "sourceCited"
  | "limitationLinePresent"
  | "notMedicalAdvice"
  | "bgmStatus"
  | "voiceStatus"
  | "sourcePackStatus"
  | "healthRedFlagsCleared"
>;

export function isDraftReadyForWeeklyCompilation(
  draft: WeeklyCompilationDraftReadiness
) {
  return isReelDraftReady(draft);
}

type PubMedRecord = {
  uid: string;
  title?: string;
  fulljournalname?: string;
  source?: string;
  pubdate?: string;
  articleids?: { idtype?: string; value?: string }[];
};

type EuropePmcRecord = {
  id?: string;
  source?: string;
  title?: string;
  journalTitle?: string;
  journal?: string;
  pubYear?: string;
  doi?: string;
  pmid?: string;
  authorString?: string;
};

function weekStartUtc(date = new Date()) {
  const copy = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy;
}

async function fetchRecentPubMedRecords(): Promise<PubMedRecord[]> {
  const search = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
  );
  search.searchParams.set("db", "pubmed");
  search.searchParams.set(
    "term",
    "(neuroscience[Title/Abstract] OR psychology[Title/Abstract])"
  );
  search.searchParams.set("sort", "pub date");
  search.searchParams.set("datetype", "pdat");
  search.searchParams.set("reldate", "7");
  search.searchParams.set("retmax", "5");
  search.searchParams.set("retmode", "json");

  const searchResponse = await fetch(search, {
    headers: { accept: "application/json" },
  });
  if (!searchResponse.ok)
    throw new Error(`PubMed search returned ${searchResponse.status}`);
  const searchPayload = (await searchResponse.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = searchPayload.esearchresult?.idlist ?? [];
  if (!ids.length) return [];

  const summary = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
  );
  summary.searchParams.set("db", "pubmed");
  summary.searchParams.set("id", ids.join(","));
  summary.searchParams.set("retmode", "json");
  const summaryResponse = await fetch(summary, {
    headers: { accept: "application/json" },
  });
  if (!summaryResponse.ok)
    throw new Error(`PubMed summary returned ${summaryResponse.status}`);
  const payload = (await summaryResponse.json()) as {
    result?: Record<string, PubMedRecord | string[]>;
  };
  return ids
    .map(id => payload.result?.[id])
    .filter(
      (record): record is PubMedRecord =>
        typeof record === "object" && record !== null
    );
}

async function fetchRecentEuropePmcRecords(): Promise<EuropePmcRecord[]> {
  const search = new URL(
    "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
  );
  search.searchParams.set(
    "query",
    "(TITLE:neuroscience OR TITLE:psychology OR ABSTRACT:neuroscience OR ABSTRACT:psychology) AND SRC:PMC sort_date:y"
  );
  search.searchParams.set("format", "json");
  search.searchParams.set("resultType", "core");
  search.searchParams.set("pageSize", "5");
  const response = await fetch(search, {
    headers: { accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`Europe PMC search returned ${response.status}`);
  const payload = (await response.json()) as {
    resultList?: { result?: EuropePmcRecord[] };
  };
  return payload.resultList?.result ?? [];
}

export async function ensureAutomationJobs(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  for (const jobType of Object.keys(AUTOMATION_CRONS) as AutomationJobType[]) {
    await db
      .insert(automationJobs)
      .values({
        ownerId,
        jobType,
        cronExpression: AUTOMATION_CRONS[jobType],
      })
      .onDuplicateKeyUpdate({
        set: { cronExpression: AUTOMATION_CRONS[jobType] },
      });
  }
  return db
    .select()
    .from(automationJobs)
    .where(eq(automationJobs.ownerId, ownerId))
    .orderBy(automationJobs.jobType);
}

export async function attachScheduleTaskUid(
  ownerId: number,
  jobType: AutomationJobType,
  taskUid: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db
    .update(automationJobs)
    .set({ scheduleCronTaskUid: taskUid, enabled: true })
    .where(
      and(
        eq(automationJobs.ownerId, ownerId),
        eq(automationJobs.jobType, jobType)
      )
    );
}

export async function setAutomationJobEnabled(
  ownerId: number,
  jobType: AutomationJobType,
  enabled: boolean,
  userSession: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const job = (
    await db
      .select()
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.ownerId, ownerId),
          eq(automationJobs.jobType, jobType)
        )
      )
      .limit(1)
  )[0];
  if (!job) throw new Error("Automation job not found");
  if (!job.scheduleCronTaskUid)
    throw new Error("This private schedule has not been configured yet");
  await updateHeartbeatJob(
    job.scheduleCronTaskUid,
    { enable: enabled },
    userSession
  );
  await db
    .update(automationJobs)
    .set({
      enabled,
      lastStatus: enabled ? "idle" : "blocked",
      lastSummary: enabled
        ? "Private schedule resumed; awaiting its next run."
        : "Private schedule paused by the workspace owner.",
    })
    .where(eq(automationJobs.id, job.id));
  return { enabled };
}

async function runDailyResearch(
  job: typeof automationJobs.$inferSelect,
  triggerType: AutomationTrigger
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const runResult = await db.insert(automationRuns).values({
    jobId: job.id,
    triggerType,
    status: "running",
    sourceSystem: "neuropulse_heartbeat",
    nextOwnerAction: "Review new candidates in the private research queue.",
  });
  const runId = Number(runResult[0].insertId);
  try {
    const [pubMedResult, europePmcResult] = await Promise.allSettled([
      fetchRecentPubMedRecords(),
      fetchRecentEuropePmcRecords(),
    ]);
    if (pubMedResult.status === "rejected") throw pubMedResult.reason;
    const records = pubMedResult.value;
    const europePmcRecords =
      europePmcResult.status === "fulfilled" ? europePmcResult.value : [];
    const europePmcUnavailable = europePmcResult.status === "rejected";
    let inserted = 0;
    for (const record of records) {
      const title = record.title?.replace(/\.$/, "").trim();
      if (!title) continue;
      const duplicateCandidate = await db
        .select({ id: studyCandidates.id })
        .from(studyCandidates)
        .where(
          and(
            eq(studyCandidates.ownerId, job.ownerId),
            eq(studyCandidates.pmid, record.uid)
          )
        )
        .limit(1);
      if (duplicateCandidate[0]) continue;
      const topicKey = normalizeTopic(title);
      const contentCategory = inferEditorialCategory(title);
      const priorLog = await db
        .select({ id: contentLog.id })
        .from(contentLog)
        .where(
          and(
            eq(contentLog.ownerId, job.ownerId),
            eq(contentLog.topicKey, topicKey)
          )
        )
        .limit(1);
      const doi = record.articleids?.find(
        identifier => identifier.idtype === "doi"
      )?.value;
      const year =
        Number(record.pubdate?.match(/(?:19|20)\d{2}/)?.[0] ?? "") || undefined;
      const sourceUrl = `https://pubmed.ncbi.nlm.nih.gov/${record.uid}/`;
      await db.insert(studyCandidates).values({
        ownerId: job.ownerId,
        title,
        topicKey,
        contentCategory,
        discoverySource: "pubmed",
        journal: record.fulljournalname || record.source || "PubMed",
        sourceUrl,
        doi,
        pmid: record.uid,
        studyType: "Unclassified",
        publicationYear: year,
        screeningStatus: "needs_review",
        screeningReason: priorLog[0]
          ? "Possible topic repeat: matched against the approved content log. Editorial review required."
          : "Automated PubMed intake: source identified, but study design and limitations require editorial review.",
        reviewRisk: "standard",
        crossValidationStatus: "needs_review",
        requiresOwnerReview: true,
        editorialFlags: buildEditorialFlags(contentCategory, sourceUrl),
        indexedAt: new Date(),
        isDuplicate: Boolean(priorLog[0]),
      });
      inserted += 1;
    }
    for (const record of europePmcRecords) {
      const title = record.title?.replace(/\.$/, "").trim();
      if (!title) continue;
      const topicKey = normalizeTopic(title);
      const existing = await db
        .select({ id: studyCandidates.id })
        .from(studyCandidates)
        .where(
          and(
            eq(studyCandidates.ownerId, job.ownerId),
            eq(studyCandidates.topicKey, topicKey)
          )
        )
        .limit(1);
      if (existing[0]) continue;
      const contentCategory = inferEditorialCategory(title);
      const priorLog = await db
        .select({ id: contentLog.id })
        .from(contentLog)
        .where(
          and(
            eq(contentLog.ownerId, job.ownerId),
            eq(contentLog.topicKey, topicKey)
          )
        )
        .limit(1);
      const sourceId = record.id || record.pmid || topicKey;
      const sourceUrl = `https://europepmc.org/article/${record.source || "PMC"}/${sourceId}`;
      await db.insert(studyCandidates).values({
        ownerId: job.ownerId,
        title,
        topicKey,
        contentCategory,
        discoverySource: "europe_pmc",
        journal: record.journalTitle || record.journal || "Europe PMC",
        sourceUrl,
        doi: record.doi,
        pmid: record.pmid,
        studyType: "Unclassified",
        publicationYear: Number(record.pubYear) || undefined,
        screeningStatus: "needs_review",
        screeningReason: priorLog[0]
          ? "Possible topic repeat: matched against the approved content log. Editorial review required."
          : "Europe PMC supplementary intake: metadata identified, but peer-review status, study design, and limitations require editorial review.",
        reviewRisk: "standard",
        crossValidationStatus: "needs_review",
        requiresOwnerReview: true,
        editorialFlags: buildEditorialFlags(contentCategory, sourceUrl),
        indexedAt: new Date(),
        isDuplicate: Boolean(priorLog[0]),
      });
      inserted += 1;
    }
    const summary = `Private evidence intake checked ${records.length} PubMed and ${europePmcRecords.length} Europe PMC records, adding ${inserted} new candidate${inserted === 1 ? "" : "s"} for editorial review.${europePmcUnavailable ? " Europe PMC was unavailable this run; PubMed intake completed normally." : ""}`;
    await db
      .update(automationRuns)
      .set({
        status: "succeeded",
        completedAt: new Date(),
        resultSummary: summary,
        candidateCount: inserted,
        nextOwnerAction: inserted
          ? "Screen each candidate before source-pack or script creation."
          : "No action is required; duplicates were excluded.",
      })
      .where(eq(automationRuns.id, runId));
    await db
      .update(automationJobs)
      .set({
        lastExecutedAt: new Date(),
        lastStatus: "succeeded",
        lastSummary: summary,
      })
      .where(eq(automationJobs.id, job.id));
    return { status: "succeeded" as const, summary, candidateCount: inserted };
  } catch (error) {
    const summary = `Daily research intake failed: ${error instanceof Error ? error.message : String(error)}`;
    await db
      .update(automationRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        resultSummary: summary,
        nextOwnerAction:
          "Inspect the private run summary and retry only after the source issue is understood.",
      })
      .where(eq(automationRuns.id, runId));
    await db
      .update(automationJobs)
      .set({
        lastExecutedAt: new Date(),
        lastStatus: "failed",
        lastSummary: summary,
      })
      .where(eq(automationJobs.id, job.id));
    throw new Error(summary);
  }
}

async function runWeeklyCompilation(
  job: typeof automationJobs.$inferSelect,
  triggerType: AutomationTrigger
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const runResult = await db.insert(automationRuns).values({
    jobId: job.id,
    triggerType,
    status: "running",
    sourceSystem: "neuropulse_heartbeat",
    nextOwnerAction: "Review bundle readiness in the private dashboard.",
  });
  const runId = Number(runResult[0].insertId);
  try {
    const currentWeek = weekStartUtc();
    const bundle = (
      await db
        .select()
        .from(weeklyBundles)
        .where(
          and(
            eq(weeklyBundles.ownerId, job.ownerId),
            eq(weeklyBundles.weekStart, currentWeek)
          )
        )
        .limit(1)
    )[0];
    if (!bundle) {
      const summary =
        "Weekly compilation prep is waiting for a seven-reel bundle; no compilation or publication was created.";
      await db
        .update(automationRuns)
        .set({
          status: "blocked",
          completedAt: new Date(),
          resultSummary: summary,
          nextOwnerAction:
            "Link and complete seven private reel drafts before requesting compilation review.",
        })
        .where(eq(automationRuns.id, runId));
      await db
        .update(automationJobs)
        .set({
          lastExecutedAt: new Date(),
          lastStatus: "blocked",
          lastSummary: summary,
        })
        .where(eq(automationJobs.id, job.id));
      return { status: "blocked" as const, summary, candidateCount: 0 };
    }
    const links = await db
      .select()
      .from(weeklyBundleReels)
      .where(eq(weeklyBundleReels.bundleId, bundle.id));
    const draftIds = links.map(link => link.reelDraftId);
    const drafts = draftIds.length
      ? await db
          .select()
          .from(reelDrafts)
          .where(inArray(reelDrafts.id, draftIds))
      : [];
    const ready = drafts.filter(isDraftReadyForWeeklyCompilation).length;
    const isReady = links.length === 7 && ready === 7;
    await db
      .update(weeklyBundles)
      .set({ status: isReady ? "ready_to_compile" : "collecting" })
      .where(eq(weeklyBundles.id, bundle.id));
    const summary = isReady
      ? "Seven source-complete reels are ready for owner-directed compilation; no external publication was created."
      : `Weekly compilation prep found ${ready} of ${links.length || 7} linked reels ready; no compilation or publication was created.`;
    await db
      .update(automationRuns)
      .set({
        status: isReady ? "succeeded" : "blocked",
        completedAt: new Date(),
        resultSummary: summary,
        nextOwnerAction: isReady
          ? "Owner may review the private compilation package; no public action is scheduled."
          : "Complete missing source, disclosure, voice, or visual requirements.",
      })
      .where(eq(automationRuns.id, runId));
    await db
      .update(automationJobs)
      .set({
        lastExecutedAt: new Date(),
        lastStatus: isReady ? "succeeded" : "blocked",
        lastSummary: summary,
      })
      .where(eq(automationJobs.id, job.id));
    return {
      status: isReady ? ("succeeded" as const) : ("blocked" as const),
      summary,
      candidateCount: 0,
    };
  } catch (error) {
    const summary = `Weekly compilation preparation failed: ${error instanceof Error ? error.message : String(error)}`;
    await db
      .update(automationRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        resultSummary: summary,
        nextOwnerAction: "Inspect the private run summary before retrying.",
      })
      .where(eq(automationRuns.id, runId));
    await db
      .update(automationJobs)
      .set({
        lastExecutedAt: new Date(),
        lastStatus: "failed",
        lastSummary: summary,
      })
      .where(eq(automationJobs.id, job.id));
    throw new Error(summary);
  }
}

export async function runAutomationJob(
  job: typeof automationJobs.$inferSelect,
  triggerType: AutomationTrigger
) {
  if (!job.enabled)
    return {
      status: "blocked" as const,
      summary: "This automation job is paused.",
      candidateCount: 0,
    };
  return job.jobType === "daily_research"
    ? runDailyResearch(job, triggerType)
    : runWeeklyCompilation(job, triggerType);
}

export async function runAutomationJobByOwner(
  ownerId: number,
  jobType: AutomationJobType,
  triggerType: AutomationTrigger
) {
  await ensureAutomationJobs(ownerId);
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const job = (
    await db
      .select()
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.ownerId, ownerId),
          eq(automationJobs.jobType, jobType)
        )
      )
      .limit(1)
  )[0];
  if (!job) throw new Error("Automation job not found");
  return runAutomationJob(job, triggerType);
}

export async function runAutomationJobByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const job = (
    await db
      .select()
      .from(automationJobs)
      .where(eq(automationJobs.scheduleCronTaskUid, taskUid))
      .limit(1)
  )[0];
  if (!job) return { skipped: "orphan" as const };
  return runAutomationJob(job, "scheduled");
}

export async function getAutomationState(ownerId: number) {
  const db = await getDb();
  if (!db) return { jobs: [], runs: [] };
  const jobs = await db
    .select()
    .from(automationJobs)
    .where(eq(automationJobs.ownerId, ownerId))
    .orderBy(automationJobs.jobType);
  const jobIds = jobs.map(job => job.id);
  const runs = jobIds.length
    ? await db
        .select()
        .from(automationRuns)
        .where(inArray(automationRuns.jobId, jobIds))
        .orderBy(desc(automationRuns.startedAt))
        .limit(12)
    : [];
  return { jobs, runs };
}
