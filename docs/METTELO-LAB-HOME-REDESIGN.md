# Mettelo Lab Home redesign

Status: Phase 7 contract.

## User outcome

Home is the project command centre. A member should understand, in order: what project they are in, what needs attention next, how delivery is progressing, who owns the work, and what recent team context matters.

## Hierarchy

1. Project identity and member context.
2. One dominant `UP NEXT` action.
3. Delivery progress for milestones and tasks.
4. Supporting ownership and team state.
5. Recent Chat context.

The Home screen must not present every fact with equal visual weight.

## Responsive contract

- desktop uses a two-column project/context header only when space supports it;
- the primary action collapses to one column on narrow screens;
- progress cards collapse before text becomes cramped;
- supporting facts reduce from four columns to two and then one;
- project titles wrap by words and do not use `overflow-wrap:anywhere`;
- interactive actions preserve the Lab 44px target;
- long names, project titles and activity text must not create horizontal overflow;
- Home remains usable at 200% zoom and the existing Chromium viewport matrix.

## Accessibility

Milestone and task completion are exposed with semantic `role="progressbar"`, `aria-valuemin`, `aria-valuemax` and `aria-valuenow`. Colour is not the only indicator because numeric completion remains visible.

## Preservation boundary

Phase 7 does not change:

- authentication, RLS or project membership;
- project-run selection or team privacy;
- task, milestone, meeting or Chat data sources;
- next-action routing logic;
- review permissions or review-slot behaviour;
- APIs, database schema or Production data.

## Deferred work

The Team section keeps its existing functional presentation boundary for Phase 8. Plan, Tasks, Data, Proof, Resources and Events are handled by their dedicated later phases.

## Verification

Phase 7 requires lint, typecheck, deterministic Lab audit, build, authenticated Mettelo Lab Chromium visual QA, mobile no-overflow coverage and 200% zoom coverage.

## Rollback

Revert the Phase 7 PR. No database, API, permission or data rollback is required.
