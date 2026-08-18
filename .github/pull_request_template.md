## Success criteria

- [ ] I listed the user outcome and the existing behaviour that must not regress.
- [ ] I defined mobile, tablet and desktop expectations.
- [ ] I defined loading, empty, success and error states where applicable.

## What changed and why

<!-- Describe the user impact, root cause and implementation. -->

## Journey verification

<!-- For functional changes, describe UI → API → database/RLS → Admin → notification → confirmation evidence. -->

- [ ] Mobile (`<=480px`) verified
- [ ] Tablet (`481–1024px`) verified
- [ ] Desktop (`>=1025px`) verified
- [ ] Keyboard and WCAG 2.2 AA behaviour verified
- [ ] Permission boundaries verified

## Test evidence

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run audit:interactions`
- [ ] `npm run audit:regression-coverage`
- [ ] `npm run test:regression`
- [ ] `npm run build`
- [ ] Staging E2E run when forms/backend/Admin behaviour changed

## Operational impact

- Migrations:
- Environment variables:
- Backfill or cleanup:
- Rollback plan:

## Screenshots

<!-- Add mobile, tablet and desktop evidence for visual changes. -->

By submitting this pull request, I confirm that I followed [CONTRIBUTING.md](../CONTRIBUTING.md) and did not weaken or skip required checks merely to obtain a green build.
