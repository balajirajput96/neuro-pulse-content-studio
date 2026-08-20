# Daily Repository Maintenance

## Purpose

The **Daily Repository Health** GitHub Actions workflow provides a bounded daily validation pass for the public NeuroPulse codebase. It complements, but does not replace, the existing private NeuroPulse editorial automations: daily PubMed/Europe PMC research intake and weekly readiness review.

## Schedule and Record

The workflow runs at **02:15 UTC every day** and supports a manual run from the GitHub Actions interface. GitHub Actions run history is the durable, non-secret maintenance record. The workflow is intentionally scheduled before the 03:30 UTC private research intake so the two jobs do not overlap by design.

| Check                          | Purpose                                                   |
| ------------------------------ | --------------------------------------------------------- |
| Locked dependency installation | Confirms the committed lockfile remains reproducible.     |
| Dependency audit               | Detects known dependency advisories.                      |
| Formatting check               | Detects source-style drift without rewriting files.       |
| TypeScript check               | Confirms static contracts.                                |
| Vitest suite                   | Runs the project regression tests.                        |
| Production build               | Confirms client and server bundling.                      |
| Clean source check             | Confirms the workflow itself made no source modification. |

## Strict Boundaries

The workflow has `contents: read` permission only. It does **not** rebase, merge, push, create commits, alter branch history, access connector credentials, log in to third-party accounts, call social publishing APIs, generate media, or publish any content. A failed check produces a GitHub Actions result for owner review; it does not attempt a self-modifying repair.

> Editorial research, draft preparation, and any YouTube, Instagram, or Facebook submission remain outside this workflow. Every public submission still requires a separate owner confirmation immediately before the platform action.

## Owner Operations

Use the repository's **Actions** page to review each run or use **Run workflow** for a one-time manual validation. The workflow is intended to detect maintenance needs, while any source repair remains a reviewed repository change validated through the existing **Verify** workflow.
