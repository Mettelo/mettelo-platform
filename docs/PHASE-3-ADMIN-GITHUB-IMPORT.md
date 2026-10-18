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
