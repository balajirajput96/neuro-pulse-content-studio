# NeuroPulse Reliability-Gap Audit

**Audit date:** 18 August 2026  
**Scope:** Backend readiness rules, owner approval, scheduled handlers, dashboard safeguards, runtime diagnostics, and regression coverage.

## Auditable Checklist

| Area                             | Verification performed                                                | Outcome  | Resolution or classification                                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Weekly bundle readiness          | Reviewed `runWeeklyCompilation()` and its readiness predicate.        | Resolved | `isDraftReadyForWeeklyCompilation()` requires citation, limitation, non-medical-advice disclosure, complete source pack, cleared health flags, BGM, and voice readiness.                                     |
| Owner approval                   | Reviewed `approveDraftForOwner()` and `approvalBlocker(...)`.         | Verified | Owner approval remains server-enforced and cannot bypass source-pack or health-red-flag requirements.                                                                                                        |
| Scheduled callback authorization | Reviewed `/api/scheduled/*` handlers and new focused tests.           | Resolved | Every callback requires `user.isCron` and authenticated `taskUid`; non-cron calls receive HTTP 403.                                                                                                          |
| Scheduled failure diagnostics    | Tested rejected automation execution through the scheduled handler.   | Resolved | HTTP 500 payloads now include callback URL and authenticated task UID for investigation.                                                                                                                     |
| Dashboard approval messaging     | Reviewed weekly and owner-approval copy against the backend contract. | Resolved | UI explicitly identifies complete source pack and cleared health red flags as approval and compilation requirements.                                                                                         |
| Public publishing boundary       | Reviewed automation, handler registration, and integration ledger.    | Verified | No public upload, publish, or auto-publish job exists; all external submission permissions remain disabled.                                                                                                  |
| Runtime health                   | Checked the development server and fresh log window.                  | Verified | `GET /` returns HTTP 200; no post-fix missing-export, syntax, compilation, or study-candidate database failures were found.                                                                                  |
| Regression coverage              | Ran focused and complete unit suites.                                 | Verified | Scheduled-handler checks cover cron-only and failure context; shared reel-readiness coverage verifies the contract used by dashboard and weekly automation; full suite reports 6 files and 22 tests passing. |
| Production build                 | Ran the full production build.                                        | Verified | Client and server bundles build successfully. The only advisory is a client chunk above 500 kB, which is non-blocking performance work rather than a correctness defect.                                     |

## Open Items That Are Not Code Defects

| Item                          | Why it remains open                                                                                         | Required owner or provider action                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Clean creator voice input     | Existing Instagram sources did not meet the required clean 60–90 second, single-speaker narration standard. | Upload a creator-authorized 60–90 second M4A, MP3, or WAV recording.                                         |
| Meta developer setup          | Official two-factor verification is unresolved; no developer app or Page permission can be safely created.  | Complete official Meta account recovery and verification.                                                    |
| Google AI Studio access       | Provider anti-abuse restriction and missing project IAM permission remain in force.                         | Obtain Google clearance and least-privilege project-owner access or an owner-created restricted key.         |
| Additional service connection | No authorized social publishing connector is available.                                                     | Authorize a supported official connector only after the relevant account security requirements are complete. |

> These open items are deliberately blocked rather than worked around. They do not indicate a code failure and must not be bypassed through extracted credentials, fabricated access, or automatic public posting.

## Validation Commands and Results

| Command                                              | Result                             |
| ---------------------------------------------------- | ---------------------------------- |
| `pnpm check`                                         | Passed with no TypeScript errors.  |
| `pnpm vitest run server/scheduledAutomation.test.ts` | Passed: 2 tests.                   |
| `pnpm test`                                          | Passed: 6 files and 22 tests.      |
| `pnpm build`                                         | Passed; bundle-size advisory only. |
| `curl http://127.0.0.1:3000/`                        | Returned HTTP 200.                 |

## GitHub State

The verified workspace branch is synchronized to the dedicated private repository [`balajirajput96/neuro-pulse-content-studio`](https://github.com/balajirajput96/neuro-pulse-content-studio). The managed deployment remote remains intact as `origin`; GitHub is a separate `github` remote. No rebase, force-push, or unrelated-history rewrite was used.
