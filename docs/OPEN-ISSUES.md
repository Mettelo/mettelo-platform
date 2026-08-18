# Open issues and verification backlog

Last audited: 18 August 2026

This file records gaps evidenced by the repository or unresolved by the dated launch/Phase 1 documents. “TODO: confirm” means the answer depends on hosted configuration or current production evidence that is not stored in Git.

## P0: Versioned Supabase baseline is incomplete

**Evidence:** Application code queries these tables, but no migration in `supabase/migrations/` creates them:

- `career_application_events`
- `career_applications`
- `career_roles`
- `content_posts`
- `email_delivery_attempts`
- `email_outbox`
- `notification_event_catalogue`
- `notification_preferences`
- `notifications`
- `project_runs`

The careers endpoint also uploads to `career-cvs`, while no versioned migration creates that bucket or its Storage policies. Later migrations alter/reference some missing objects, which suggests an older or manual hosted baseline that is not in the repository.

**Impact:** A new developer cannot prove that a blank Supabase project can be built to production-equivalent state from Git. Careers, content, notifications/email delivery, and project-run features may fail on a clean environment.

**Resolution:** Pull/derive the authoritative schema from the approved hosted project, review it for secrets and production-only data, add an idempotent baseline migration (or ordered create migrations), include bucket policies, run security/performance advisors, and prove a clean staging bootstrap. Document the process here and in [Architecture](ARCHITECTURE.md).

## P0: Credentialed staging environment is not evidenced in the repository

**Evidence:** The release workflow requires `E2E_BASE_URL`, a non-production Supabase URL/keys, and disposable member/Architect/Admin accounts. External secrets and a staging project cannot be verified from Git.

**Impact:** If secrets are absent, stale, or point at an unsafe project, `staging-e2e`/`Release gate` cannot pass. Backend journeys remain unproven even if the static build is green.

**Resolution:** TODO: provision/confirm the dedicated Supabase staging project or branch, apply the complete schema, seed a public project and career role, configure all `E2E_*` secrets, run the suite, and capture a green release-gate run.

## P1: Phase 1 browser gate is not part of CI

**Evidence:** `npm run test:phase1-browser` exists, and commit `4a9c85b` parallelized it, but `.github/workflows/ci.yml` runs `npm run test:regression`, whose file list excludes `tests/phase1-browser.spec.ts`.

**Impact:** Authentication/onboarding UI can regress while the current required CI commands remain green.

**Resolution:** Add the Phase 1 browser suite to CI or include it in the regression command, then manage runtime through sharding/parallelism rather than dropping criteria.

## P1: Hosted deployment protections need confirmation

**Evidence:** The repository has CI workflows but no branch-protection or Vercel project configuration. Vercel deployment is external to the workflow.

**Open checks:**

- TODO: confirm `main` is the Vercel Production branch.
- TODO: confirm pull requests receive Preview deployments with Preview-scoped variables.
- TODO: require GitHub check **Release gate** and pull-request review before merging to `main`.
- TODO: document who can promote/rollback Production and the exact Vercel procedure.
- TODO: confirm Vercel Cron and `CRON_SECRET` are active.

## P1: Production authentication acceptance is not closed

**Evidence:** [PHASE_1_SUCCESS_CRITERIA.md](../PHASE_1_SUCCESS_CRITERIA.md) remains `IN PROGRESS`, and [LAUNCH_READINESS.md](../LAUNCH_READINESS.md) requires Production tests for signup, verification, sign-in, reset, OAuth, session persistence, callbacks, and onboarding.

**Resolution:** Run all 125 criteria against the current deployed origin and hosted Supabase templates, record evidence/date, and update the status rather than inferring completion from code/build.

## P1: Footer contains a route with no page

**Evidence:** `app/layout.tsx` links to `/post-opportunity`, but no `app/post-opportunity/page.tsx`, redirect, or rewrite was found.

**Impact:** “Post an opportunity” reaches the 404 page.

**Resolution:** Implement the intended organisation submission journey or point the link to an existing route/section; add it to the interaction/browser audit.

## P1: Development preview routes are present in the production route tree

**Evidence:** `app/dev/` contains multiple preview/responsive-gate pages, and middleware does not restrict `/dev/*`.

**Impact:** Internal fixtures/preview surfaces may be publicly discoverable and can drift from the product.

**Resolution:** Decide whether these are intentional public test fixtures. If not, exclude/gate them outside development and add a production-build route assertion. TODO: confirm none expose sensitive data.

## P1: Mobile-navigation stabilization needs deployed device evidence

**Evidence:** Git history contains repeated rebuild/restore/fix commits for visibility, stacking, first-open rendering, and click behavior. The current working tree directly renders the drawer, synchronizes the toggle state, and updates the static contract.

**Remaining verification:** Run the first-open, close/reopen, Explore, link, account, Escape, outside tap, focus-trap, rotation/reduced-motion, and scroll cases on 320/375/390/430px, phone landscape, iOS Safari, Android Chrome, and 200% zoom. Commit the current working-tree fix and keep its regression checks required.

## P1: Canonical domain and auth origins need confirmation

**Evidence:** The owner identifies `mettelo-platform.vercel.app` as live; metadata/auth fallbacks use `https://mettelo.com`; `.env.example` also uses `https://mettelo.com`.

**Impact:** Email/OAuth links can return to the wrong deployment when `NEXT_PUBLIC_SITE_URL` or Supabase allowed redirects do not match.

**Resolution:** TODO: confirm the active public/canonical domain, configure environment-specific origins and redirects, and update metadata, sitemap, emails, and this documentation together.

## P1: Launch content and ownership require re-verification

Carried forward from [LAUNCH_READINESS.md](../LAUNCH_READINESS.md):

- verify every official social URL, especially LinkedIn/Instagram decisions;
- publish only events, opportunities, projects, testimonials, logos, and member proof backed by real owners/permission;
- assign owners for recurring editorial, opportunity, event, and project data quality;
- confirm the Admin content workflow and missing `content_posts` baseline are sufficient before calling the CMS/data path operational.

## P2: Analytics reporting is not evidenced

**Evidence:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` and event calls exist, but no production ID, event taxonomy/dashboard, consent decision, or GA DebugView evidence is versioned.

**Resolution:** TODO: confirm the approved analytics/privacy configuration, name the owner, document events/conversions, and verify them on Production.

## P2: Final SEO/social asset and metadata crawl remain open

**Evidence:** `public/og-image.svg` is still the interim Open Graph asset called out in launch readiness. Secondary routes may inherit root metadata.

**Resolution:** Export/approve a 1200×630 PNG/JPG where required by target platforms, crawl route headings/metadata/canonicals, and add an automated link/metadata check.

## P2: Accessibility and cross-browser sign-off is incomplete

**Evidence:** The code includes focus, labels, live regions, reduced-motion, and responsive checks, but the launch audit still requests automated WCAG plus manual keyboard/screen-reader/device QA.

**Resolution:** Record WCAG 2.2 AA evidence for key journeys, including validation/errors, drawers, review flows, Admin tables, 200% zoom, iOS Safari, Android Chrome, and tablet.

## P2: Legal identity/review remains external

**Evidence:** Privacy, Terms, and Community Guidelines exist; launch readiness still requires legal review and formal controller/company identity/contact details as the organisation formalises.

**Resolution:** TODO: obtain owner/legal approval before paid services, employer talent products, or high-volume international processing, then version the approved copy/date.

## P2: Newsletter has no dedicated Admin subscriber queue

**Evidence:** `/api/newsletter` persists/upserts preferences and sends confirmation, but no dedicated Admin subscriber route was found.

**Decision needed:** Confirm whether subscriber operations intentionally remain provider/database-only or whether consent history, export, suppression, and support tools need a governed Admin view.

## P2: Historical readiness documents contain stale assertions

Examples:

- `LAUNCH_READINESS.md` says a lockfile must be added; `package-lock.json` now exists.
- It says project applications beyond interest need project-specific entities/Admin review; those routes and tables are now represented.
- It says recurring content needs a data/CMS workflow; Admin content code now exists, although its table baseline is missing.
- External configuration, real content, analytics, legal, and device QA items remain unverified.

**Resolution:** Re-run the launch audit after the P0/P1 items, date every verification, and update the original document without erasing its historical context.

## P2: Local lint traverses generated Next.js output

**Evidence:** Running the configured `eslint .` after a local build traverses `.next/` and reports thousands of errors in generated bundles; the generated, currently untracked `next-env.d.ts` also triggers the triple-slash rule. Linting the source paths directly completes with zero errors and eight warnings.

**Impact:** A developer can receive a false blocking lint result depending on whether a build has already run, while a clean CI checkout behaves differently.

**Resolution:** Add generated directories/files to ESLint's global ignores according to the repository's Next.js/TypeScript policy, decide whether `next-env.d.ts` should be tracked or ignored, and add a repeatability check that `build → lint` and `lint → build` have the same source result. Address the remaining source warnings separately.

## Maintenance

Close an item only with a commit, CI/deployment evidence, or a named owner/date for an external verification. Move consequential resolutions into [DECISIONS.md](DECISIONS.md); do not delete their history.
