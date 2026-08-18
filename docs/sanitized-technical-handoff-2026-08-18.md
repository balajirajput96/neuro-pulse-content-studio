# NeuroPulse Content Studio — Sanitized Technical Handoff

**Prepared:** 18 August 2026  
**Repository:** [`balajirajput96/neuro-pulse-content-studio`](https://github.com/balajirajput96/neuro-pulse-content-studio) — private  
**Live workspace:** [NeuroPulse Content Studio](https://neurospace-2rkbkju3.manus.space)

> This handoff intentionally excludes passwords, API keys, OAuth tokens, browser cookies, session identifiers, OTPs, raw personal account-recovery material, and any private media. The private GitHub repository is the authoritative complete source-code copy.

## What Was Built

NeuroPulse is a private, owner-controlled content-operations workspace for neuroscience and psychology reels. It discovers recent research, stores evidence candidates, prepares source-backed Hinglish drafts, tracks weekly compilation readiness, and holds every public publishing action behind an owner-only approval boundary. It contains **no automatic YouTube, Instagram, or Facebook publishing route**.

| Area | Implemented behavior |
|---|---|
| Daily intake | PubMed-first evidence intake with supplementary Europe PMC discovery, topic deduplication, metadata, editorial flags, and owner review. |
| Editorial safety | Neuroscience and psychology taxonomy; permanent high-scrutiny handling for diet and mental-health topics; source-pack, limitation, safety, and health-red-flag controls. |
| Draft production | Private 60-second Hinglish draft template with source, population context, caveat, safety, voice, BGM, and visual-readiness state. |
| Weekly workflow | A bundle becomes ready only when exactly seven linked drafts each pass the shared source, disclosure, media, and health-safety readiness contract. |
| Scheduling | Private Heartbeat HTTP jobs: daily research at `0 30 3 * * *` UTC (about 09:00 IST) and weekly readiness at `0 30 4 * * 0` UTC (about Sunday 10:00 IST). |
| Owner controls | Owner-only schedule pause/resume, manual run, review gates, and draft approval. Cron routes reject non-cron callers. |
| Publishing rule | Manual owner confirmation remains mandatory immediately before any future public submission. No public post has been created by this workspace. |

## Complete Source-Code Map

The complete code is in the private GitHub repository above. The following files are the main application-specific implementation files.

| File | Purpose |
|---|---|
| `client/src/pages/Home.tsx` | Owner dashboard: research triage, drafts, source packs, weekly queue, approval wording, schedule controls, run ledger, and blocker status. |
| `server/routers.ts` | Owner-protected tRPC procedures for workspace data, schedules, manual runs, pause/resume, draft actions, and approval. |
| `server/automation.ts` | PubMed + Europe PMC discovery, deduplication, daily run history, weekly readiness calculation, pause/resume state, and cron constants. |
| `server/scheduledAutomation.ts` | Authenticated cron callback routes with URL/task context in failures. |
| `server/contentDb.ts` | Drizzle-backed content data helpers, including source-pack and health-red-flag approval enforcement. |
| `shared/contentModels.ts` | Shared editorial taxonomy, Hinglish safety template, reel-readiness contract, bundle readiness, and owner-role helpers. |
| `drizzle/schema.ts` | MySQL/TiDB schema for jobs, runs, candidates, drafts, weekly bundles, blockers, and integration ledger. |
| `server/*.test.ts` and `client/src/lib/dashboardNavigation.test.ts` | 22 automated tests covering approval, schedules, safety taxonomy, automation, and dashboard navigation. |
| `docs/neuropulse-technical-runbook.md` | Operational architecture, safeguards, schedule operation, verification record, and blockers. |

### Representative Safeguard Code

The shared reel-readiness contract prevents dashboard and backend drift:

```ts
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
```

The scheduled endpoint accepts authenticated cron traffic only and returns diagnostic context without leaking credentials:

```ts
export async function handleScheduledAutomation(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const result = await runAutomationJobByTaskUid(taskUid);
    return res.json({ ok: true, result, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      context: { url: req.originalUrl, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Terminal and Validation Work Performed

The following command categories were run repeatedly during implementation. Raw terminal transcripts are not reproduced because they can contain environment paths, session-sensitive metadata, and non-actionable noise; the commands and verified results are preserved below.

| Command or operation | Purpose | Latest verified result |
|---|---|---|
| `pnpm check` | TypeScript contract verification. | Passed with no errors. |
| `pnpm test` | Full Vitest regression suite. | Passed: 6 files, 22 tests. |
| `pnpm build` | Vite client plus esbuild server production build. | Passed. The client chunk-size advisory is non-blocking. |
| `pnpm audit --prod --json` | Runtime dependency security audit. | Zero low, moderate, high, and critical findings. |
| `pnpm audit --json` | Full production + development dependency security audit. | Zero low, moderate, high, and critical findings. |
| `curl http://127.0.0.1:3000/` | Development runtime health check. | HTTP 200. |
| `git diff --check` | Whitespace and patch-integrity check. | Passed. |
| `git push github main` | Private GitHub synchronization. | Fast-forward only; no force-push and no rebase onto unrelated history. |
| Development-server restart | Dependency reload and runtime verification after validated upgrades. | Clean restart and HTTP 200. |

## Reliability and Security Repairs

| Repair | Why it was needed | Verified result |
|---|---|---|
| Weekly readiness gate | An incomplete source pack or uncleared health flag could previously be missed by weekly readiness. | Weekly readiness now consumes the shared full draft-readiness contract; regression coverage added. |
| Approval/dashboard wording | Owner copy needed to state the actual source-pack and health-flag contract. | UI wording aligns with server enforcement. |
| Cron error diagnostics | Failure responses needed actionable, non-secret context. | Scheduled errors include callback URL and authenticated task UID context. |
| Dependency remediation | GitHub audit signals led to direct and transitive dependency review. | Compatible updates and pnpm overrides were applied; final full audit is zero across all severity levels. |
| GitHub history safety | Existing user repositories were unrelated to this workspace. | A dedicated private repository was created and current `main` was pushed without rebase or force-push. |

## Browser, Connector, and Login Status

The associated read-only record is `docs/session-status-audit-2026-08-18.md`. The key distinction is that **connector authorization is not the same as a live browser login**.

| Check | Current verified state |
|---|---|
| Google browser session | Browser account chooser shows `balajirajput968@gmail.com` as **Signed out**. |
| GitHub browser session | Browser was redirected to the GitHub sign-in page. |
| Google Workspace, Calendar, Gmail | Enabled configured connectors with `balajirajput968@gmail.com` known and agent-authorized. |
| GitHub connector | Enabled; used to synchronize the private NeuroPulse repository. |
| Instagram connector | Enabled with `@bala.jirajput966` known and agent-authorized. |
| Instagram Creator Marketplace | Enabled connector. |
| Meta Ads Manager | Enabled with `balajidilip930@gmail.com` known and agent-authorized. |
| Google Gemini connector | Disabled. |
| “Thug” / “Account Integrity” | No matching configured connector was found. These are not verified active logins without a precise URL or service name. |

No credentials, tokens, cookies, OTPs, or account-recovery material were inspected or exposed in this review.

## GitHub and Rebase Status

The codebase is now in the dedicated private repository [`balajirajput96/neuro-pulse-content-studio`](https://github.com/balajirajput96/neuro-pulse-content-studio). The managed deployment remote remains separate as `origin`, while the private repository is `github`.

> **No unsafe rebase was performed.** There was no compatible ancestor in the earlier repositories, so rebasing onto them would have risked conflicts and history damage. The safe operation was a new private repository plus normal fast-forward pushes of `main`.

The local full dependency audit is clean. GitHub’s Dependabot detail endpoint cannot be read with the connected integration (HTTP 403), so remote alert records are documented as access-limited rather than dismissed or silently ignored.

## Remaining Owner/Provider Blockers

| Blocker | What is needed | Why it cannot be safely bypassed |
|---|---|---|
| Voice workflow | A clean 60–90 second single-speaker Hinglish MP3/M4A/WAV recording from the creator. | Existing Instagram candidates were unsuitable for safe voice-reference approval. |
| Meta developer setup | Official Meta two-factor recovery/verification, then developer app and Page access. | Account-security verification must be completed by the owner; no bypass is attempted. |
| Google AI Studio | Provider restriction clearance and required IAM role or owner-created restricted key for `galvanized-future-q8kj5`. | Google anti-abuse and project IAM controls are provider/owner controlled. |
| New authorized service | A supported native Meta service or owner-authorized replacement connector. | Credentials or connector capabilities cannot be fabricated. |

## Safe Continuation Commands

After cloning the private repository, a developer can run:

```bash
git clone https://github.com/balajirajput96/neuro-pulse-content-studio.git
cd neuro-pulse-content-studio
pnpm install
pnpm check
pnpm test
pnpm build
pnpm audit --json
```

The project intentionally does not include an automatic publishing command. Future platform submission must be added only with an explicit owner confirmation immediately before each public post.
