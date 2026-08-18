# Architecture and product decision log

This is a running record of consequential choices. Add new entries at the top. Do not record a commit message alone: capture the problem, root cause, fix, reasoning, and source.

## Make backend E2E scope-aware and deployment gate strictly last
**Date:** 18 August 2026  
**Problem:** Documentation-only and CI-policy changes were blocked by a destructive staging job that could not even start because hosted `E2E_*` credentials were absent. At the same time, deployment eligibility needed an explicit final-stage dependency so it could never run when an earlier required gate failed.  
**Root cause:** The workflow treated every pull request as backend-impacting and required staging E2E unconditionally, even when no runtime code, API, schema, auth, package, test, or application configuration changed. It also had no final GitHub Actions job representing deployment eligibility after the aggregate release decision.  
**Fix:** Add a `Change scope` classifier. Pull requests limited to Markdown documentation and CI workflow-policy files are classified `docs-or-ci-policy-only`; all other files require authenticated backend E2E. Every push to `main` always requires the full backend gate. The `Release gate` now validates the classifier result, fast regression result, and staging result according to scope. Add a `Deployment gate` that has `needs: release-gate` and no `always()` override, so it cannot run when Release gate fails.  
**Reasoning:** Critical backend journeys must remain protected, but unrelated infrastructure gaps must not block safe documentation/policy work. The exception is explicit, file-scoped and visible in CI rather than a hidden skip. Re-running the full backend gate on every `main` push prevents a scope exemption from advancing the Rolling Green Baseline without full release evidence.  
**Author/source:** ChatGPT senior-development session with product owner, 18 August 2026; PR #52.

## Adopt a Rolling Green Baseline and mandatory developer cold start
**Date:** 18 August 2026  
**Problem:** Repeated infrastructure/debug cycles were consuming time and creating uncertainty about which state of Mettelo was safe to preserve. A future developer or new ChatGPT session could also inherit a detailed handoff and begin changing the platform without first confirming the actual current `main`, checks, deployment, open PRs, or implementation.  
**Root cause:** The repository had strong test/release rules but no single mandatory entry-point defining when `main` becomes the authoritative baseline, how that baseline advances, or the exact verification a new development session must perform before improvement work.  
**Fix:** Adopt the Rolling Green Baseline: the latest `main` SHA becomes authoritative only after every required quality, regression, security, database, browser, release-gate, and deployment check for that exact state succeeds. Add `docs/DEVELOPER-START-HERE.md`; make it mandatory from `CONTRIBUTING.md`, the docs index, onboarding, and CI/CD guidance; require current-state verification before implementation; define red/amber/green change boundaries; require focused branches/PRs; and require post-merge verification before the baseline advances.  
**Reasoning:** Mettelo must keep improving without turning each improvement into a platform rewrite. A rolling baseline preserves the latest proven working system while allowing intentional changes to become the next baseline only after they earn it through verification. Handoffs remain useful context but cannot replace live repository/deployment evidence.  
**Author/source:** ChatGPT senior-development session with product owner, 18 August 2026; branch `docs/rolling-green-baseline`.

## Normalize optional career links and contain every review column
**Date:** 18 August 2026  
**Problem:** Career candidates who entered a normal protocol-free address such as `linkedin.com/in/name` could not reach Review, and long Review values could force the mobile page wider than the viewport.  
**Root cause:** Both the browser's native `type="url"` constraint and the API's `new URL(value)` check required an explicit scheme. The Review grid and its page-level grid parent did not consistently use zero-minimum columns, while long names, filenames, links, and prose lacked complete wrapping rules.  
**Fix:** Use one shared client/server URL normalizer that prepends `https://` when absent and validates an HTTP(S) public-domain shape; keep URL inputs mobile-keyboard friendly without native scheme enforcement; store the normalized values; constrain the page, form, Review grid, cards, text, links, upload state, and actions to fluid widths; and regression-test Review at 375, 390, and 414 pixels.  
**Reasoning:** A single authoritative normalizer avoids client/API disagreement. Explicit `minmax(0, 1fr)`, `min-width: 0`, and defensive wrapping address CSS grid's default min-content expansion without hiding content or requiring horizontal scrolling. Preserving the hidden form DOM continues to retain the selected CV and all values when a candidate edits.  
**Author/source:** Codex session, 18 August 2026; career application completion and mobile Review repair.

## Repair newsletter schema drift and separate persistence from confirmation delivery
**Date:** 18 August 2026  
**Problem:** Valid addresses submitted through the footer email capture reached `/api/newsletter` but returned “We could not save your email,” while the message rendered beside the input in a narrow column.  
**Root cause:** The hosted `newsletter_subscribers` table had not received the Phase 8 columns used by the route: `marketing_preferences`, `unsubscribe_token`, and `unsubscribed_at`. The generic database-error branch hid the Supabase error. Separately, a broad `.footerNewsletter form { display:flex }` rule placed the conditional status beside the control row.  
**Fix:** Apply and version the focused `20260818083449_repair_newsletter_subscription_schema.sql` migration with explicit service-role grants; log structured Supabase errors server-side; return safe failure categories; keep confirmation email delivery best-effort after persistence; add explicit client validation and success/server states; make the outer form a one-column grid and the input/button their own flex row.  
**Reasoning:** Subscription persistence is the primary transaction and must not be reported as failed because a secondary email provider is unavailable. Private database details stay in server logs, while the UI receives actionable but non-sensitive feedback. A dedicated status row prevents conditional feedback from distorting the controls at any breakpoint.  
**Author/source:** Codex session, 18 August 2026; live Supabase schema and migration-history audit; migration `20260818083449_repair_newsletter_subscription_schema.sql`.

## Render the mobile menu directly and make the existing toggle stateful
**Date:** 18 August 2026  
**Problem:** The drawer could be empty on its first open, and the top-right trigger continued to look like a hamburger while the menu was open.  
**Root cause:** `MobileMenuEnhancer` waited for a client effect to locate the panel and then portalled navigation back into it. That introduced a first-render timing dependency. The native `<details>/<summary>` state was also not synchronized to the toggle's accessible name or icon. A document-level backdrop could participate in the wrong stacking context.  
**Fix:** Render `MobileMenuEnhancer` directly inside `.mobileMenuPanel`; keep the backdrop in the same menu stacking context; synchronize `aria-expanded` and `aria-label`; morph the three bars into an X; retain Escape, outside-tap, focus containment, and focus return.  
**Reasoning:** Direct ownership removes the mount/query/portal race. Reusing the spatially stable top-right trigger makes opening and closing predictable and keeps one authoritative close control.  
**Author/source:** Codex session, 18 August 2026; working-tree changes in `app/layout.tsx`, `components/MobileMenuEnhancer.tsx`, `app/public-chrome.css`, and the resilience audit (not committed at audit time).

## Rebuild the public mobile navigation as an opaque right-hand drawer
**Date:** 17–18 August 2026  
**Problem:** Earlier mobile menus had inconsistent visibility, excessive spacing, click-layer failures, content bleed-through, and repeated regressions during refinements.  
**Root cause:** The navigation evolved through overlapping legacy/rebuilt styles and competing backdrop/panel stacking rules; visibility and interaction contracts were not represented together.  
**Fix:** Consolidate primary/secondary/Explore/account navigation in `MobileMenuEnhancer`, use an opaque viewport-height right drawer with a backdrop behind it, add active states, focus containment, Escape/outside close behavior, animated Explore disclosure, reachable CTAs, and a static resilience contract. Disable the local Next.js issue indicator.  
**Reasoning:** The drawer should enter from the same edge as the trigger, remain readable independently of page content, and be operable by pointer, keyboard, and assistive technology. The contract test protects the behaviors that repeatedly regressed.  
**Author/source:** commits `9d42262` (“Rebuild global public mobile navigation”), `1cccedc` (“Fix mobile menu backdrop stacking and clicks”), `b7f60a1` (“Redesign mobile navigation drawer for clarity”), and `c4dec1d` (“Fix mobile navigation drawer”).

## Preserve the career application DOM through review
**Date:** 17 August 2026  
**Problem:** A candidate could complete the form, reach review, then receive “Enter your full name” or lose the selected CV at final submission.  
**Root cause:** Entering review conditionally unmounted the original form controls. The final `FormData` was built from the form element after those controls—and the browser-owned file input—were removed from the DOM.  
**Fix:** Keep the entry fields mounted inside a hidden/`aria-hidden` container while the review section is displayed, then submit `FormData` from the preserved form. Add route-contract tests and responsive containment fixes.  
**Reasoning:** File inputs cannot be safely reconstructed from summary state. Preserving the controls keeps the browser's selected `File`, avoids duplicated state, and lets the user edit without re-entering valid values.  
**Author/source:** commit `dd2a3cc` (“Fix career application review submission”).

## Require deployment configuration before a production build
**Date:** 17 August 2026  
**Problem:** Deployments could compile while service-backed forms and Admin actions were guaranteed to return configuration errors at runtime.  
**Root cause:** Required Supabase environment variables were checked only inside individual clients/routes.  
**Fix:** Run `scripts/check-deployment-config.mjs` as `prebuild` and fail with the missing variable names. Provide the service-role secret to the CI build environment.  
**Reasoning:** A clear build failure is safer than shipping a deployment whose critical submission paths are known to be unavailable. Feature-specific optional integrations remain runtime-gated.  
**Author/source:** commits `635ffa2` (“Add deployment configuration validation”) and `8f8c78e` (“Provide service key to CI deployment checks”).

## Harden database functions and add missing operational indexes
**Date:** 17 August 2026  
**Problem:** Security advisors flagged mutable function search paths, while relationship/filter columns used by operational queries lacked indexes.  
**Root cause:** Schema growth added functions and foreign-key/query paths faster than a consolidated advisor-driven hardening pass.  
**Fix:** Set a controlled `search_path` on identified functions, add indexes across communications, contributions, opportunity ingestion, Project Architect, and project data-workspace relationships, and remove the obsolete opportunity reverification index.  
**Reasoning:** Explicit function resolution reduces search-path risk; targeted indexes avoid full scans and unindexed relationship checks in Admin/workspace workloads.  
**Author/source:** commit `1fbe8d0` (“Record backend security and indexing hardening migration”), migration `20260817120000_harden_backend_indexes_and_function_path.sql`.

## Use Admin RLS for queue visibility and service role only for privileged enrichment/actions
**Date:** 17 August 2026  
**Problem:** The Admin project-application queue appeared empty when the service-role key was unavailable even though the authenticated user was an Admin.  
**Root cause:** The entire queue query was conditional on constructing a privileged client. Row visibility, auth-directory email lookup, and operational mutations were coupled to the same credential.  
**Fix:** Choose `privilegedDb || auth` for application/profile rows, rely on Admin RLS for the authenticated fallback, and perform auth email lookup only when the privileged client exists. Display a configuration notice when enrichment/actions are unavailable.  
**Reasoning:** Admins should be able to see records through the database authorization model. The service role is reserved for capabilities that authenticated RLS cannot provide, minimizing privileged access and preventing configuration from hiding persisted work.  
**Author/source:** commit `016b6dd` (“Fix admin application queue fallback without service key”).

## Consolidate project interest and role applications into one endpoint
**Date:** 11–17 August 2026  
**Problem:** Project interest and role application journeys could create inconsistent records, validation, notifications, and Admin visibility through separate submission paths.  
**Root cause:** Generic `/api/forms` intake and project-domain intake both handled project requests during the product's evolution.  
**Fix:** Make `/api/project-applications` canonical, distinguish `application_kind` (`interest` or `application`), route the public interest component to it, and remove `project_application` from `/api/forms`. Add duplicate/idempotency handling and a flow contract covering persistence, Admin queue, and notification calls.  
**Reasoning:** One domain endpoint provides one lifecycle policy and one record model while preserving the distinct data requirements of interest (requested contribution area) and a role application (valid role ID).  
**Author/source:** commits `654cf13` (“Unify project interest and application intake”), `d331a33` (“Route project interest through canonical application API”), `8f14573` (“Remove duplicate project interest form endpoint”), `d2aeda4` (“Add project interest end-to-end flow contract test”), and `9759764` (“Add project interest flow test to CI”).

## Keep member project submission available under RLS without the service key
**Date:** 17 August 2026  
**Problem:** An authenticated member could not register project interest when the service-role environment variable was unavailable.  
**Root cause:** Persistence and privileged notification work shared one service-role dependency even though members had an RLS-authorized insert path.  
**Fix:** Persist through the authenticated client when no privileged client exists; run member/Admin notification work only with the privileged client.  
**Reasoning:** The primary user record should not be discarded because a secondary communication dependency is unavailable. The accepted response logs whether notification services were configured so operations can detect partial service.  
**Author/source:** commit `3933eee` (“Allow project interest submissions without service key”), later consolidated into `/api/project-applications`.

## Align project action labels with lifecycle state
**Date:** 17 August 2026  
**Problem:** Cards/detail pages did not consistently expose both “View project” and the correct submission action, and UI state could diverge from server acceptance rules.  
**Root cause:** Pilot interest and role-application availability were inferred independently in presentation components.  
**Fix:** Distinguish interest from role applications using project type/status and align public card/detail actions with the canonical project-application path.  
**Reasoning:** A user should never be offered a submission action the API will reject for lifecycle reasons. Lifecycle rules belong at the API boundary and must be mirrored, not reinvented, in UI.  
**Author/source:** commits `70bf082` (“Align project interest lifecycle with public project cards”), `e126930` (“Restore pilot interest action on project cards”), and the current `app/api/project-applications/route.ts` policy.

## Make Project Architect an authenticated member progression
**Date:** 16 August 2026  
**Problem:** The public `/project-architect` route could appear to be a separate public application journey rather than a progression from an existing member identity.  
**Root cause:** The entry route was outside the middleware matcher and did not force the governed member workspace destination.  
**Fix:** Protect `/project-architect`, preserve `/member/project-architect` as the sign-in return destination, and redirect authenticated users to that member route.  
**Reasoning:** Architect status is evidence-reviewed identity progression. Requiring a member session preserves ownership, history, credential linkage, and authorization.  
**Author/source:** commit `8b71c56` (“Make Project Architect a member-only progression route”); broader feature sources include `17ce5ed`, `22b5448`, and `3af7d25`.

## Parallelize the Phase 1 browser gate without reducing coverage
**Date:** 15 August 2026  
**Problem:** The Phase 1 Playwright gate was slower than necessary as coverage grew.  
**Root cause:** The configuration did not use full file/test parallelism and conservative worker settings limited execution.  
**Fix:** Enable full Playwright parallel execution and set bounded workers/retries appropriate to CI/local runs without removing tests.  
**Reasoning:** Release speed should be improved by safe concurrency, not by skipping critical browser journeys or weakening assertions.  
**Author/source:** commit `4a9c85b` (“Parallelize Phase 1 browser gate without reducing coverage”).

## Handle duplicate signup without revealing account existence
**Date:** 15 August 2026  
**Problem:** A duplicate email signup could look like a normal verification flow and leave the user without a useful recovery action. Local callback behavior was also ambiguous when the site origin was not configured.  
**Root cause:** Supabase can return a user with no identities for an existing email, while the UI treated every sessionless signup as “check email.”  
**Fix:** Detect the empty-identities response, provide sign-in/reset recovery choices without confirming account existence, reset stale recovery UI between modes, and make the configured site origin authoritative.  
**Reasoning:** The flow needs to be recoverable while preserving account-enumeration protections. Every environment must explicitly configure its callback origin.  
**Author/source:** commit `6311ffb` (“Fix duplicate signup recovery and localhost auth fallback”).
