# Open Project Continuous Cohorts — Success Criteria

## Product contract

### Open projects
- `project_type='open'` represents a reusable Mettelo project definition, not a one-time team vacancy.
- An open project remains discoverable and application-capable while the canonical project is live.
- When the current forming cohort reaches its required team size, that run may start independently.
- Starting Team N must not close the canonical project to prospective Team N+1 applicants.
- If no forming run exists, published role capacity is treated as fully available for the next cohort.
- When the first applicant for the next cohort is approved, Admin creates the next forming `project_run` automatically.
- Members in active, review or completed runs must not consume role capacity for a future forming run.
- Applications, memberships, delivery work and Proof remain run-scoped once a member joins a cohort.

### Partner projects
- `project_type='partner'` remains a single controlled partner intake cycle by default.
- Existing waiting/active membership continues to consume the partner project's role capacity.
- Partner projects never auto-start from the open-project cohort rule.
- A second partner delivery cycle requires an explicit authorised project/run decision; it is not created by the continuous-open-project mechanism.

## Availability contract
- Member Discover, Member project detail, Apply, and the project-application API use the same role-capacity meaning.
- Open-project capacity is counted only from the oldest not-started `forming` run.
- If an open project has no forming run, used capacity is zero.
- Partner-project capacity remains project-scoped.
- Capacity lookup failure must fail closed: the UI/API must not claim a role is available when availability cannot be confirmed.

## Imported catalogue correction
- The approved Capability Paths import contains 117 open projects with team size 5.
- Those projects must be `status='open'`, `applications_open=true` when intentionally released for member applications.
- Because the approved workbook does not define named team roles, the release may use one transparent `Project Contributor` role with 5 openings rather than inventing specialist titles.
- The role can later be replaced or supplemented by Admin with project-specific role definitions.

## Regression checks
- Team 1 full + active → project remains Open for applications.
- Team 1 active + no Team 2 forming run → role shows full availability for Team 2.
- First approved Team 2 member → Team 2 forming run is created automatically.
- Team 2 capacity counts only Team 2 waiting/active members.
- Team 1 members never reduce Team 2 role availability.
- Partner team full → no automatic Team 2 intake is created.
- Existing application, withdrawal, membership, Lab and Proof journeys remain unchanged.
