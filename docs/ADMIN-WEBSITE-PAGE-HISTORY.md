# Admin Website Phase 4 — Page revision history and restore

Date: 20 August 2026

## Outcome

Phase 4 adds immutable publication history to the Phase 3 Homepage, About and Contact CMS. Admins can inspect earlier published versions and restore one as the current draft without changing the live website. A separate explicit Publish action is always required to make restored content public.

## Success criteria

- every successful public-page publish and immutable revision insert occur in the same database transaction;
- existing published Phase 3 pages are captured as baseline revisions when the migration is applied;
- revisions have per-page monotonically increasing version numbers;
- historical rows cannot be updated or deleted through the application service role;
- history is Admin-only and requires `website.content.edit`;
- the History workspace supports page selection, 25/50/100 rows and newest-first pagination;
- an Admin can preview a revision before choosing Restore as draft;
- restore never mutates `website_page_public`;
- publishing a restored draft creates a new `restored_publish` revision that records its source revision;
- publishing still requires `website.content.publish`;
- restore and publish operations create canonical Admin audit events;
- current public layouts, Contact form behavior and Phase 3 content validation remain unchanged;
- mobile, tablet and desktop remain responsive and WCAG 2.2 AA compliant.

## Persistence

### `website_page_revisions`

Immutable publication ledger with:

- page key;
- revision number;
- validated page payload;
- source: `baseline`, `publish` or `restored_publish`;
- optional source revision for restored publication;
- publication timestamp;
- publishing Admin ID where available.

The table uses RLS. `anon` and `authenticated` receive no privileges. The application `service_role` receives **SELECT only**; it cannot insert, update or delete historical rows directly.

### Baseline capture

The migration copies any already-published `website_page_public` record into revision 1 when no revision exists for that page. This preserves the state that existed before Phase 4 rather than starting history at the first post-migration edit.

## Atomic publication

`publish_website_page_with_revision(...)` is a narrowly scoped `SECURITY DEFINER` database function executable only by `service_role`.

It performs one transaction:

```text
validate page / restore source
        ↓
per-page advisory transaction lock
        ↓
calculate next revision number
        ↓
update published page
        +
insert immutable revision
        ↓
clear restored-draft marker
        ↓
return revision ID / number / timestamp
```

The per-page advisory lock prevents concurrent publishes from producing duplicate or skipped revision numbers due to application-level races.

If revision insertion fails, the public page update fails in the same database transaction. History therefore cannot silently diverge from the canonical published page.

## Restore model

Restore is intentionally **restore as draft**, not rollback-live.

```text
Choose revision
      ↓
Preview bounded content
      ↓
Restore as draft
      ↓
Public website remains unchanged
      ↓
Admin reviews / optionally edits
      ↓
Explicit Publish
      ↓
New live version + new immutable revision
```

The restored draft records `restored_from_revision_id`. A subsequent successful publication writes that source into the new immutable revision and labels its source `restored_publish`.

Historical revisions are never overwritten, renumbered or deleted during restore.

## Authorization

- view history / restore to draft: `website.content.edit`
- publish restored or ordinary draft: `website.content.publish`

Trusted Admin identity remains mandatory through the shared capability resolver.

## Audit events

- existing Phase 3 `website.page.published` now includes revision ID and number;
- restore creates `website.page.revision.restored_to_draft`;
- restored publication includes `restored_from_revision_id` in bounded audit metadata.

The shared Admin audit sanitizer remains authoritative.

## Admin experience

The existing Website → Pages editor now exposes **Revision history** as a first-class action.

The History workspace provides:

- Page dropdown;
- Rows dropdown: 25 / 50 / 100;
- exact revision count;
- newest-first table;
- version, time, actor and source columns;
- preview of all fields grouped using the Phase 3 content model;
- explicit Restore as draft;
- second-step confirmation explaining the live page will not change;
- direct link back to the Pages editor;
- direct link to the corresponding public page.

The table may scroll horizontally inside its own bounded container on narrow screens. The page itself must not horizontally overflow.

## Responsive behavior

### Mobile — <=480px

- history and preview stack vertically;
- controls become a single column;
- selects use at least 16px text to avoid iOS focus zoom;
- action controls are at least 44px;
- restore confirmation actions become full-width;
- no page-level horizontal overflow.

### Tablet — 481–1024px

- history list and preview stack;
- page/row filters remain compact where space allows;
- the existing Phase 1 Admin navigation behavior is preserved.

### Desktop — >=1025px

- history list and preview use a two-column workspace;
- preview remains sticky while reviewing long history tables.

## Release coverage

The deterministic Admin history audit checks:

- immutable table/RLS/grants;
- baseline capture;
- atomic publish RPC and advisory lock;
- restore marker and audit events;
- History API/UI;
- 25/50/100 pagination controls;
- Pages editor discoverability.

Authenticated isolated-Supabase browser coverage proves:

1. publish version A;
2. publish version B;
3. both versions exist in history;
4. restore A to draft;
5. the public Homepage remains on B;
6. publish the restored draft;
7. the public Homepage becomes A;
8. the newest revision is `restored_publish` and points to A's source revision;
9. restore audit exists;
10. original published and draft content are restored before the test exits.

The isolated database may retain the test-generated immutable revisions because it is disposable evidence for that CI run.

## Preservation boundaries

### RED

- authentication/session behavior;
- Contact form fields, validation and submission routing;
- Homepage live metrics and data sources;
- public page layouts/design-system CSS;
- project/opportunity/Proof workflows;
- production secrets.

### AMBER

- page publication API now routes through the atomic database function;
- Phase 3 Pages editor gains history discoverability.

### GREEN

- additive revision table and RPC;
- History Admin route/component/API;
- restore audit event;
- release tests/audits/docs.

## Rollback

Reverting the application removes the History workspace and returns page publication to the Phase 3 application path. Historical rows can remain safely unused. Do not delete revision history as part of application rollback.

If the Phase 4 migration has been applied, database rollback should be handled as a separately reviewed operational change rather than destructive migration reversal.

## Next phase

Phase 5 adds governed site-wide and page-level SEO controls, search/social previews, indexing settings, canonical configuration and verification metadata without promising ranking outcomes that search engines ultimately control.
