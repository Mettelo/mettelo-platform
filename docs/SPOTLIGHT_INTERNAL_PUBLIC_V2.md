# Spotlight v2 — Internal + Public Recognition

## Success criteria

Spotlight follows one authority rule:

> **System selects. Admin safeguards. Member consents.**

A release is correct only when all of the following remain true:

1. Normal monthly award selection is automatic.
2. Every selected member has verified contribution evidence from the award month.
3. Admin does not routinely nominate winners, request consent or publish cohorts.
4. Admin can govern exceptions: exclude an invalid draft, hold publication, or suppress unsafe public context.
5. The member alone controls personally identifying publication.
6. Declining publication preserves the award and never reassigns it.
7. Withdrawing publication removes the public representation but preserves private recognition history.
8. Public project and Proof context remain independently authorised.
9. Public pages never expose score, ranking, score breakdown, reviewer/admin notes or private evidence.
10. A public month may contain one, two or three awards; there is no all-three publication gate.
11. A member can share their **published** Spotlight on social media from My Mettelo and from the public award surface.
12. Social sharing is unavailable for draft, private, declined, withdrawn, held or excluded awards.
13. Shared URLs use `/spotlight/[id]` and contain only the public-safe Spotlight projection.
14. Withdrawal invalidates previously shared public award URLs.
15. Required responsive, accessibility, loading and error-state requirements remain intact.

## Canonical lifecycle

### Selection

`createMonthlySpotlightDrafts` evaluates the previous award month. Verified contribution is the minimum evidence threshold for all categories. Completed delivery, discussion, event participation, project-lead responsibility and meeting coordination can influence the relevant category score, but cannot create a winner without verified contribution.

Up to one winner is selected per category and one member cannot hold multiple categories in the same month.

Each selection stores:

- the internal score and breakdown;
- the selected member and category;
- a primary project when one can be derived from verified contribution;
- up to six verified contribution provenance links in `spotlight_evidence`;
- an auditable `selected` / `replacement_selected` event.

Consent is requested automatically after selection using a stable notification dedupe key.

### Consent

The member sees the recognition before publication and can:

- **Allow public Spotlight** — snapshot the public identity shown in the consent preview and publish automatically when no hold blocks publication;
- **Keep this recognition private** — preserve the award internally without replacement;
- **Withdraw publication permission** — remove public availability while preserving the member’s private award history.

Admin cannot grant consent for a member.

### Publication

Publication is award-level, not cohort-level. A consented award publishes automatically unless it is excluded or held.

`publication_held` is independent of recognition and consent. A hold can temporarily remove a previously published award from public access without erasing recognition history or member consent. Clearing the hold resumes publication automatically when consent is still valid.

### Exclusion and replacement

Admin may exclude only an active draft selection when the automatic selection is invalid. Exclusion archives that invalid selection and calls the automatic ranking again for the same award month/category. The next eligible evidence-backed member is selected automatically when available.

Decline and withdrawal are **not** replacement triggers.

## Data boundaries

### `spotlights`

Internal authority record. It may contain score, score breakdown, rank/selection metadata and governance state. Those fields are never selected into the public projection.

Spotlight v2 adds:

- `primary_project_id`;
- `publication_held` / `hold_reason`;
- `suppress_public_project`;
- `suppress_public_evidence`;
- `public_display_name`;
- `public_headline`.

### `spotlight_evidence`

Durable provenance from an award to verified contributions. This table is member-owner/Admin readable and is not anonymously public.

### `spotlight_events`

Audit history for selection, consent, publication and Admin exception actions. Automated single-occurrence events use dedupe keys so retries do not manufacture duplicate history.

## Public projection

`lib/public-spotlight.ts` is the server-side public projection boundary.

A Spotlight record is eligible only when:

- `status = 'published'`;
- `consent_status = 'granted'`;
- `is_excluded = false`;
- `publication_held = false`.

Only consented identity snapshots, award title/category/summary, month and publication date are taken from Spotlight.

### Project context

Spotlight consent does not make a project public. The helper fetches project context through the public Supabase client and explicit `visibility='public'`; canonical project RLS remains authoritative. Admin may additionally suppress project context from one award.

### Proof context

Spotlight consent does not make Proof public. A provenance contribution appears only when the public client confirms:

- `verification_status='verified'`;
- `visibility='public'`.

Admin may additionally suppress public Proof context from one award.

### Profile link

A public profile link appears only when the member’s profile independently satisfies the public-profile/readiness boundary. The consented Spotlight display name does not force the whole profile public.

## Social sharing

Social sharing is a publication capability, not a new consent state.

The existing `SocialShare` component provides LinkedIn, X, WhatsApp and device-share/copy controls.

### My Mettelo

A member sees **Share your public Spotlight** only when the local recognition state is simultaneously:

- published;
- consent granted;
- not held;
- associated with a canonical public URL.

No share control appears before publication or after decline/withdrawal/hold/exclusion.

### Public Spotlight

Public list/detail surfaces may share only the canonical `/spotlight/[id]` URL and public-safe title/identity/month copy. Share metadata is generated from the same safe projection used to render the page.

A member who withdraws consent causes the public record to fail the projection/RLS gate. Existing social posts may still contain their old text, but following the Mettelo URL no longer exposes the award.

## Admin authority

Admin may:

- inspect internal score/breakdown and verified provenance;
- exclude an invalid draft;
- hold / clear publication;
- suppress / restore otherwise-safe public project context;
- suppress / restore otherwise-public Proof context.

Admin may not:

- grant consent for a member;
- routinely choose normal winners;
- routinely request consent;
- manually publish a monthly cohort;
- expose private project/Proof/admin data through public Spotlight.

## Notifications and retries

Consent-request and publication notifications use stable semantic dedupe keys:

- `spotlight:<id>:consent-request`;
- `spotlight:<id>:published`.

The workflow can safely reissue these during retry/reconciliation. Existing notification/outbox unique indexes suppress duplicate delivery records.

## Responsive and accessibility contract

- mobile <=480px: single-column cards, full-width primary controls, shared member mobile navigation remains authoritative;
- tablet 481–1024px: stacked hero/exception layouts and one/two-column public cards as space permits;
- desktop >=1025px: multi-column public awards and side-by-side decision/governance content;
- visible keyboard focus;
- textual status alongside symbols; never color-only;
- approximately 44px primary mobile controls;
- logical heading hierarchy and no nested extra `<main>` landmarks;
- long-text wrapping and no horizontal overflow;
- reduced-motion support;
- 200% text-sizing regression coverage.

## Release / merge order

This work is stacked after #82, which is stacked after #81. The branch must be refreshed/retargeted onto current `main` after its predecessors land, then all required exact-head checks must rerun.

No production SQL, merge, deployment or promotion is part of the PR-stage implementation.
