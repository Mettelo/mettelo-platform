# Mettelo Lab Phase 14 — Events Harmonisation

## User story
As a Mettelo Lab member, I want Events to work as a clear schedule-and-participation workspace so I can understand what is happening next, when it happens, why it matters and how to join or act without operational controls overwhelming the event itself.

## Success criteria
- Keep upcoming and next-event context visually ahead of historical events.
- Make event title, type, date/time, timezone, purpose and meeting mode easy to scan.
- Keep Join event as the primary participation action while governance/edit actions remain secondary.
- Preserve explicit timezone information.
- Keep long titles, agendas, learning objectives and review notes naturally wrapped.
- Preserve at least 44px practical interactive targets and visible keyboard focus.
- Use a stable single-column flow on tablet/mobile and 16px form controls on mobile.
- Remain usable at 200% zoom without horizontal overflow.
- Use the shared Mettelo Lab shell tokens rather than a new colour system.

## Authoritative implementation
`components/ProjectEventsPanel.tsx` remains the authoritative Events implementation. Phase 14 does not create a second event model or duplicate the event workflow.

The Lab view continues to expose the existing `#meetings` surface for `view=events`. The existing presentation/final-presentation surface remains governed by its existing component and logic.

## Presentation hierarchy
1. Events heading and purpose.
2. Upcoming / Past / Final presentation local context.
3. Next Event — strongest event surface and primary Join action.
4. Upcoming event list — compact event cards with explicit time and timezone.
5. Past events — quieter, collapsible historical context.
6. Guided Create Event journey — operational creation controls for permitted users.

## Responsive contract
- Desktop: event facts use up to three columns; creation journey uses two columns.
- Tablet: event facts reduce to two columns; creation journey and toolbar become one column.
- Mobile: event facts, actions, past-event rows and meeting-mode choices become one column; interactive controls retain practical touch size and form controls use 16px text.

## Preserved behaviour
Phase 14 does not change:
- `/api/project-events` requests;
- event creation;
- Mettelo Video versus external meeting selection;
- joining events;
- restrict/cancel/update/review actions;
- presenter or required-attendee selection;
- linked milestone or deliverable relationships;
- event visibility, capacity or registration deadline behaviour;
- project/run scoping;
- reviewer/lead/overseer permissions;
- auth/RLS, database schema or Production data.

## Design-system contract
The Phase 14 stylesheet uses existing Lab shell semantic variables for ink, bronze, focus, borders and surfaces. It intentionally does not introduce a local hard-coded colour palette or fixed viewport positioning.

## Regression protection
`scripts/audit-mettelo-lab-events.mjs` verifies the scoped Events presentation contract and checks that the existing event API/action strings remain present. The audit is chained into `npm run audit:mettelo-lab` and therefore into the production build gate.

## Rollback
Remove the Phase 14 stylesheet composition, Events audit-chain entry, audit file and this document. No API, database, permission or data rollback is required.
