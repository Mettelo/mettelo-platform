# My Mettelo Home v3 release evidence

This runtime-neutral note records the release-verification intent for the My Mettelo Home v3 change.

The exact-head release remains blocked until GitHub's required Release Gate succeeds. The authenticated staging lane must run public Chromium regression, authenticated My Mettelo Home responsive QA, Mettelo Lab visual QA, and persisted submission checks without weakening any assertion. A previous exact-head attempt became stuck inside Playwright Chromium installation before product/browser tests ran; this documentation-only commit intentionally requests a fresh exact-head CI run on a new GitHub-hosted runner while preserving the implementation and test contract unchanged.

Deployment/Vercel status is monitored separately and is not a pre-merge blocker when the exact-head Release Gate is green, per the active release decision for this change.
