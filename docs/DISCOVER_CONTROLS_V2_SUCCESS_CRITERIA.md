# Discover Controls V2 — Success Criteria

## Product goal
The top of Member Discover must help a member move from broad exploration to focused project discovery without making Path selection, search, sorting and filters compete for attention.

The interaction hierarchy is:

1. understand Discover
2. optionally use Capability Path context
3. search the catalogue
4. refine with project filters
5. see the resulting project count
6. inspect a project

## Desktop
- The Discover hero remains visually dominant and is not surrounded by form controls.
- `Manage Paths` and `Recommended for you` are secondary actions in the hero.
- A followed Capability Path is represented by a compact context card, not a permanently expanded two-select form.
- Path controls support changing Path, changing stage where relevant, and clearing Path context.
- Search is the dominant catalogue control.
- Project filters are opened from one `Filters · N` action.
- Active filters appear as removable chips.
- Role, skill, commitment, working model and sort controls are contained in one refinement panel.
- The results count follows the controls immediately.

## Mobile
- The first viewport prioritises title, short explanation, primary navigation actions, compact Path context, search and one filter action.
- Path controls do not consume the first viewport as a large permanent form.
- Project filters open in a bottom-sheet style modal.
- The sheet has a clear title, explanatory copy, labelled controls, Clear all, Close and Show projects actions.
- Active filters can be understood without opening the sheet.
- Horizontal overflow is not introduced at 320 CSS px.

## Accessibility
- WCAG 2.2 AA target.
- Every interactive control is keyboard-operable.
- Visible `:focus-visible` treatment is present.
- Primary touch targets are at least 44 CSS px high/wide where applicable.
- Dialog semantics use native `<dialog>`, an accessible name and predictable focus placement.
- Status and active-filter meaning is conveyed with text, not colour alone.
- Form controls have explicit or screen-reader labels.
- The page remains usable at 200% zoom and narrow reflow.

## Behaviour preservation
- Existing project search/filter semantics are preserved.
- Existing Capability Path query parameters (`path`, `stage`) remain canonical.
- Discover remains broad; a Path only narrows when explicitly selected.
- Recommended remains a separate personalised surface.
- Project cards and their lifecycle actions are unchanged by this redesign.
- No application, membership, run, Lab or Proof lifecycle behaviour changes.

## Release gate
Do not merge until exact-head lint, typecheck, build, public/authenticated browser regression, mobile visual QA and Release Gate checks are green.
