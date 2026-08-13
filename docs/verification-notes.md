# Verification Notes

## Authenticated preview check

The signed-in workspace user reached the dashboard and all five workflow sections rendered correctly. The current working-draft button initially invoked the protected mutation but was rejected because the configured OpenID did not match the signed-in administrator. The guard was updated to use the authenticated administrator role, and the verified workspace owner was assigned that role.

The owner then initialized the current source-backed working draft successfully. The dashboard rendered the evidence-screened study, DOI, narration spans, four hosted keyframe thumbnails, BGM and voice statuses, all three mandatory readiness flags, the citation limitation sentence, the weekly bundle state, and all three blocker notices. DOM checks confirmed that the approval button is disabled while the voice is blocked, all four keyframes have loaded, and all three blocker cards are present. Sidebar navigation moved the view directly to the Draft reels section.

The authenticated sidebar targets were then checked individually. **Daily research** positioned the source card and its evidence metadata at the viewport entry, while **Weekly compilation** positioned the seven-reel bundle tracker at the viewport entry. Both sections scrolled to their intended content without errors.

The remaining authenticated targets were also exercised. **Publishing status** positioned the owner-controlled gate and platform-readiness panel at the viewport entry, and **Content log** positioned the duplicate-protection archive state at the viewport entry. All five sidebar targets therefore reached the intended sections in the authenticated desktop dashboard.

The secure sign-in entry was rendered and checked at a 375×812 mobile viewport. A separate mobile-emulation browser session reaches the Manus OAuth sign-in screen rather than inheriting the authenticated desktop session, so the full authenticated mobile workflow could not be exercised in that isolated session. The mobile layout remains responsive by design and should be checked once in the owner’s browser after deployment.
