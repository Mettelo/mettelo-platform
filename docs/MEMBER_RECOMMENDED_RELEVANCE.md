# My Mettelo Recommended relevance contract

## Product role

**Recommended is My Mettelo's personalized relevance layer, surfacing a small number of useful projects, events, supported member opportunities, and relevant community content.**

It answers **what may be relevant to me?** It does not replace the owning products:

- Discover remains the broad project catalogue.
- Applications owns submitted project application state and member actions.
- Projects owns confirmed/current/completed project participation.
- Events owns event detail and registration context.
- Opportunities owns its own listings and external-application semantics.
- Spotlight owns published recognition/community stories.
- Careers owns employment/recruitment and is excluded from Recommended.

## Current supported recommendation types

The implementation renders only candidate types that can be sourced, authorized and explained truthfully.

### Projects

Source:
- `projects`
- project-scoped `project_roles`
- `project_domains` / `domains`
- `project_tools` / `tools`
- the signed-in member's `project_applications`
- the signed-in member's `project_members` / `project_runs`
- `saved_projects`
- live exact-role capacity from waiting/active `project_members`

Eligibility is applied before ranking. A new project recommendation must still accept applications and have confirmed role capacity. Closed/cancelled projects are excluded. Existing member relationships are resolved through the shared member-project lifecycle resolver.

Destinations:
- open/ineligible browse state → `/member/discover/[id]`
- submitted/action-required/in-review/Team Forming → `/member/applications`
- confirmed/active → `/member/projects`
- completed → `/member/projects?state=completed`

Recommended never offers **Apply** directly. Application starts from internal Member Project Detail.

### Events

Source: canonical `events` domain.

Only future `published` events with a real slug and a real recommendation signal are candidates. Recommended links to `/events/[slug]`; it does not duplicate registration management.

### Spotlight / community

Source: `spotlights`.

A Spotlight candidate must be:
- `published`;
- not excluded;
- explicitly `consent_status='granted'`;
- explainable from a real member signal.

The repository already contains the Phase 5 consent contract. `20260819203000_restore_spotlight_consent_baseline.sql` safely restores those already-versioned consent columns/policy in environments affected by schema drift. Existing rows default to `not_requested`; nothing is granted implicitly.

### Opportunities — intentionally omitted for now

The current hosted `opportunities` dataset is an external employment/recruitment feed. A read-only audit also found rows labelled `volunteer` whose content is clearly employment-role content, so `opportunity_type` alone is not a trustworthy Careers discriminator.

Recommended therefore does **not query the Opportunities table** today. This avoids recruitment leakage and follows the contract rule that unsupported/unsafe categories are omitted rather than fabricated. The Opportunities product itself is unchanged.

A future member-opportunity source may be added only when it has an explicit non-recruitment discriminator, clear authorization/availability semantics, a canonical destination, and an explainable relevance signal.

## Recommendation signals and reasons

Supported reasons are explicit objects with a reason type, source signal, member-safe copy and internal ranking weight. Current signals are:

- existing member/project lifecycle relationship;
- a project the member saved;
- exact preferred project role;
- exact profile skill;
- selected domain interest through project taxonomy;
- selected tool through project taxonomy;
- literal skill/domain/tool matches in eligible Event or Spotlight member-visible text.

There is no generic fallback reason. If a trustworthy reason cannot be produced, the item is omitted.

Verified Proof is **not** currently used to synthesize skill recommendations because the repository has no verified contribution-to-skill mapping. Profile skills are not treated as verified Proof.

## Ranking

Ranking happens only after authorization/eligibility filtering. It is deterministic and testable. It combines:

1. reason strength;
2. real time sensitivity for future dates/deadlines;
3. a small project tie-breaker;
4. deterministic type/title tie breaking.

Raw scores are internal implementation details and are never rendered. Recommended does not display percentages, acceptance likelihood, member rankings or other private scoring.

Top Picks contains at most three highest-ranked candidates. Mixed content is allowed but never forced merely for visual balance.

## Privacy and Careers boundary

Recommended does not query Careers application, candidate, recruiter, salary/offer or hiring-stage data. It does not query the current external Opportunities feed because that feed cannot be safely separated from recruitment using its existing labels.

Recommendation output never exposes:
- other members' behavior;
- applicant comparison/ranking;
- reviewer/admin notes;
- private moderation state;
- Spotlight score/rank fields;
- selection likelihood.

## Saved

Project Save/Unsave uses the existing `saved_projects` member-owned domain. Saving does not create an application, register for an event or change project lifecycle state.

No Save control is shown for Event or Spotlight because Recommended does not invent a cross-domain Saved model where one does not exist.

## Page hierarchy

The implemented hierarchy follows the approved responsive prototype:

1. My Mettelo / Recommended context from the shared shell
2. `PERSONALISED · RELEVANCE`
3. `Recommended for you`
4. compact recommendation-context/profile panel
5. Top Picks
6. populated category sections only
7. profile-improvement prompt
8. Browse Discover escape route

There is no filter bar, KPI dashboard, pagination-heavy catalogue or infinite feed.

## Accessibility and responsive behavior

Release requirements:
- WCAG 2.2 AA contrast/focus behavior;
- textual content types and statuses, not color-only meaning;
- logical headings/landmarks;
- approximately 44px controls;
- keyboard-accessible links/buttons;
- `aria-current='page'` for Recommended in the desktop rail and mobile More path;
- reduced-motion handling;
- wrapping for long titles/reasons;
- no horizontal overflow;
- 200% text zoom support.

Validated browser widths are 375, 390, 414, 768, 1024 and 1440px. Desktop uses up to three Top Picks and two-column category cards; tablet/mobile stack before the layout becomes cramped.

## Deterministic regression coverage

- `scripts/audit-member-recommended-v1.mjs` protects hierarchy, routes, source boundaries, no fake scores, Careers separation, consent and responsive requirements.
- `tests/member-recommended-domain.spec.ts` protects candidate eligibility, reasons, lifecycle routing, recruitment-feed exclusion and deterministic ranking.
- `tests/member-recommended-v1-visual.spec.ts` uses disposable local-only fixtures for responsive/browser assertions, Save independence, internal project routing, canonical Event/Spotlight routing, mobile More current state and 200% zoom.
- The Recommended browser specs are wired into the isolated authenticated smoke lane.

## Merge order

This work is intentionally stacked because its project recommendations depend on the internal Member Project Detail introduced by PR #81.

Required sequence:

1. merge PR #77;
2. rebase/retarget and exact-head validate PR #81, then merge it;
3. rebase/retarget this Recommended PR onto the resulting current `main`;
4. reconcile concurrent shared-shell/Recommended changes from other open PRs if they landed first;
5. run all required exact-head CI again;
6. merge Recommended only after that rebased head is green and mergeable.

No production schema mutation, merge, deployment or promotion is performed by the implementation PR itself.
