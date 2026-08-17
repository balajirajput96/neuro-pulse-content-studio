# Instagram Voice-Reference Assessment

**Assessment date:** 17 August 2026  
**Purpose:** Private narration-readiness screening only. This record does not authorize voice generation, media creation, or public posting.

## Authorization and boundary

The workspace owner authorized assessment of audio from the Instagram account `@balajirajput96` as a potential voice-reference source. The authorization is limited to private technical screening for the NeuroPulse workflow. A voice model must not be generated unless the source is confirmed suitable and the creator provides explicit authorization for the applicable voice-generation service.

## Observed creator-posted candidates

| Reel | Observable status | Duration evidence | Assessment result |
|---|---|---:|---|
| `DcD2rZ8zolv` | Creator-owned reel; original audio label; visibly recorded in a shared indoor environment | Not retained as a qualifying source | **Rejected for reference** because the recording environment appears unsuitable for a clean narration source. |
| `DcD5CPMTwVd` | Creator-owned direct-to-camera reel; original audio label | Not yet sufficient as a standalone 90-second reference | **Provisional only**; it needs source-level audio extraction and signal-quality review before any use. |
| `DcIcwDPT6qw` | Creator-owned educational reel; original audio and AI-content labels | Browser media element reported **43.008 seconds** | **Rejected as a standalone reference** because it is below the requested 60–90 seconds and its AI-content presentation requires source-voice provenance verification. |
| `DcD5CPMTwVd` | Creator-owned direct-to-camera reel; `@balajirajput96` and original-audio labels visible | Browser media element reported **89.002 seconds** | **Private assessment candidate.** An 18-second local audio capture was created only to perform reproducible clarity and speaker-continuity checks; no voice service received the capture. |

## Current readiness decision

The production draft remains **blocked**. No voice cloning request has been made and no generated narration has been created. The safest next input remains either a creator-uploaded 60–90 second clean single-speaker recording or clearly creator-voiced, low-noise material that can be independently verified and explicitly confirmed before any voice-service submission.

## Reproducible assessment artifact

The private 18-second assessment capture from `DcD5CPMTwVd` was analyzed without being submitted to a voice-generation service. The capture used an Opus stereo stream at 48 kHz. Speech-to-text detected Hindi, with timestamped speech covering **17.5 of 18.0 seconds (97.2%)** in two adjacent segments and no detected silence boundary above the configured threshold. These facts support that the captured segment contains continuous speech, but they do **not** independently establish speaker identity or prove the absence of music/background contamination. The segment is therefore rejected for the intended neuroscience narration workflow.

| Check | Reproducible result | Decision impact |
|---|---|---|
| Captured segment duration | 18.0 seconds | Insufficient to independently qualify a full reference. |
| Underlying creator reel duration | 89.002 seconds | Falls within the requested duration window, but duration alone is not sufficient. |
| Detected speech coverage | 97.2%, Hindi, two adjacent timestamped segments | Indicates continuous spoken audio in the captured portion. |
| Speaker continuity | Diarization not independently verified | Cannot qualify the source. |
| Music/noise contamination | Signal-only metrics cannot certify absence | Cannot qualify the source. |
| Workflow result | `rejected_pending_clean_source` | Draft voice status remains `blocked`; no generation or public action is permitted. |

## Prohibited follow-on actions until readiness changes

The workflow must not submit audio to a third-party voice service, generate imitation audio, replace narration in a reel, or publish content. Any future service integration still requires its own explicit owner confirmation immediately before submitting the audio.
