# Mettelo Lab Tasks — Phase 10

## User outcome
Tasks should behave like a focused delivery workspace: members can understand what work exists, what state it is in, who owns it, what evidence or review context matters, and what action is available without the controls overpowering the task itself.

## Scope
Phase 10 is presentation-only and applies to the existing `view=tasks` composition:
- `#workstreams`
- `#deliverables`
- `#delivery`
- existing task status controls and task activity history
- existing task creation controls

No task API, status transition, assignment, permission, persistence or evidence behaviour is changed.

## Visual hierarchy
1. Section identity and purpose
2. Task/work item title and description
3. Owner, due date, status and supporting facts
4. Status/update controls
5. Activity history and creation controls

Task content is primary. Controls use contained secondary surfaces.

## Responsive contract
- Desktop: task content plus a restrained status/control column where the existing markup allows it.
- <=800px: task rows collapse to one column.
- <=480px: sections use compact padding, facts/forms become one column and form controls remain at least 16px text.
- Long titles, descriptions, labels and activity content use natural `break-word` wrapping.
- No fixed viewport positioning is introduced.

## Accessibility
- Interactive task controls retain at least 44px practical target height.
- Focus-visible outlines use the Lab shell focus token.
- Status messages and existing `aria-live` behaviour remain unchanged.
- Blocker/review follow-up labels and task activity disclosure semantics remain unchanged.

## Preservation boundary
Unchanged:
- `/api/project-delivery`
- `/api/project-task-history`
- status transition rules
- blocker reasons and review comments
- task assignment and creation payloads
- task evidence/history
- auth, RLS, run/member permissions and Production data

## Verification
`npm run audit:mettelo-lab` now chains the Phase 10 task UX contract audit. Full sign-off also requires lint, typecheck, build and authenticated Mettelo Lab Chromium visual QA across the existing device matrix.
