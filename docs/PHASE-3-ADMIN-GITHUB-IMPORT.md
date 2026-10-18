# Phase 3 — GitHub repository import through existing Admin

**Status: implementation in progress, disabled by default.**

## What is implemented in PR
- Existing Admin overview links to `/admin/projects/github-import`.
- Admin-only preview endpoint validates a repository in `github.com/Mettelo` and fetches its root `mettelo-project.json` manifest from the fixed GitHub API hostname. Private repositories require `METTELO_GITHUB_TOKEN` on the server (never a public key).
- Admin project creation endpoint optionally accepts `github_repository_url`, re-fetches and validates the manifest server-side, checks existing canonical IDs and repository URLs, and creates a **private, non-recruiting operational draft** with the existing admin creation machinery.
- Normal manual project creation remains available. Existing runs, applications, memberships and offers are not touched by this import.
- Import writes are **OFF** unless `METTELO_PHASE3_GITHUB_IMPORT_ENABLED=true` is set by an authorised operator. Do not enable it yet.

## Required root manifest

```json
{
  "id": "MTL-DE-051",
  "name": "Example Data Engineering Project",
  "track": "Data Engineering",
  "brief": "Build a data pipeline with validation and quality controls.",
  "problem": "Data arrives from inconsistent sources and needs reliable processing.",
  "sector": "Technology",
  "roles": ["Data Engineer"],
  "capabilities": ["SQL", "Python"],
  "repository": "https://github.com/Mettelo/example-data-engineering",
  "status": "Available"
}
```

The project ID must be unique, immutable and not reused; the repository must match the submitted URL.

## Before enabling

1. Add and verify a **unique partial index** on `public.projects(canonical_project_key)` and a unique index on canonical `github_url` for non-null values, with a reviewed migration and preflight duplicate report. **No schema change is included or executed in this PR.** The application-level precheck alone is not race-safe.
2. Implement a **persistent versioned master catalogue** with controlled approval and publication. The Phase 2 50-project snapshot is intentionally fixed and cannot display project 51. Do not enable new-project publishing with the old snapshot.
3. Reconcile existing 50 GitHub master IDs and all operational UUIDs before any mapping or publication. Existing historic records must remain immutable.
4. Verify that published imports satisfy the existing workstream-2 publication blockers, operational roles, runs, capacity, and member application journeys.
5. Complete authenticated local browser acceptance and manual operator approval; deployment is always manual. No new staging Supabase database is required. Ephemeral GitHub Actions PostgreSQL is suitable for schema and import tests.

## Lifecycle

GitHub repository → validated manifest → Admin preview → private operational draft → operational configuration → publication preflight → manually approved publication → discovery. Updates to the GitHub README or manifest must not silently rewrite active runs or applications.

## Phase 3B: expandable catalogue projection (PR after #296)

- The pinned 50 master entries remain immutable and retain their existing master URLs.
- `lib/expandable-github-catalogue.ts` reads **only published public operational projects** with a unique canonical MTL ID and an approved `github.com/Mettelo` URL. It requires a matching, immutable `project_created` audit-event manifest snapshot before adding an entry.
- Import now saves the validated manifest snapshot with revision `1` in the creation audit event. Later revisions require explicit separate audit events and admin approval; no automatic GitHub webhook sync.
- New projects appear in public and member discovery only when `METTELO_PHASE2_CATALOGUE_MODE=github50` **and** `METTELO_PHASE3_EXPANDABLE_CATALOGUE_ENABLED=true`, and after the operational project has passed existing publication governance.
- An approved new project with `applications_open=true` links to its **existing operational UUID-based detail/application journey**. The initial 50 remain read-only until individually operationalised.
- Database uniqueness migration `supabase/migrations/20261018000000_phase3_github_project_uniqueness.sql` is checked in but **not applied**. It must be reviewed and explicitly authorised before either Phase 3 write or expandable-read feature flag is enabled.
- A disposable PostgreSQL CI service tests duplicate rejection, URL normalisation and unchanged 305 historical IDs. No new Supabase staging database or Production write.
- The Admin GitHub review page at `/admin/projects/github-import/review` shows registered repositories, operational status, visibility and intake, and links to the existing publisher; it never publishes directly. Remaining work: implement revisioned manifest approval updates, end-to-end authenticated member application tests, controlled migration and owner release decision.

## Safe repository update inspection

Admin can select **Check GitHub changes** on the review page. The server fetches the current validated GitHub manifest, compares it with the immutable revision-1 import snapshot, reports changed fields, and refuses any change to canonical project ID or repository. This endpoint performs **no database write** and cannot silently alter applications, runs, members, project status or publication. Explicit approved revision writes are a separate follow-on task, and both Phase 3 flags remain OFF.

## Explicit draft revision approval (new, disabled)

- Admin review shows **Approve draft revision** only after a changed GitHub manifest has been checked, and only for a private draft when `METTELO_PHASE3_GITHUB_REVISION_APPROVAL_ENABLED=true`.
- The operator must confirm; the server refetches the GitHub manifest and checks its blob SHA against the preview to prevent approving a changed file accidentally.
- The **unapplied** migration `supabase/migrations/20261018010000_phase3_github_revision_approval.sql` defines a transactionally atomic, row-locked `phase3_approve_github_revision` function. It rejects stale revisions, changes to canonical ID or repository, and attempts to modify published projects.
- Approval changes only a private draft's title, summary and problem statement and appends an immutable `github_manifest_revision_approved` audit event with the validated snapshot and revision number. It does **not** publish the project, open applications, or modify runs, offers, members or applications.
- Once separately published via the existing lifecycle, the catalogue uses the latest approved snapshot for taxonomy, roles and capabilities, while operational fields remain authoritative for title and intake.
- The disposable PostgreSQL 17 CI rehearsal now covers approval, audit persistence, stale revision rejection and published-project rejection.
- All three Phase 3 flags remain OFF by default. **Do not enable any of them or apply either migration without explicit Production change approval.**
