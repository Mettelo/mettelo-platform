# My Mettelo Discover, Member Project Detail and Apply

Last updated: 19 August 2026

## Product ownership

The authenticated member project journey is:

`My Mettelo → Discover → Member Project Detail → Apply → Applications → Projects → Mettelo Lab`

The public acquisition journey converges into the same application domain:

`Public Project Page → Apply → Sign up / Sign in → Member Project Detail / Apply → Applications → Projects → Mettelo Lab`

The public project page remains an acquisition/SEO surface. Authenticated Discover does not use it as the primary project-detail destination.

## Routes

- `/member/discover` — broad authenticated member project catalogue.
- `/member/discover/[id]` — member-aware project detail.
- `/member/discover/[id]/apply` — stepped internal application flow.
- `/member/applications` — owns application tracking after submit.
- `/member/projects` — owns confirmed/current work.
- `/member/saved` — saved member projects, with a separate link to saved opportunities.
- `/projects/[id]` — public project page, retained as a separate acquisition surface.

## Data map

| UI / behavior | Production source |
| --- | --- |
| Project identity, title, summary | `projects` |
| Member/public visibility | `projects.visibility` plus RLS |
| Project lifecycle/application window | `projects.status`, `project_type`, `applications_open`, `application_deadline` |
| Working model | `projects.location_type` / `location` |
| Duration | `projects.duration_weeks` and project dates where present |
| Commitment | `projects.weekly_commitment` |
| Open project roles | project-scoped `project_roles` |
| Role skills | `project_roles.skills` |
| Role capacity | `project_roles.openings` minus waiting/active `project_members` for that exact role |
| Readiness eligibility | shared Mettelo Readiness model (`PROFILE_APPLICATION_READY`) |
| Application lifecycle | canonical `project_applications` rows where `application_kind='application'` |
| Team Forming / confirmed / active / completed | member `project_members` + `project_runs` |
| Saved project | member-owned `saved_projects` |
| Application fields | canonical project application API (`project_role_id`, `contribution_statement`, optional `availability`, optional `portfolio_url`, current participation terms) |
| Auth return intent | safe `next` path plus short-lived HttpOnly `mettelo_return_to` through onboarding |

Careers tables and recruitment roles are not queried by the member project catalogue, detail page, saved-project flow or project application flow.

## Deterministic member state

`lib/member-project-journey.ts` resolves one state before JSX chooses the action. The action contract is:

| State | Primary action |
| --- | --- |
| Open + eligible + available role + no active application | Apply to this project |
| Submitted / action required / in review / Team Forming | View application |
| Confirmed / active | Open in Projects |
| Completed | View in Projects |
| Closed / ineligible / cancelled | No Apply |

Discover cards never offer a second Apply action. They either open the internal member detail or hand off to Applications/Projects when the member is already further through the lifecycle.

## Submission integrity

`POST /api/project-applications` remains the single full-application write domain. Before insert it revalidates:

1. authenticated member;
2. canonical project and application window;
3. absence of another active full application for the member/project;
4. selected role belongs to the project;
5. live role capacity;
6. current Project Participation Terms.

The database also carries a partial unique index on `(project_id,user_id)` for active full applications, so a role change, double click, race or repeated request cannot create a second active application for the same member/project lifecycle.

## Saved projects

Saving is independent from applying. `saved_projects` is protected by RLS so members manage only their own bookmarks. It never writes `project_applications`.

## Privacy and authorization

- Member project records are loaded through the authenticated Supabase client and project RLS.
- Service-role access is used only for aggregate role-capacity checks; other member identities are not returned to the page.
- No applicant list/count, reviewer notes, admin scores, private Team Forming roster, confidential project data or Careers data is exposed by these routes.
- Role capacity fails closed if the server cannot verify it.

## Responsive and accessibility contract

QA targets: 375, 390, 414, 768, 1024 and desktop.

- Desktop: persistent member rail, two-column Discover catalogue, restrained project-status side panel.
- Tablet: compact member rail, single-column catalogue/detail before layouts become cramped.
- Mobile: five-item Home / Projects / Discover / Proof / More navigation, single-column cards/detail, stacked facts and roles, full-width application actions.
- Project filters use a native modal dialog on mobile for focus containment and Escape handling.
- Controls target approximately 44px, focus is visible, statuses use text plus shape/icon, application errors use live regions, and stepped form focus moves to the new heading.
- Reduced-motion CSS disables transition/animation effects and layouts must remain usable at 200% text zoom without horizontal page overflow.

## Regression coverage

- `scripts/audit-project-interest-flow.mjs` — source-level canonical-domain, routing, Careers-boundary, auth-intent, save and capacity contract.
- `tests/member-discover-domain.spec.ts` — deterministic state/CTA matrix.
- `tests/member-discover-v1-visual.spec.ts` — isolated Supabase fixture plus responsive Discover/detail/apply/save coverage.
- `test:e2e:smoke` includes the member Discover visual spec in the isolated staging lane.

## Stacked integration

This implementation is stacked on the current `feat/profile-readiness-form-standards` head because the member application threshold and public project-form convergence depend on that work. Reconcile the small concurrent `MemberAppShell` change from the Applications PR before final merge if it has landed first.
