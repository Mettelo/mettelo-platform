# Open Project Continuous Cohorts — Success Criteria

## Product contract

### Open Projects
- `project_type='open'` represents a reusable Mettelo project definition, not a one-time team vacancy.
- An Open Project remains discoverable and application-capable while the canonical project is live and intake has not been deliberately paused.
- A canonical Open Project has **no one-time project-level application deadline**. A stale deadline must never permanently close Team N+1. If timed recruitment is needed later, it belongs to a cohort/run rather than the reusable project definition.
- When the current forming cohort reaches its required team size, that run starts independently.
- Starting Team N must not close the canonical project to prospective Team N+1 applicants.
- If no forming run exists, published role capacity is treated as fully available for the next cohort.
- When the first applicant for the next cohort is approved, Admin creates the next forming `project_run` automatically.
- Members in active, review or completed runs must not consume role capacity for a future forming run.
- Applications, memberships, delivery work and Proof remain attached to the cohort/run that produced them.
- Under the current canonical-membership model, one member participates in a given canonical project once. A later cohort must never overwrite that member's original membership/run history; repeat participation would require a deliberate future schema/product change.

### Partner Projects
- `project_type='partner'` is one controlled partner intake and one delivery run.
- Partner Projects may use a project-level application deadline because the engagement is single-cycle.
- Existing waiting/active membership consumes that Partner Project's role capacity.
- Partner Projects never auto-start from the Open Project cohort rule.
- Starting the Partner Project automatically closes application intake.
- A Partner Project cannot resume intake after its engagement has started.
- A second Partner delivery cycle requires a new explicit authorised Partner Project rather than an automatic second run.

### Paused intake
- Pausing intake stops **new application submissions** only.
- Applications already received remain reviewable and may still be approved while intake is paused, provided the project itself is still in a valid pre-delivery state and capacity remains available.
- Pausing intake must never destroy, withdraw or strand an existing application.

## Publication contract
- Admin-created projects always begin `draft + private + applications_open=false`.
- Workbook-created projects use the same safe Draft state and the same governed publication actions as Admin-created projects.
- Status, visibility and application intake cannot be edited independently; Publish, Pause intake, Resume intake, Unpublish and Archive own those transitions.
- Bulk Admin actions must not expose direct Make public / Make private shortcuts that bypass publication checks.
- Publication requires title, summary, problem statement, team size and enough **total role openings to cover the required team size**.
- Partner publication additionally requires a partner name and, when a deadline exists, that deadline must still be in the future.
- An Open Project publication action clears any legacy project-level application deadline.
- Once applications are open, content/team-size edits cannot make the project cease to be publication-ready.
- A live/application-open project cannot have its role capacity reduced below required team size.
- A role with waiting/active members cannot be deleted or reduced below its current occupied capacity.

## Availability and capacity contract
- Public Projects, Member Discover, Recommended, Member project detail, Apply and the application API use the same lifecycle and role-capacity meaning.
- Open Project capacity is counted only from the oldest not-started `forming` run.
- If an Open Project has no forming run, used capacity is zero for the next cohort.
- Partner Project capacity remains project-scoped because there is only one engagement.
- Application submission rechecks role availability and existing canonical participation history.
- Admin approval rechecks role availability again immediately before assigning the team place.
- Admin approval must never `upsert` an existing membership into a new run; original cohort history is immutable.
- Concurrent approvals racing to create the same next Open cohort converge on the single run protected by `(project_id, run_number)` uniqueness.
- The database is authoritative: concurrent approvals must not exceed either a role's `openings` or the run's total `required_team_size`.
- Capacity lookup failure fails closed: the UI/API must not claim a role is available when availability cannot be confirmed.

## Lifecycle-history contract
- A project with operational history cannot be returned to Draft through Unpublish; use Pause intake instead while work exists.
- A project with pending applications, waiting/active members or a live run cannot be archived.
- Completed historical records remain preserved when a project is eventually archived.
- Project type is locked after applications, runs, memberships or Proof exist.

## Database invariants
- Draft projects are always private with applications closed.
- Applications can only be open on public projects in a lifecycle stage valid for that project type.
- Application-open projects must have total configured role capacity at least equal to required team size.
- Open Projects cannot carry a canonical application deadline.
- Partner Projects cannot accept applications once active/review/completed/cancelled/archived.
- Archived projects are private.
- Partner Projects cannot have a second run.
- A waiting/active project member must reference a role and run belonging to the same project.
- Waiting/active membership for a run + role cannot exceed the role's configured openings, including under concurrent writes.
- Total waiting/active membership in a run cannot exceed that run's required team size, even when concurrent approvals target different roles.
- The migration normalises legacy unsafe combinations before the triggers become authoritative.

## Imported catalogue correction
- The approved Capability Paths import contains 117 Open Projects with team size 5.
- Those projects must be `status='open'`, `visibility='public'`, `applications_open=true` when intentionally released for member applications.
- Because the approved workbook does not define named team roles, the release may use one transparent `Project Contributor` role with 5 openings rather than inventing specialist titles.
- The role can later be replaced or supplemented by Admin with project-specific role definitions, provided application intake is not left with insufficient team capacity.

## Blocking regression checks
- Team 1 full + active → canonical Open Project remains open for applications.
- Team 1 active + no Team 2 forming run → role shows full availability for Team 2.
- First approved Team 2 member → Team 2 forming run is created automatically.
- Team 2 capacity counts only Team 2 waiting/active members.
- Team 1 members never reduce Team 2 role availability.
- An old Open Project application deadline does not close a future cohort and is removed by lifecycle hardening.
- Project team size 5 + total role openings 4 → publication is blocked.
- A live project cannot later be edited to team size 6 while only five role places exist.
- A role with an assigned waiting/active member cannot be deleted or reduced below occupancy.
- Concurrent approvals cannot create a sixth person in a five-person cohort, including when they target different roles.
- A member's previous canonical-project membership cannot be moved into another cohort by a later approval.
- Paused intake still allows already-received valid applications to finish review/team placement.
- Partner team starts → applications close automatically and intake cannot be resumed.
- Partner team full → no automatic Team 2 intake is created.
- Invalid direct writes are exercised against a real disposable Supabase database in the blocking regression suite.
- Existing application, withdrawal, membership, Lab and Proof journeys remain unchanged.
