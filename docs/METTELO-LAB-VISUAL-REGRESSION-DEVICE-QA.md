# Mettelo Lab Phase 18 — Visual Regression & Device QA

## User outcome
Mettelo Lab should remain visually stable across the approved desktop, tablet and mobile matrix, enlarged text and short mobile landscape conditions. Device differences must not create hidden controls, horizontal scroll, jumping navigation or overlapping fixed/sticky UI.

## Scope
Phase 18 is intentionally test-led. It does not add a new presentation layer and does not change application business logic.

The existing `mettelo-lab-visual.spec.ts` remains the screenshot owner for the full Lab matrix:
- 320×740
- 360×800
- 375×812
- 390×844
- 412×915
- 414×896
- 430×932
- 768×1024
- 1024×900
- 1440×900

The new `mettelo-lab-device-qa.spec.ts` adds focused regression checks for conditions that are difficult to protect through screenshots alone.

## Device QA contracts
### 200% text zoom
Every core Lab destination is opened at 390×844 with the root font size increased to 200%. The test rejects document/body horizontal overflow and interactive controls that escape the viewport.

### Mobile More hierarchy
Plan, Proof, Resources, Events and Team must keep the mobile More trigger programmatically current. The test protects both `aria-current="page"` and `data-more-current` so location is not communicated by colour alone.

### Short mobile landscape
At 430×500:
- the Lab mobile navigation stays visible;
- Chat composer remains visible and above the bottom navigation;
- Chat and More remain horizontally contained;
- visible interactive controls remain inside the viewport.

### Existing screenshot evidence
The established Mettelo Lab visual test continues to capture screen-by-screen screenshots across the full viewport matrix with reduced motion enabled and animations disabled.

## Preservation boundary
Unchanged:
- auth and RLS;
- project/run membership and permissions;
- all APIs and persistence;
- Tasks/Data/Proof/Resources/Events/Chat business behaviour;
- navigation destinations and route contracts;
- production data.

## CI contract
`tests/mettelo-lab-device-qa.spec.ts` is included in both authenticated smoke and staging E2E commands. `scripts/audit-mettelo-lab-device-qa.mjs` is chained into `npm run audit:mettelo-lab`, making the device-QA coverage itself regression-protected.

## Final sign-off
Phase 18 is not complete until the exact-head CI is green and the uploaded Mettelo Lab screenshot artifact is visually inspected for desktop, tablet and mobile regressions.
