# Project interest participation terms

**Decision date:** 3 September 2026  
**Terms version:** `2026-09-03-v1`

## Purpose

Project **interest** remains a lightweight intake signal and stays separate from the later full role-application journey. Members should understand the participation expectations before registering interest, but project interest must not depend on an uploaded PDF or communication-template attachment.

The canonical submission endpoint remains `/api/project-applications` with `application_kind='interest'`. Full role applications continue to use their existing attachment-backed Project Participation Terms flow; this change does not weaken or replace that contract.

## Member experience

Immediately above **Submit interest**, the form presents a `Before you submit` panel containing:

1. a short plain-English participation summary;
2. a **Read full participation terms** control that opens the complete terms in an in-page modal dialog;
3. an unchecked agreement checkbox: **I have read and agree to the Mettelo Project Participation Terms.**

The Submit interest button is disabled until the checkbox is selected. The modal is keyboard operable, has an explicit 44px close control, supports the native Escape-to-close dialog behaviour, and keeps the terms readable in a scrollable surface at phone, tablet and desktop widths.

## Server authority and audit record

Client-side disabling is not the consent boundary. `/api/project-applications` independently requires both:

- `terms_accepted === true`; and
- an exact `terms_version` matching the current server-owned `PROJECT_PARTICIPATION_TERMS_VERSION`.

A missing acceptance returns `400`. A stale terms version returns `409` and requires the member to review the current terms before trying again.

Accepted interest rows record:

- `terms_accepted_at` — server timestamp;
- `terms_version` — the exact version identifier accepted.

Migration `20260903215500_project_interest_inline_terms.sql` adds the nullable `project_applications.terms_version` audit column. Existing rows remain valid and unchanged.

## Preservation boundaries

The following existing behaviour is intentionally preserved:

- project interest and role applications continue through one canonical endpoint;
- interest still uses a requested contribution area rather than a role assignment;
- duplicate/idempotency handling is unchanged;
- authenticated RLS submission remains unchanged;
- Admin queue visibility is unchanged;
- member and Admin notifications remain unchanged;
- full role applications continue to validate the currently published attachment-backed participation terms;
- no service-role key is exposed to the browser;
- no new paid infrastructure is introduced.

## Verification

The project-interest contract audit fails if the inline terms summary, full-terms disclosure, checkbox, terms payload, API version validation or migration contract disappears.

The isolated staging submission journey proves that:

1. an authenticated interest request without accepted terms is rejected;
2. the current accepted version succeeds;
3. the resulting row records both `terms_accepted_at` and `terms_version`;
4. the existing notification path still produces a project notification; and
5. the submission remains visible in the Admin project-application queue.

## Rollback

The application/UI change can be reverted through a focused pull-request revert. The additive nullable `terms_version` column may safely remain in place during rollback; no destructive reverse migration is required.
