# My Mettelo Proof portfolio

Last audited: 19 August 2026

## Product contract

My Mettelo Proof is the authenticated member portfolio for evidence that comes from real Mettelo project contributions. It is not a project-history feed and it must not turn profile claims, task completion, milestone completion, or prototype sample content into verified evidence.

The source of truth is the member's own `contributions` rows under the authenticated Supabase client and RLS. A portfolio item is **Verified Proof** only when `verification_status = 'verified'`. `pending`, `needs_changes`, and `rejected` remain distinct lifecycle states and do not contribute to verified totals.

## Privacy and truth boundaries

- Member Proof reads only the signed-in member's contribution records.
- Review notes are member-facing only for `needs_changes`, where they are required to explain the requested update. Verified and rejected portfolio data must not expose internal review rationale.
- Visibility is separate from verification. A verified item may remain private, Mettelo-only, or public according to the existing visibility control.
- Spotlight publication is a separate consent/publication domain. Verification never auto-publishes a member to Spotlight.
- Evidence URLs are shown only to the owning member and only when they are valid HTTPS references. Access remains subject to the destination's permissions.
- No service-role client is introduced for the member Proof page.

## Project context and role labels

Proof may show the real source project and a member-only handoff back to the matching project/run when current membership can be resolved under authenticated RLS.

The clean reconstructed schema does not currently grant the authenticated role direct `SELECT` access to `project_roles`. Member Proof therefore does **not** widen privileges or use a service-role lookup merely to decorate portfolio cards with a role title. A project-role label is omitted when it cannot be resolved through a safely authorised projection. This is a deliberate truth-preserving omission, not a fallback to `team_role`, application copy, or invented text.

If a future reviewed schema/API adds an authorised member projection for exact project/run role titles, the UI may populate the existing optional `project_role` field and the browser contract should be updated in the same pull request.

## Interaction states

- Loading uses a geometry-preserving skeleton with an announced loading state.
- A verified-query failure shows an explicit retryable error and never reinterprets failure as zero Proof.
- Pending-query failure does not hide already-loaded Verified Proof.
- No verified Proof routes members toward Projects/Discover rather than fabricating examples.
- Search and source-project filters operate only on the loaded verified portfolio and provide a clear-filters state.
- `needs_changes` opens the existing contribution resubmission lifecycle through `PATCH /api/contributions`; entered values remain available after recoverable errors.

## Responsive and accessibility contract

The portfolio must remain usable at mobile `<=480px`, tablet `481-1024px`, and desktop `>=1025px`, including 375/390/414/768/1024/1440 browser coverage and 200% text zoom.

Requirements include WCAG 2.2 AA text and component contrast, visible keyboard focus, logical headings/landmarks, text plus shape/icon status communication, accessible dialog controls, approximately 44px primary targets on mobile, reduced-motion support, long-text wrapping, and no unintended horizontal overflow.

## Release evidence

`tests/member-proof-v1-visual.spec.ts` is part of both `test:e2e:smoke` and `test:e2e:staging`. The isolated E2E fixture seeds verified, pending, changes-requested, and rejected contribution records so the blocking authenticated Chromium lane proves the truth/privacy hierarchy on a reconstructable local schema.

The Phase 5 reputation audit additionally checks the contribution-only verified source, pending lifecycle separation, review-note privacy, absence of fabricated verified-skill UI, and visibility remaining subordinate to verification.

No schema migration is introduced by this portfolio redesign. Rollback is an application/test/docs revert of the focused Proof changes.
