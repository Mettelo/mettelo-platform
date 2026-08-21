# Mettelo Lab Team — Phase 8

## User outcome
Team is a people-first view: members should immediately understand who is in their working team, each person’s role, current state, and any submission responsibility without scanning a wall of badges.

## Hierarchy
1. Team identity and current team state.
2. Your role, Project Lead and Project Architect as compact working context.
3. Member roster led by person name and role.
4. Headline and status as supporting metadata.
5. Final Proof delegation and permission management only where relevant.

## Privacy boundary
The view continues to use `resolveProjectTeamOverview` and only renders the current member’s permitted team. Other cohorts remain intentionally hidden. No membership, run-selection, RLS, auth or permission logic changes are part of Phase 8.

## Member card contract
- Person name is primary.
- Current user is explicitly marked `You`.
- Role is the single primary pill.
- Status is plain supporting metadata rather than a competing badge.
- Final Proof delegate is shown only when the existing flag is true.
- Permission management remains available only under the existing permission conditions.
- Long names and headlines wrap naturally.

## Responsive contract
- Desktop may use two roster columns.
- Tablet and mobile use one roster column.
- At mobile widths the avatar reduces to 44px, role moves below the name when needed, metadata stacks, and permission actions remain full-width/reachable.
- No horizontal overflow is permitted across the Lab viewport matrix.

## Empty/forming states
A member without a completed team placement sees an intentional forming state. The copy explicitly confirms that other cohorts are not shown.

## Verification
Phase 8 relies on the existing Mettelo Lab visual matrix, authenticated team privacy checks, no-overflow assertions, 200% zoom coverage, lint, typecheck, build and release/deployment gates.

## Rollback
Revert the focused Phase 8 PR. No API, database or permission rollback is required.
