# Phase 2B — Secure catalogue storage RFC

**Decision status:** PROPOSED, not a database migration or permission to deploy. **Baseline:** `92b8cbe57eefd9829a9041e31ac79cc7c2f50979`. **Dependencies:** Phase 1 preservation sign-off and Phase 2A source validator merge.

## Product and systems contract
- A *master project* is one of 50 approved GitHub specifications; a *team run* and its submitted delivery repository are distinct operational objects.
- Keep 305 existing `public.projects` rows and their existing UUIDs, project applications, offers, runs, member records, task/chat/history and RLS unchanged throughout this phase.
- 50 source definitions are published only after a **separate cutover gate**. None of this RFC's proposed tables drives current discovery routes.
- Preserve historical member-project access even when old catalogue content is no longer discoverable.

## Proposed relational design (only for isolated review)
| Entity | Purpose | Proposed constraints |
| --- | --- | --- |
| `catalogue_revisions` | Pinned GitHub source commit, content digest, count, validation and approval | unique (source_repo, source_commit_sha, content_sha256); count=50 for approval; immutable reviewed revisions |
| `catalogue_projects` | One normalized project *per revision* | composite unique (revision_id, external_id); strict ID/HTTPS URL; source JSON for optional metadata; status enum/check |
| `catalogue_operational_mappings` | Explicit reviewed link to operational UUID | unique (external_id) for approved active revision; unique (operational_project_id) only when product policy forbids multiple catalogue references; FK `projects(id)` with `ON DELETE RESTRICT` |
| `catalogue_sync_attempts` | Audit of validation, staging, promotion and failure | append-only attempt and explicit actor/service identity; no secrets or raw PII |

**Important correction to the earlier provisional sketch:** `catalogue_projects.external_id` cannot be globally unique across all revision snapshots; use the revision-scoped composite key. An approved-current view, or approved revision foreign key, projects the single active catalogue. The mapping must distinguish draft/pending/manual-review mappings from published ones, and must not infer matches by ordinal ID.

## Transactional lifecycle
1. Fetch source only server-side from an explicitly allowlisted GitHub organisation/repository at a pinned commit SHA.
2. Validate JSON and metadata using the separately versioned Phase 2A contract before any staging.
3. Write revision and all 50 rows inside one database transaction in an isolated environment; duplicate import is a no-op by checksum.
4. Verify 50 distinct external IDs, master URLs, governance flags, complete mapping policy and all referential checks.
5. Require human promotion decision; do not expose draft revisions through anonymous or member APIs.
6. Failure retains the previous approved revision intact, audits error codes, and allows rollback by switching the approved revision pointer, never deleting history.

## Security and privacy design
- No `service_role`, GitHub credentials, private dataset links or import trace secrets in client bundles or anonymous JSON responses.
- All new tables: RLS enabled by default; direct `anon`/`authenticated` write grants denied; public projection is only approved minimum metadata and explicitly approved publication status.
- Owner/admin approval uses existing verified role claims and server-side checks, never a client-provided `isAdmin` value. Mapping and audit tables are privileged read/write only.
- No `ON DELETE CASCADE` from a new catalogue relation into old `projects` or `project_runs`. All failures must leave current member data untouched.
- Review privacy requirements before allowing team-submitted GitHub URLs to become public; master source links and member/team delivery links remain separate.

## Acceptance test matrix before migration approval
| Test | Required result |
| --- | --- |
| Import same source twice | identical 50-item revision; no duplicate rows |
| Change one source item at new Git SHA | new immutable revision; previous approved remains accessible |
| Duplicate ID, missing fields or bad GitHub URL | reject entire candidate, no partial publish |
| Unavailable GitHub/timeout/bad checksum | last-good approved catalogue unchanged |
| Stale write or parallel import | safe unique lock/transaction outcome, deterministic error |
| Anonymous selects | approved minimal projection only, no unpublished revision/mapping/audit |
| Authenticated member impersonation | cannot change publication, mappings or other runs |
| Legacy project/run FK regression | all 305 project IDs and protected child IDs/counts unchanged |
| Existing public/member/Lab browser flows | identical before opt-in cutover |
| Rollback rehearsal | restores previous approved revision without mutating legacy operational data |

## UX and analytics boundary
- Existing pages remain untouched in Phase 2B. Later product design must support search and skill-fit, discernible CTA states, 320px+ mobile, keyboard traversal and focus, WCAG AA checks, plain-language briefs and accessible GitHub source links.
- Future analytics: `catalogue_view`, `project_detail_view`, `master_repo_open`, `project_apply_start`, `project_apply_submit`, `lab_activation`, `team_delivery_submit`; privacy-safe, deduplicated by event ID, with no team/private URL in analytics properties.
- Prohibit events on unfinished public experiences; instrument only in a separately approved frontend phase.

## Stop / exit gate
No executable Production SQL in this PR. First inspect live `projects` schema, FK delete actions, existing Supabase migrations and deployment process; verify full snapshot+restore on isolated database; agree 305-to-50 disposition; document intended grants/RLS and service identities; obtain explicit owner approval for a **separate isolated schema PR**. The product launch remains **manual deployment only**.
