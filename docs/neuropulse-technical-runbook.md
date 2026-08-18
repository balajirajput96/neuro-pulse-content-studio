# NeuroPulse Content Studio — Technical Runbook

**Project:** NeuroPulse Content Studio  
**Workspace:** `neuroscience-content-workspace`  
**Primary owner:** Balaji Rajput  
**Prepared by:** Manus AI  
**Status date:** 17 August 2026  
**Production dashboard:** [https://neurospace-2rkbkju3.manus.space](https://neurospace-2rkbkju3.manus.space)

> **Non-negotiable operating rule:** NeuroPulse may automatically collect research candidates and calculate editorial readiness. It must **never** automatically upload, submit, publish, post, schedule a public post, or otherwise distribute content to YouTube, Instagram, Facebook, or any other public platform. A separate, immediate owner confirmation is required for each public submission.

## 1. Purpose and operating model

NeuroPulse is an owner-controlled content-operations workspace for turning recent neuroscience research into a reviewable Hinglish reel pipeline. It provides a private workflow from research intake through draft readiness, source citation, weekly-compilation readiness, and owner approval. It is deliberately designed so that approval records and automation execution **do not** create a public-platform action.

The deployed system uses React, TypeScript, Tailwind, Express, tRPC, Drizzle ORM, and a MySQL-compatible database. Recurring work is executed with platform-managed HTTP cron callbacks rather than an in-process timer. This means it keeps working independently of a local development session while avoiding unreliable `setInterval` or `node-cron` processes in autoscaling hosting.

| Layer | Implemented technology | Responsibility |
|---|---|---|
| Dashboard | React 19, TypeScript, Tailwind 4 | Owner-facing research, draft, bundle, blocker, schedule, and run-history views. |
| Server | Express 4 and tRPC 11 | Authenticated owner actions, scheduled callback registration, and business rules. |
| Persistence | Drizzle ORM with MySQL/TiDB | Research candidates, drafts, citations, weekly bundles, blockers, job bindings, and run history. |
| Authentication | Manus OAuth with owner-role checks | Prevents non-owner users from scheduling work, running jobs manually, or approving drafts. |
| Scheduled work | Manus Heartbeat HTTP cron | Daily PubMed intake and weekly readiness evaluation. |
| Research source | PubMed E-utilities | Search recent PubMed records and retrieve their summaries. |
| Public distribution | Deliberately absent | No production social-publishing integration, credential, endpoint, or auto-post process exists. |

## 2. What has been implemented

The dashboard has five operational areas: **Daily Research Queue**, **Draft Reel Queue**, **Weekly Compilation Tracker**, **Publishing Status Gate**, and **Content Log**. Its workflow guards research provenance, duplicate topics, required citation material, limitation language, “not medical advice” disclosure, soundtrack/voice readiness, owner-only approval, and external-service blockers.

| Workstream | Delivered state | Important boundary |
|---|---|---|
| Research intake | Scheduled PubMed search discovers a limited set of recent neuroscience candidates. | Candidates enter `needs_review`; automation does not treat them as publication-ready science. |
| Duplicate control | PubMed-ID and normalized-topic checks prevent repeated candidates and flag topic repeats. | A topic match requires editorial attention; it does not silently overwrite prior work. |
| Reel workflow | Drafts hold Hinglish narration spans, visual-keyframe state, BGM/voice readiness, citations, and disclosures. | A draft remains private until an owner has reviewed it. |
| Weekly readiness | A Sunday job tests whether a seven-reel set is source-complete and marked ready. | It only updates internal status; it never compiles, uploads, or publishes a video. |
| Approval gate | Owner approval updates an internal `approvedForPublish` record and appends the topic to the content log. | Approval is not a platform submission and gives no standing permission to publish later. |
| Scheduling | Two enabled HTTP cron jobs are durably bound to database rows. | Only a cron-authenticated callback that matches the stored task binding may run a scheduled job. |

## 3. Current recurring automation

The system has two **free, platform-managed periodic workflows**. Cron expressions use six UTC fields in the order `seconds minutes hours day-of-month month day-of-week`.

| Job | Cron expression (UTC) | Approximate India time | Endpoint | Actual operation | Verified persisted state on 14 Aug 2026 |
|---|---:|---:|---|---|---|
| Daily research intake | `0 30 3 * * *` | 09:00 IST daily | `POST /api/scheduled/daily-research` | Queries PubMed and inserts non-duplicate candidates for editorial review. | Enabled; durable Heartbeat task binding exists; latest recorded run succeeded at 03:32 UTC and added 3 candidates. |
| Weekly compilation readiness | `0 30 4 * * 0` | 10:00 IST Sunday | `POST /api/scheduled/weekly-compilation` | Checks whether seven linked reels meet the source, limitation, disclosure, BGM, and voice readiness conditions. | Enabled; durable Heartbeat task binding exists; no scheduled Sunday execution had occurred at the time of verification. |

The daily job has also been exercised both manually and by schedule. Its recorded runs demonstrate the intended idempotent behavior: the job can add new PubMed candidates when available and return zero new candidates when retrieved records already exist locally. The weekly job reports `blocked` or `ready_to_compile` when appropriate; it contains no function that makes a public post.

> PubMed E-utilities provide a documented URL-based interface for searching Entrez databases and retrieving summaries. NeuroPulse uses `ESearch` to obtain PubMed IDs and `ESummary` to obtain the metadata used for an editorial candidate. [1]

## 4. Exact implemented automation behavior

### 4.1 Daily PubMed research intake

The core implementation is in [`server/automation.ts`](../server/automation.ts). `fetchRecentPubMedRecords()` constructs two HTTPS requests:

```text
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
    db=pubmed
    term=(neuroscience[Title/Abstract] OR psychology[Title/Abstract])
    sort=pub+date
    datetype=pdat
    reldate=7
    retmax=5
    retmode=json

GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi
    db=pubmed
    id=<IDs returned by ESearch>
    retmode=json
```

The implementation then performs the following controlled transformations.

| Step | Code behavior | Outcome |
|---|---|---|
| 1 | Removes a trailing period and ignores records without a usable title. | Avoids empty or malformed candidates. |
| 2 | Checks for an existing `study_candidates.pmid` for this owner. | Stops direct PubMed-ID duplicates. |
| 3 | Generates a normalized topic key and looks in `content_log`. | Flags possible topic repetition against already approved content. |
| 4 | Captures title, journal, DOI when present, PMID, and publication year when recognizable. | Stores traceable source metadata. |
| 5 | Inserts the candidate with `screeningStatus: "needs_review"`. | An editor must still evaluate study design and limitations. |
| 6 | Creates an `automation_runs` history record and updates the job’s last status/summary. | Makes runs auditable from the dashboard and database. |

The production query purposefully has a small retrieval cap (`retmax=5`) and searches a seven-day publication window. This is an intake queue, not an assertion that every new paper is verified, clinically meaningful, or suitable for a reel.

### 4.2 Weekly compilation readiness check

`runWeeklyCompilation()` in [`server/automation.ts`](../server/automation.ts) calculates the ISO-style Monday week start in UTC and checks the owner’s matching `weekly_bundles` record. The system does not construct an external video or call a distribution service. It follows the readiness rules below.

| Condition | Required value |
|---|---|
| Number of linked reels | Exactly 7 |
| Source record | `sourceCited === true` and `sourcePackStatus === "complete"` |
| Limitation disclosure | `limitationLinePresent === true` |
| Medical-safety disclosure | `notMedicalAdvice === true` |
| Background music | `bgmStatus === "ready"` |
| Voice | `voiceStatus === "ready"` |
| Health-review status | `healthRedFlagsCleared === true` |

When all seven items are ready, the bundle receives `ready_to_compile`. Otherwise it remains `collecting`, and the run is recorded as `blocked`. In both cases the returned run summary explicitly states that no external publication was created.

## 5. Security and manual-publication controls

### 5.1 Owner-only application actions

[`server/routers.ts`](../server/routers.ts) defines `ownerProcedure`, which wraps authenticated requests and checks the owner role through `isWorkspaceOwnerRole(ctx.user.role)`. The following tRPC operations are owner-only:

| Procedure | Allowed effect | Explicitly not allowed |
|---|---|---|
| `automation.get` | Read jobs and recent run history. | Does not expose credentials or social sessions. |
| `automation.configureFreeSchedules` | Register the two private periodic jobs and save their task identifiers. | Does not register social publishing schedules. |
| `automation.runNow` | Manually execute daily intake or weekly readiness. | Does not publish or upload. |
| `workspace.addStudyCandidate` | Add a research candidate manually. | Does not mark scientific claims as approved automatically. |
| `workspace.approveForPublish` | Record an owner’s internal content approval. | Does not call YouTube, Meta, Instagram, Facebook, or any other external publishing API. |

### 5.2 Approval checks

[`server/contentDb.ts`](../server/contentDb.ts) applies readiness checks before an approval record can be written. The function requires source citation, limitation text, not-medical-advice text, ready music, and a ready voice. If any condition fails, it throws an error rather than setting `approvedForPublish`.

After approval, the code writes an internal content-log entry to prevent duplicate-topic reuse. The code ends there: there is no API client, upload token, queue, webhook, browser submission step, or background publish job.

### 5.3 Cron callback authentication

[`server/scheduledAutomation.ts`](../server/scheduledAutomation.ts) accepts callback requests only after the platform SDK authenticates the request. The handler returns `403` unless both `user.isCron` and `user.taskUid` are present. It then looks up the internal job by stored task identifier instead of trusting request-body parameters.

```ts
const user = await sdk.authenticateRequest(req);
if (!user.isCron || !user.taskUid) {
  return res.status(403).json({ error: "cron-only" });
}

const result = await runAutomationJobByTaskUid(user.taskUid);
return res.json({ ok: true, result, timestamp: new Date().toISOString() });
```

`server/_core/index.ts` mounts both scheduled endpoints before tRPC and frontend fallthrough:

```ts
registerScheduledAutomationRoutes(app);
```

This arrangement prevents an ordinary browser request, a dashboard request, or an attacker-supplied job name from impersonating a scheduled task.

## 6. Data model and persistence

The schema lives in [`drizzle/schema.ts`](../drizzle/schema.ts). The tables below are the project’s relevant durable records.

| Table | Purpose | Important fields |
|---|---|---|
| `study_candidates` | Incoming PubMed and owner-added research candidates. | `pmid`, `doi`, `topicKey`, `screeningStatus`, `screeningReason`, `isDuplicate`. |
| `reel_drafts` | Private reel-production state. | narration spans, keyframes, source/limitation/disclaimer flags, BGM state, voice state, owner approval fields. |
| `citation_records` | Citation and disclosure record associated with each draft. | journal, year, DOI/PMID, limitation sentence, synthetic-voice disclosure. |
| `weekly_bundles` and `weekly_bundle_reels` | A week’s compilation set and its reel links. | week start, readiness/collection status, day index. |
| `content_log` | Approved-content topic registry. | owner, draft, normalized topic key, used timestamp. |
| `blocker_notices` | Production blockers visible in the dashboard. | voice sample, video quota, Facebook Page access. |
| `automation_jobs` | Configuration and persisted Heartbeat task binding. | cron expression, `scheduleCronTaskUid`, enabled flag, last execution/status/summary. |
| `automation_runs` | Immutable-style operational history per job execution. | trigger type, status, start/finish, summary, candidate count. |

The unique index on `(ownerId, jobType)` ensures that an owner has one durable daily job record and one weekly job record. The code saves the scheduler’s returned task identifier in `automation_jobs.scheduleCronTaskUid`; later callbacks resolve work only by that identifier.

### 6.1 Additional persisted private controls

The continuation adds `study_candidates` editorial fields for category, source URL, population context, review risk, cross-validation status, owner review, and editorial flags. `reel_drafts` now contains the private source-pack payload, source-pack status, and health-red-flag clearance. `automation_runs` records the source system and next owner action. `service_integrations` records verified capability only; its public-submission flag is false for every service.

## 7. Full implementation map

The following table is the source-of-truth map of code written or extended for the workflow. The actual TypeScript source is maintained in the listed project files so that the runbook does not become a stale fork of the implementation.

| File | Implemented responsibility |
|---|---|
| [`server/automation.ts`](../server/automation.ts) | Cron constants, PubMed `ESearch`/`ESummary` client, job upsert, task-UID attachment, daily intake, weekly readiness evaluation, job runner, persisted state retrieval. |
| [`server/scheduledAutomation.ts`](../server/scheduledAutomation.ts) | Two `POST /api/scheduled/*` handlers, SDK cron authentication, task-UID dispatch, JSON success/error responses. |
| [`server/routers.ts`](../server/routers.ts) | Owner-role procedure, schedule configuration mutation, manual-run mutation, workspace actions, source candidate management, internal approval endpoint. |
| [`server/contentDb.ts`](../server/contentDb.ts) | Dashboard data aggregation, duplicate lookup, approval readiness enforcement, initial working-draft/blocker setup. |
| [`drizzle/schema.ts`](../drizzle/schema.ts) | Full database structure, including `automation_jobs` and `automation_runs`. |
| [`server/_core/index.ts`](../server/_core/index.ts) | Registers scheduled routes before tRPC/Vite/static processing. |
| [`server/_core/heartbeat.ts`](../server/_core/heartbeat.ts) | Platform cron integration helpers used to create, update, list, pause, resume, and delete Heartbeat jobs. |
| [`client/src/pages/Home.tsx`](../client/src/pages/Home.tsx) | Owner-facing dashboard sections, periodic-job cards, enabled-status display, “Enable free schedules”, and “Run now” controls. |
| [`server/automation.test.ts`](../server/automation.test.ts) | Verifies that only the two intended automation jobs are defined and that each uses a six-field UTC cron expression. |

## 8. Reproducible implementation and operations command record

This section records the **safe, reproducible command categories and commands** used to build, verify, or operate the project. It is intentionally not a raw terminal transcript: terminal output can include transient URLs, session details, and masked secrets, none of which should be copied into a durable runbook. Do not place API keys, browser cookies, OAuth values, voice-clone data, or platform tokens in this document, shell history, source code, or public Drive files.

| Purpose | Reproducible command or action | Notes |
|---|---|---|
| Enter project | `cd /home/ubuntu/neuroscience-content-workspace` | Project source directory. |
| Run local application | `pnpm run dev` | Used by the managed development service; production uses the deployed checkpoint. |
| Run tests | `pnpm test` | Existing verification includes the automation cron test and broader project tests. |
| Generate database migration after schema changes | `pnpm drizzle-kit generate` | Read generated SQL before applying it. |
| Apply schema change | Apply reviewed migration through the project database migration workflow. | Schema changes must be executed deliberately; do not run destructive SQL casually. |
| Inspect automation records | `SELECT jobType, cronExpression, scheduleCronTaskUid, enabled, lastExecutedAt, lastStatus FROM automation_jobs;` | Use read-only queries when checking binding and status. Do not print task IDs in public documents. |
| Inspect recent executions | `SELECT triggerType, status, startedAt, completedAt, candidateCount, resultSummary FROM automation_runs ORDER BY startedAt DESC LIMIT 12;` | Confirms scheduled/manual trigger state and idempotence. |
| Inspect platform jobs | `manus-heartbeat list` | Lists platform-managed jobs for the owner context. |
| Inspect one job’s execution history | `manus-heartbeat logs --task-uid <stored-task-uid>` | Obtain task UID from the database/owner tooling; do not publish it. |
| Pause a job | `manus-heartbeat update --task-uid <stored-task-uid> --enable=false` | Pause rather than delete if temporary suspension is needed. |
| Resume a job | `manus-heartbeat update --task-uid <stored-task-uid> --enable=true` | Re-enable only after verifying endpoint and logic. |
| Create an owner-level HTTP cron manually, if required | `manus-heartbeat create --name <name> --cron "0 0 9 * * *" --path /api/scheduled/<path> --description "<private operation>"` | A new handler, database binding, tests, and deployment must exist first. |
| Create Drive folders or upload documents | Use `gws drive` commands after checking `gws --help`. | Drive was used for organization only; no permanent deletions or public sharing were performed. |
| Save a deployable version | Create a project checkpoint after tests and TODO review. | In this project, checkpoints auto-publish to the production domain. |

### 8.1 Key code pattern: registering a private schedule

The owner-only schedule mutation upserts the two job rows, skips already-bound jobs, creates only missing Heartbeat tasks, and saves each returned task UID:

```ts
const jobs = await ensureAutomationJobs(ctx.user.id);

for (const job of jobs) {
  if (job.scheduleCronTaskUid) continue;

  const created = await createHeartbeatJob({
    name: `neuropulse-${job.jobType}-${ctx.user.id}`,
    cron: AUTOMATION_CRONS[job.jobType],
    path: job.jobType === "daily_research"
      ? "/api/scheduled/daily-research"
      : "/api/scheduled/weekly-compilation",
    description: "Private editorial automation only; never publishes externally.",
  }, sessionToken);

  await attachScheduleTaskUid(ctx.user.id, job.jobType, created.taskUid);
}
```

The precise production source has fuller descriptions and types in [`server/routers.ts`](../server/routers.ts).

## 9. Google and editorial-workspace setup

### 9.1 Google Drive

The owner-controlled Google Drive parent folder is **`Neuroscience Reels Content`**. The folder identifier is retained in private operations records; it is not repeated here as an operational credential. The following editorial structure has been created.

| Folder | Intended contents |
|---|---|
| `01_Research_Intake` | Candidate studies, source notes, and screening material. |
| `02_Scripts_Hinglish` | Owner-reviewed Hinglish narration drafts. |
| `03_Voice_Samples` | Authorized creator voice-reference material. |
| `04_Visuals` | Visual assets and keyframe planning. |
| `05_Draft_Reels` | Private, unpublished reel assemblies. |
| `06_Weekly_Compilations` | Internal weekly compilation planning and output candidates. |
| `07_Publish_Review` | Final asset, caption, source, disclaimer, and owner-confirmation package. |
| `99_Archive` | Historical material retained under owner control. |

No public sharing or destructive Drive operation was performed. The Drive workflow is organizational; it is not an automated publishing channel.

### 9.2 Gemini and Gemini Spark

The connected Google account has private editorial schedules documented separately in [`docs/gemini-setup-status.md`](gemini-setup-status.md) and [`docs/gemini-spark-workflow-status.md`](gemini-spark-workflow-status.md). These schedules prepare research briefs, Hinglish reel-draft material, and weekly readiness reviews only. They must not upload, publish, post, send, or otherwise interact with public social-platform endpoints.

| Service | Private workflow status | Public-action status |
|---|---|---|
| Gemini | Daily private neuroscience brief configured around 09:00 IST. | No external posting enabled. |
| Gemini Spark | Daily research intake, daily Hinglish draft preparation, and weekly readiness review configured. | No Meta, Instagram, Facebook, or YouTube posting connection has been enabled. |
| Google Drive | Editorial folder structure created. | Not a public distribution service. |

## 10. Integration blockers and required owner actions

The table lists outstanding constraints honestly. These are external-account, security-verification, content-production, or quota dependencies; they cannot safely be bypassed by code or automation.

| Blocker | Current status | Owner action required | Safe follow-up after resolution |
|---|---|---|---|
| Creator voice reference | No clean 60–90 second spoken sample is available. | Provide a clear, authorized narration sample in the private voice-sample folder. | Validate consent/disclosure and prepare private voice output; do not use the creator’s voice without an authorized sample. |
| Video quota | Only one of eight visual clips was available/generated before quota limitation. | Wait for available quota or choose a compliant manual alternative. | Generate remaining private assets; do not schedule public delivery. |
| Facebook Page | No administered Facebook Page found. | Connect or create an administered Page through Meta’s normal owner-controlled process. | Reassess only after the owner authorizes a formal integration. |
| Meta Developer setup | Developer App was not created; two-factor verification could not be completed. | Recover the account’s valid verification method through official Meta account tools. | Create an app only after security verification; retain manual per-post confirmation. |
| Meta connected app/MCP | No native Meta/Instagram/Facebook connected app was available and no valid custom endpoint was supplied. | Provide a valid owner-authorized integration only if needed. | Inspect capabilities, scopes, and consent before connecting; never fabricate credentials. |
| Google AI Studio access | Automated key/project setup was rejected for suspicious activity. | Use a normal browser session after Google clears the restriction; do not bypass it. | Store a user-provided key only in approved secret management, with service restrictions. |
| Google Cloud IAM | Current user lacks permission on `galvanized-future-q8kj5` to create API keys or change IAM. | A project owner must grant least-privilege `roles/serviceusage.apiKeysAdmin` or create an appropriately restricted key. | Verify access and restrict the key to intended API services. |

Google documents **API Keys Admin** (`roles/serviceusage.apiKeysAdmin`) as a role required to manage API keys; API keys should also be restricted to intended services. [2] Meta documents that some business portfolios require two-factor authentication and that, in some cases, the requirement cannot be disabled. [3]

## 10.1 Continued private-workflow update — 17 August 2026

The workflow was extended without connecting new external accounts, creating media, or adding a public-submission path. PubMed intake now searches both **Neuroscience** and **Psychology** title/abstract records. A lightweight title classifier routes behavioural, cognitive, psychological, emotion, or wellbeing research into the Psychology review track; all remaining intake stays in the Neuroscience track. Diet and Mental Health continue to require high-scrutiny editorial handling when added manually.

| Addition | Implemented behavior | Safety boundary |
|---|---|---|
| Private service ledger | The dashboard creates owner-scoped status rows for NeuroPulse, Google Workspace, GitHub, Gemini Spark, Instagram, Antigravity CLI, Julius, YouTube, Meta, and AI Studio. | Every row records `publicSubmissionAllowed = false`; it is an audit ledger, not a publishing connector. |
| Schedule control | The owner may pause or resume an already bound private Heartbeat job from the dashboard. | Pause/resume only affects daily intake or weekly readiness; it cannot enable public delivery. |
| Run ledger | Each private run records its source system and next owner action. | It retains operational context only; no action is dispatched outside the workspace. |
| Draft source pack | A draft may carry primary-source URL, population context, cross-validation state, limitation notes, Hinglish safety guidance, and health-red-flag list. | Owner approval is blocked unless the source pack is complete and health red flags are cleared. |
| Research triage | The dashboard exposes counts for evidence review, cross-check pending, high-scrutiny subjects, and source-ready candidates. | The counts prioritize private editorial review and do not score content for public release. |

The review screen requires an authenticated owner session. An unauthenticated visitor sees only the secure sign-in page; run history, integration status, source packs, and schedule controls are not exposed.

### 10.2 Supplementary evidence discovery and Hinglish script template — 17 August 2026

The single private daily intake job now queries **PubMed first** and then a small Europe PMC `SRC:PMC` metadata search sorted by recent date. Europe PMC is a supplementary discovery source, not a quality or peer-review certification. Each Europe PMC record is labelled `discoverySource = "europe_pmc"`, enters `needs_review`, receives the same normalized-topic duplicate check as PubMed, and remains subject to source-pack, limitation, and owner-review requirements. A Europe PMC outage is recorded in the run summary but does not prevent the established PubMed intake from completing. Europe PMC documents that its REST API exposes publication metadata in JSON and supports date sorting; it also distinguishes access to open content and metadata from automated bulk downloading of other content. [4]

The owner dashboard now displays a reusable **60-second Hinglish evidence-draft template**. Its five private stages are: a caveated hook, study context, plain-language finding, bounded relevance, and a limitation/source close. The template requires source-card, limitation, no-diagnosis/treatment-claim, and owner-review checks. It includes a standard safe closing line and does not generate audio, video, captions, or public submissions.

## 11. Safe automation-extension guide

Future improvements may automate **private preparation** but must preserve the owner-confirmed public-distribution gate. Use the following decision table before adding any scheduled task.

| Proposed extension | May be automated? | Required design | Forbidden behavior |
|---|---|---|---|
| Broaden research source discovery | Yes, privately. | Add source provenance, editorial screening, rate limits, duplicate checks, tests, and run history. | Presenting unreviewed findings as medical advice or automatically converting them into posts. |
| Draft Hinglish scripts | Yes, privately. | Keep drafts in `scripted`/review state, include citations and limitation language. | Treating generated wording as final without editorial review. |
| Generate visual assets | Yes, privately and subject to creator consent/quota. | Record asset provenance, review it privately, and associate it with a draft. | Uploading generated assets to public platforms automatically. |
| Prepare captions/titles | Yes, privately. | Store candidate caption, title, citations, disclaimer, and target-platform checklist in `07_Publish_Review`. | Pressing a platform submit/publish button without a fresh owner confirmation. |
| Send internal owner reminder | Yes, if owner-authorized. | Reminder contains internal status and a link to review. | Sending a public post or standing approval token. |
| Create a weekly local video assembly | Potentially, privately. | Preserve source/disclaimer bundle, render to private storage, and require owner review. | Publishing the resulting compilation. |
| Add YouTube/Meta API integration | Only after owner completes normal platform setup and explicitly authorizes a specific scope. | Store credentials in secure secret storage, expose a review screen, and enforce just-in-time confirmation. | Persistent “auto-publish” flag, scheduled posts, or using fabricated/extracted credentials. |

### 11.1 Required checklist for any new private cron job

Every new periodic job must satisfy all of the following before it is enabled.

1. Define the job type and six-field UTC cron in `AUTOMATION_CRONS`.
2. Add a durable job row or owner record with a nullable stored task UID.
3. Register a `POST /api/scheduled/<job>` callback before the frontend/static fallback.
4. Authenticate with `sdk.authenticateRequest(req)` and require `user.isCron` and `user.taskUid`.
5. Resolve the job only from the stored task UID; never trust a request-body job identifier.
6. Make the operation idempotent because transient failures may be retried.
7. Persist `running`, `succeeded`, `blocked`, or `failed` execution records and human-readable summaries.
8. Add tests for job type, cron shape, business behavior, failure handling, and the no-publication invariant.
9. Update `todo.md`, verify the production build, and checkpoint the change before scheduling it.
10. Confirm that no code path, webhook, background process, browser flow, or integration client performs external publication.

### 11.2 Required per-post owner confirmation protocol

If a future manual publishing integration is legitimately enabled, it must stop at a final review gate. Immediately before any actual public submission, present the owner with the exact final asset and require an affirmative confirmation for that one operation.

| Review item | Must be shown to owner |
|---|---|
| Target | Exact platform and destination channel/account. |
| Asset | Final video/image file or immutable preview. |
| Text | Exact title, caption, hashtags, link text, and language. |
| Scientific package | Source journal/PMID/DOI, what the study supports, limitation sentence, and not-medical-advice disclosure. |
| Voice disclosure | Any synthetic-voice disclosure and confirmation that the creator authorized the voice reference. |
| Timing | The submission will happen now, not later under a stored blanket permission. |

The implementation must bind the confirmation to a short-lived, single-use submission record containing the asset checksum and exact copied text. A change to the asset, caption, platform, account, scientific disclaimer, or timing invalidates the confirmation and requires a new one.

## 12. Monitoring, pause, recovery, and verification

The dashboard’s Free Periodic Workflow section shows current job configuration, last outcome, and recent run history. Platform job management can also inspect, pause, resume, or retrieve logs using the stored task binding.

| Situation | Recommended action | Do not do |
|---|---|---|
| Daily intake fails | Inspect `automation_runs.resultSummary`, then platform task logs and the PubMed response status. | Retry blindly without understanding an HTTP/API error. |
| Duplicate candidates appear | Review normalized topic / PMID fields and content-log match. | Delete historical content logs just to force reuse. |
| Job fires twice/retries | Confirm the candidate de-duplication behavior and job-run evidence. | Assume an extra trigger equals an extra public action; no such path exists. |
| Need a temporary stop | Pause the relevant Heartbeat job through owner tools. | Delete research/citation history. |
| Scheduled job needs an updated time | Update the existing task by stored task UID and update the database cron expression in the same controlled release. | Create duplicate cron jobs with the same purpose. |
| Production bug after a release | Restore the most recent known-good project checkpoint and then investigate. | Use destructive repository reset commands or drop database tables. |

## 13. Validation record

Validation includes owner-role constraints, durable job records, task-UID bindings, production scheduled runs, and tests that verify the two allowed job types, their six-field UTC expressions, manual-only publication boundaries, and weekly compilation safeguards. The current persistent schedule query confirms two enabled jobs with stored task bindings and future execution times.

| Validation item | Result |
|---|---|
| TypeScript and language-server checks | `pnpm check` completed with no errors on 18 August 2026. |
| Full unit suite | `pnpm test` completed with 6 files and 22 tests passing on 18 August 2026. |
| Production build | `pnpm build` completed successfully on 18 August 2026. |
| Production dependency audit | `pnpm audit --prod --json` completed with zero known low, moderate, high, or critical findings after validated compatible dependency remediation. |
| Full dependency audit | `pnpm audit --json` completed with zero known low, moderate, high, or critical findings across production and development tooling. |
| Daily intake action | Five scheduled daily runs from 13–17 August returned HTTP 200, each recording private research candidates without external posting. |
| Weekly readiness behavior | The enabled weekly job writes private readiness only; every draft now requires a complete source pack and cleared health red flags in addition to citation, limitation, disclosure, voice, and BGM checks. |
| Owner approval behavior | Requires completion checks, writes only internal approval/content-log state. |
| Auto-publish checks | Zero enabled automatic public-publishing jobs or routes. |

### 13.1 Current validation — 18 August 2026
The full test suite reports **22 passing tests across 6 files**. Coverage includes cron definitions, Psychology category routing, owner-only approval, source-pack completion, health-red-flag clearance, shared dashboard-and-automation readiness contract behavior, two focused regression checks that prevent a draft with an incomplete source pack or uncleared health flag from counting toward weekly readiness, and cron-only/context-rich scheduled-handler failure behavior. TypeScript and the production build completed without errors. The unauthenticated preview correctly shows only a secure sign-in screen.

The private daily Heartbeat log shows five consecutive successful runs from 13–17 August 2026, each returning HTTP 200 without retry. The private weekly readiness task also returned HTTP 200; as designed, it updated only internal weekly-bundle readiness and did not create a compilation upload or public post. Both job definitions remain enabled. The next daily execution is scheduled for 18 August 2026 at 03:30 UTC, and the next weekly readiness execution is scheduled for 23 August 2026 at 04:30 UTC.

### 13.2 Current operating status — 18 August 2026

The durable job bindings remain enabled: daily private research runs at `0 30 3 * * *` UTC and weekly internal readiness runs at `0 30 4 * * 0` UTC. The latest daily record succeeded on 17 August and added one private candidate. The newly deployed Europe PMC supplementary intake will participate on the next daily execution; it retains PubMed-first processing, de-duplication, and owner review. The only initialized reel draft remains **blocked** because its creator-authorized voice input is not available. No voice cloning, media creation, compilation upload, or public posting was initiated.

## 14. Operational conclusion

The durable automated portion of NeuroPulse is active: **daily PubMed candidate intake** and **weekly private compilation-readiness evaluation** continue on the configured platform schedules. The Google Drive editorial workspace and private Gemini/Spark preparation workflows have also been organized. The remaining requirements—creator voice material, video quota, Meta security recovery, Facebook Page access, and Google Cloud API-key permission—remain owner or provider actions.

Public distribution has not been automated and must remain manually authorized, post by post. This is a deliberate technical and editorial safety boundary, not an unfinished scheduling step.

## References

[1] [NCBI, *Entrez Programming Utilities Help: E-utilities Quick Start*](https://www.ncbi.nlm.nih.gov/books/NBK25500/)

[2] [Google Cloud, *Manage API keys*](https://docs.cloud.google.com/docs/authentication/api-keys)

[3] [Meta Business Help Center, *How to require two-factor authentication for people in your Meta business portfolio*](https://www.facebook.com/business/help/280940009201586)

[4] [Europe PMC, *Articles RESTful API*](https://europepmc.org/RestfulWebService)
