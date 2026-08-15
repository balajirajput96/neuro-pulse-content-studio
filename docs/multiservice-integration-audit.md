# NeuroPulse Multi-Service Integration Audit

**Audit date:** 15 August 2026  
**Scope:** Private editorial workflows only. No public-posting, scheduling, or upload permission has been enabled.

| Service | Verified state | Private use permitted in NeuroPulse | Public submission state | Next safe action |
|---|---|---|---|---|
| NeuroPulse dashboard | Daily PubMed intake and weekly readiness cron are enabled. | Yes. | Disabled by design. | Review research candidates and readiness ledger. |
| Google Workspace | Authorized account access is enabled. | Yes, for Drive organization and internal materials. | Not applicable. | Keep source packs and drafts in private folders. |
| GitHub | Authorized connector and private repositories are available. | Yes, for non-secret code, policies, prompts, tests, and changelogs. | Not applicable. | Use a private repository; exclude tokens, cookies, and raw private media. |
| Gemini Spark | Private research, Hinglish draft, and readiness schedules exist. | Yes. | Disabled. | Use outputs as editorial inputs only. |
| Instagram | An authorized account is present in the connector configuration. | Limited to later owner-directed review workflows. | Disabled in this workspace; no scheduled/automatic action. | Require a fresh confirmation immediately before any future manual submission. |
| Google Antigravity CLI | The `agy` executable is not installed in this execution environment. | Not yet. | Disabled. | Install and authenticate only on an owner-controlled machine with narrow permissions. |
| Julius | No authorized Julius connector is configured for this workspace. Julius documents data connectors and an MCP Store; it also states that Julius itself cannot currently be called through an API. [3] | Not yet. | Disabled. | Review Julius’s owner-account connector/MCP options before authorizing a private data-analysis workflow. |
| YouTube | No authorized integration is configured. | Not yet. | Disabled. | A future limited OAuth flow must create only an owner-review state, never a scheduled upload. |
| Meta / Facebook | Meta app setup is blocked by unresolved official two-factor verification. | No. | Disabled. | Complete official verification and formal Page/app setup before reassessment. |
| Google AI Studio | Project/key creation is blocked by provider restrictions and missing IAM. | No. | Disabled. | Wait for Google clearance and an owner-provided, restricted credential path. |

## Antigravity assessment

Google Antigravity CLI officially supports Linux installation, account-based authentication, configurable permissions, and local or remote MCP connections. Its default posture asks before sensitive operations; its permission model supports `allow`, `ask`, and `deny`, with `deny` taking precedence. [1] [2] The current workspace does not contain the CLI executable, so no Antigravity action has been taken and no broad permission profile has been created.

> **Recommended future permission policy:** allow only the NeuroPulse workspace directory, specific test/build commands, and explicitly approved MCP tools. Keep browser execution, remote URLs, credentials, destructive commands, and all social-platform actions in `ask` or `deny` state.

## Julius assessment

Julius offers data connectors and an MCP Store for connecting external tools. Its own documentation distinguishes the ability to call external APIs *from Julius* from an inbound API that would let an external workflow call Julius; the latter is not currently available. [3] [4] Consequently, the reliable current design is to treat Julius as an optional owner-operated analysis surface, not as the trigger for NeuroPulse automation.

## GitHub reproducibility policy

Only private repositories should store version-controlled, non-secret material: query templates, editorial policy, prompt templates, schema changes, tests, and changelog notes. The repository must never contain API keys, cookies, OAuth tokens, voice references, raw social sessions, or video assets. Material changes require tests and a checkpoint before deployment.

## Public-submission boundary

Every row in the dashboard ledger has `publicSubmissionAllowed = false`. A future platform connection may only add a **Prepare for Owner Review** state. The actual public action must show the exact asset, destination account, caption, citation/disclaimer package, and visibility, then receive a fresh one-use owner confirmation immediately before submission.

## Verification note

The unauthenticated development preview correctly presents only the secure sign-in screen; private run history, integration status, source packs, and schedule controls remain inaccessible until the owner session is established.

## References

[1] [Google Antigravity CLI — Installation & authentication](https://antigravity.google/docs/cli/install)

[2] [Google Antigravity CLI — Permissions](https://antigravity.google/docs/cli/permissions)

[3] [Julius — Secret Keys and Connections](https://julius.ai/docs/get-started/apis)

[4] [Julius — Launch Week MCP Store announcement](https://julius.ai/launch-week)
