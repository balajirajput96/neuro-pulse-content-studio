# NeuroPulse Session and Integration Status Audit

**Audit date:** 18 August 2026  
**Audit boundary:** Read-only checks only. No login, logout, credential extraction, cookie inspection, account setting change, or external action was performed.

## Browser Session Checks

| Service checked | Observed browser state | Interpretation |
|---|---|---|
| Google Accounts | The account chooser displays `balajirajput968@gmail.com` as **Signed out**. | The browser retains an account chooser entry, but no active Google browser session is present. |
| GitHub | Opening the profile-settings URL redirected to the GitHub sign-in screen. | No active GitHub browser session is present. |
| Instagram | The home feed, Messages, Professional dashboard, and post-management controls are visible. | An active Instagram browser session is present. The audit did not open messages, alter settings, create media, or publish. |
| Facebook | The home feed identifies **Balaji Rajput** and shows profile, Reels, and Ads Manager navigation. | An active Facebook browser session is present. The audit did not access messages, alter settings, create a post, or publish. |

## Configured Session Handles

| Handle | Status | Known authorized account information |
|---|---|---|
| My Browser | Enabled | Provides access to a user browser when connected; browser login should not be inferred from connector enablement. |
| Playwright | Enabled | Browser automation capability only; it is not evidence of a website login. |
| Google Workspace | Enabled | `balajirajput968@gmail.com` is known and agent-authorized in the connector configuration. |
| Google Calendar | Enabled | `balajirajput968@gmail.com` is known and agent-authorized in the connector configuration. |
| Google Ads | Enabled | Enabled connector; no browser-login claim made. |
| Gmail | Enabled | `balajirajput968@gmail.com` is known and agent-authorized in the connector configuration. |
| GitHub | Enabled | Connector access is enabled and was used for the dedicated private repository; the browser itself is signed out. |
| Instagram | Enabled | `@bala.jirajput966` is known and agent-authorized in the connector configuration; this is connector authorization, not a browser-session claim. |
| Instagram Creator Marketplace | Enabled | Enabled connector; no browser-login claim made. |
| Meta Ads Manager | Enabled | `balajidilip930@gmail.com` is known and agent-authorized in the connector configuration; no Meta browser session was verified in this audit. |
| Google Gemini | Disabled | No current configured Gemini connector session. |

> **Important distinction:** A configured connector can have an authorized account while the browser itself remains signed out. Neither status reveals, stores, or exposes credentials, session cookies, tokens, OTPs, or personal account-recovery data.

## Unverified Names

No configured connector matching **“Thug”** or **“Account Integrity”** was identified in the read-only session audit. These names may refer to a browser tab, a website feature, an account-security screen, or a different service; they are not treated as active logins without a specific, owner-provided URL or service name.
