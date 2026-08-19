# NeuroPulse Content Model

The workspace has six connected records. A **study candidate** represents a source screened for editorial use. A **reel draft** transforms one study candidate into a short-form production record and stores the three mandatory readiness flags. A separate **citation record** keeps the journal-level factual anchor and limitation text close to the draft. A **weekly compilation** groups exactly seven draft reels. A **content-log entry** records topics that have already been used so incoming candidates can be flagged as possible repeats. A **blocker notice** captures a workflow constraint that must remain visible until resolved.

| Record             | Key relationship                    | Safety or workflow rule                                                                     |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Study candidate    | Can be linked to one or more drafts | Must retain title, journal, DOI/PMID, study type, and pass/fail status.                     |
| Reel draft         | Belongs to a study candidate        | Cannot be manually approved unless all three readiness flags are true.                      |
| Citation record    | Belongs to one draft                | Stores journal, year, DOI, study type, limitation sentence, and synthetic-voice disclosure. |
| Weekly compilation | Contains seven draft reels          | Is ready only when all seven linked drafts are ready.                                       |
| Content log        | References a used topic             | Normalized topic strings are compared to incoming study candidates.                         |
| Blocker notice     | Owned by the workspace owner        | Voice, quota, and Facebook Page constraints must be surfaced prominently.                   |

> **Approval boundary:** Public publishing is not modelled as an automated process. The only state transition allowed by this workspace is an explicit owner-only change from `approved = false` to `approved = true`; no external upload is initiated.
