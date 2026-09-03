# Project Library Phase 8 — Mettelo Lab, Governance and Security

Status: PASS

Exact validated head: `de39867c83ed9ae62fe18bb2c07830d2e975cc70`

## Scope

Phase 8 verifies the canonical Project Library boundary between public/member discovery and authorised Mettelo Lab execution. It also hardens retained Project Library staging and trigger infrastructure without introducing new paid infrastructure.

## Authorised Lab projection

`lib/project-lab-canonical-data.ts` enforces authentication before any privileged projection. Non-admin users must have an active or completed `project_members` record for the project before the service-role client is created. Canonical project resources are therefore projected only after server-side authorisation.

Private stored-copy URLs are returned only when both conditions are true:

- `governance_status = green`
- `internal_storage_policy = permitted`

Production verification recorded 296 GREEN/permitted canonical resources and 4 AMBER/not-permitted resources. The AMBER resources remain blocked from private working-copy projection.

The Lab UI explicitly distinguishes configured capability/evidence opportunities from verified Mettelo Proof. Participation alone does not create Proof.

## Public and unapproved-member boundary

Public project content uses the public projection, which hard-nulls restricted resource URLs and does not select internal-storage, legal-review, preservation, provider URL or direct download fields. The ordinary authenticated member project-detail route continues to use the same safe canonical projection and does not gain Lab resource access merely because a user is signed in.

## Trigger hardening

`supabase/migrations/20260903140000_project_library_phase8_trigger_security_hardening.sql` hardens `public.project_problem_brief_skip_noop_update()` by:

- setting an empty `search_path`;
- revoking direct execution from `public`, `anon` and `authenticated`;
- retaining execution only for `postgres` and `service_role`.

Production inspection confirmed the function is not SECURITY DEFINER, has the expected empty search path and has only `postgres` / `service_role` EXECUTE privileges.

## Private import staging hardening

`supabase/migrations/20260903141000_project_library_phase8_private_import_rls.sql` adds defence-in-depth RLS to the retained `private_import.project_identity_baseline` and `private_import.project_library_stage` tables when that production-only schema exists.

Production verification confirmed:

- RLS enabled on both retained private-import tables;
- `anon` has no schema usage and no SELECT;
- `authenticated` has no schema usage and no SELECT.

The migration is intentionally conditional because disposable CI environments do not recreate the production-only private import schema. This preserves CI parity without manufacturing a second staging source of truth.

## Regression contract

`scripts/audit-project-library-contract.mjs` now fails CI if any of the following regress:

- Lab active/completed membership authorisation;
- authorisation occurring before service-role projection;
- GREEN + permitted requirement for private working-copy URLs;
- restricted public resource fields remaining hard-null;
- Proof language becoming automatic rather than verification-dependent;
- Phase 8 trigger hardening;
- Phase 8 private-import RLS/revoke contract.

## Exact-head validation

The final Phase 8 head passed all required release validation:

- Mettelo CI run #2516 — SUCCESS
- Fast regression gate — SUCCESS
- public-regression — SUCCESS
- authenticated QA / Mettelo Lab Chromium QA — SUCCESS
- persistence — SUCCESS
- informational journeys — SUCCESS
- Event Room Phase 1–12 contract run #590 — SUCCESS
- Release Gate Status Bridge run #805 — SUCCESS

## Cost and preservation

No new paid Supabase branch, project, ETL system, queue, storage add-on or external paid service was introduced. Existing project identities, operational project relationships and the canonical 300-project runtime remain preserved.

Phase 8 is complete. Phase 9 may proceed to full journey, regression and quality assurance.
