# Project Detail V2 — Success Criteria

## Product outcome
A person must be able to understand a Mettelo project, judge whether it fits them, understand the commitment and expected contribution, and reach the correct application/lifecycle action without needing another page or guessing what the project requires.

## 1. Canonical detail surfaces
- `/projects/{projectId}` is the canonical public project detail page.
- `/member/discover/{projectId}` is the canonical signed-in project decision page.
- Both surfaces use the same project-detail content contract for problem/use case, deliverables, success criteria, data/resources, capabilities and Capability Path context.
- Public and Member pages must not contradict each other on project title, summary, problem, duration, commitment, application deadline, roles or Path placement.

## 2. Required information architecture
The page presents information in this order:
1. Project identity and concise outcome-led summary.
2. Application state, duration, commitment, role count and deadline.
3. Use case and problem statement.
4. Deliverables.
5. Success / acceptance criteria.
6. Data and resources.
7. Capabilities, methods and tools.
8. Capability Path context where applicable.
9. Potential verified Proof, with no guarantee of Proof before contribution is completed.
10. Contribution roles.
11. What happens after applying.

The main content must remain understandable when read linearly with CSS disabled.

## 3. Application CTA contract
- When a project can accept applications and has a real available role, the primary CTA is clearly labelled `Apply for a role` / `Apply as {role}`.
- A project that is closed, pilot-only, cancelled, has no published role or has unconfirmed capacity never presents an active Apply CTA.
- Signed-out users who choose the public CTA are sent to sign-in with a return URL to the same project.
- The public page does not create a competing application lifecycle; application selection/submission remains in My Mettelo.
- Save remains secondary to Apply on the signed-in decision page.
- On mobile, an eligible project has a persistent bottom application action without covering page content or keyboard focus.

## 4. Project content/data quality
- Problem statement is populated before a project is application-ready.
- At least one structured project-level deliverable is required for the V2 quality standard.
- At least one acceptance criterion is required for the V2 quality standard.
- Data-backed projects publish project-level source/access/governance information before delivery begins.
- Technical/professional capabilities are shown from canonical capability mappings when available.
- Controlled import metadata may be used only as a display fallback for newly imported catalogue metadata; it must not overwrite canonical project data.
- Missing information is shown as an explicit `not yet published` state. The UI never fabricates deliverables, success criteria, dataset licences, role capacity or Proof.

### Legacy rollout rule
Existing live projects predate structured project-level deliverables. V2 initially reports missing deliverables/acceptance criteria visibly rather than automatically closing an already-live legitimate application. A later content-readiness migration may make those fields a hard publication/application gate after legacy projects are enriched.

## 5. Navigation / entry-point consistency
All project-discovery entry points must resolve to the redesigned canonical detail experience when the intent is to inspect a project.

| Entry point | Signed out | Signed in |
| --- | --- | --- |
| Public Projects catalogue | `/projects/{id}` | middleware/member policy may continue to Member Discover, but the project resolves to `/member/discover/{id}` |
| Member Discover | n/a | `/member/discover/{id}` |
| Recommended | n/a | Project inspection resolves to `/member/discover/{id}`; established application/project lifecycle actions may continue to Applications/Projects |
| Capability Path project placement | `/projects/{id}` | `/member/discover/{id}` when using member navigation |
| Saved project | sign-in required | `/member/discover/{id}` |
| Direct public URL | `/projects/{id}` | public page remains valid; `Open/Apply in My Mettelo` resolves to `/member/discover/{id}` |
| Public project page link from Member detail | `/projects/{id}` | `/projects/{id}` |

No route may link to a stale or alternative project-detail implementation.

## 6. Accessibility / WCAG 2.2 AA acceptance
- A keyboard user can reach every actionable control without a mouse.
- A visible skip link moves focus to project detail content.
- Focus indicators are clearly visible and are not clipped.
- Interactive targets are at least 44 CSS px high where practical for primary actions and controls.
- Status is communicated with text, not colour alone.
- Colour contrast meets WCAG AA: 4.5:1 for normal text and 3:1 for large text / UI boundaries where required.
- Heading order is logical and contains one page-level `h1`.
- Breadcrumbs use a navigation landmark and current project text is not an ambiguous link.
- Role selection uses a native button and exposes selected state through `aria-pressed`.
- Disabled/unavailable application actions cannot receive an unintended activation.
- Mobile sticky CTA does not obscure focused content at 200% zoom or narrow viewport widths.
- Content reflows without horizontal scrolling at 320 CSS px width except where a user-controlled data table would genuinely require it.
- Page remains operable at 200% browser zoom.
- Links that open external resources identify that behaviour in visible text (`↗`) and use safe `rel` attributes.

## 7. Responsive UX acceptance
- Desktop: decision summary is visible beside the project header; secondary project actions remain discoverable.
- Tablet: content becomes one column before text or controls become cramped.
- Mobile: title, project metadata, sections, role cards and application controls reflow to one column.
- Long project names and imported content wrap without clipping or viewport overflow.
- No fixed-width desktop rule leaks into mobile navigation or project content.

## 8. Performance and resilience
- Project detail remains server rendered and `force-dynamic` where current lifecycle state requires fresh data.
- Failure to load optional detail enrichment does not 500 the base project page; safe empty states are rendered instead.
- Role capacity remains fail-closed: inability to confirm capacity must not enable Apply.
- Public visibility remains governed by the public project record; service-role enrichment is limited to safe project-detail fields after the project itself has been authorised for display.

## 9. Regression coverage required before merge
Exact-head validation must pass:
- lint
- typecheck
- production build
- public project detail browser test
- authenticated member project detail browser test
- keyboard/focus smoke test
- 320/390 px mobile project detail checks
- 200% text/zoom reflow check
- Discover → project detail journey
- Recommended → project detail journey
- Capability Path → project detail journey
- public project → sign in → same member project journey
- open project → select role → application route
- closed/pilot/no-role project → no active Apply action
- saved project state remains functional
- existing Applications → Projects → Mettelo Lab lifecycle is unchanged

## 10. Release completion
The redesign is complete only when the final exact-head Release Gate is green, the PR is merged to `main`, the production deployment is confirmed, and both the public and authenticated project-detail journeys are verified against production data.
