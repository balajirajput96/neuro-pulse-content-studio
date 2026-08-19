# NeuroPulse Google Services Setup Status

**Account context:** `balajirajput968@gmail.com`  
**Status date:** 13 August 2026  
**Operating principle:** Research, scripting, asset organization, and readiness reviews can be scheduled privately. Any public social-platform submission remains a separate owner-confirmed action.

## Completed Setup

| Service              | Completed configuration                                                                                                                                                                                | Current operating boundary                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Google Drive         | The existing `Neuroscience Reels Content` workspace now contains folders for research intake, Hinglish scripts, voice samples, visuals, draft reels, weekly compilations, publish review, and archive. | Assets remain in the owner-controlled Drive workspace; no sharing or deletion was performed.                                |
| Gemini               | A daily private NeuroPulse neuroscience research brief is configured.                                                                                                                                  | It produces editorial material only and does not post externally.                                                           |
| Gemini Spark         | Daily research intake, daily Hinglish reel-draft preparation, and weekly compilation-readiness review have been configured and recorded.                                                               | Spark must not upload, publish, post, send, or otherwise act on YouTube, Instagram, Facebook, or another external platform. |
| NeuroPulse dashboard | Private PubMed intake and weekly preparation schedules are enabled.                                                                                                                                    | The dashboard retains owner-only manual approval and has no automatic publish route.                                        |

## AI Studio and Google Cloud Status

| Item                                   | Observed result                                                                                               | Next official action                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI Studio API key in free-tier project | Google rejected automated generation with a suspicious-request error.                                         | Create the project/key manually in a normal Google session after Google clears the restriction. Do not attempt to bypass the restriction.                         |
| API key in `galvanized-future-q8kj5`   | AI Studio reported that this account does not have permission to create a key in that project.                | An authorized project owner must grant this account the least-privilege **API Keys Admin** role (`roles/serviceusage.apiKeysAdmin`) or create the key themselves. |
| Project IAM view                       | The current account lacks `resourcemanager.projects.getIamPolicy`, so it cannot inspect or alter project IAM. | A project owner must perform the IAM grant; this account cannot self-grant access.                                                                                |
| Dedicated `NeuroPulse GenAI` project   | AI Studio rejected automated project creation with a suspicious-request error.                                | Create it manually only after the Google restriction clears.                                                                                                      |

> A Gemini API key does not itself connect Gemini Spark to external services. Gemini Spark supports its own connected applications or a valid custom MCP endpoint. Any API key must be stored only in an approved secret location, never in chat, source code, or a public Drive file.

## Outstanding Content-Production Blockers

The content workflow still needs a clean 60–90 second creator voice sample, available visual-generation quota for remaining clips, and an administered Facebook Page before a final draft can be manually submitted to relevant platforms. The incomplete Meta Developer registration has not created an app or enabled any publishing permission.

## Manual Publishing Boundary

> A broad instruction to continue automation does not authorize a public post. Before any public submission, the owner must receive the exact target platform, final asset, title/caption, and citation/disclaimer package and provide a separate confirmation immediately before submission.
