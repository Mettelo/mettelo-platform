# Mettelo Lab naming-consistency audit

Date: 18 August 2026

This audit covers only the branded project-workspace destination formerly labelled **Team**. Literal uses of team/cohort terminology remain unchanged: Team 1, Team 2, team members, team status, Project Lead, Project Architect and member-count language are not renamed.

## Changed destination references

- `app/member/projects/[id]/layout.tsx`
  - Workspace navigation label `Team` → `Mettelo Lab`.
  - Step 03 in the Overview orientation now links to `#mettelo-lab` and is labelled `Mettelo Lab`.
  - Overview copy now says “collaborate in Mettelo Lab”.
- `app/member/projects/[id]/page.tsx`
  - Inner workspace navigation `Team` → `Mettelo Lab`.
  - The previous duplicate project/team stat band is removed.
  - `MetteloLabPanel` becomes the single collaboration summary destination.
- `components/MetteloLabPanel.tsx`
  - Adds the branded `METTELO LAB` eyebrow, Next Action, consolidated Team & Role Summary, recent Conversation preview and reviewer slot.
- `components/ProjectCollaborationPanel.tsx`
  - Removes the duplicate roster ownership so the roster is rendered only inside Mettelo Lab.
- `components/ProjectTeamRoster.tsx`
  - Keeps literal cohort naming (`Team {run_number}`) unchanged.
  - Adds non-member cohort treatment without renaming team/cohort language.
- `docs/FEATURES.md`
  - Adds Mettelo Lab as a named platform capability and documents the distinction between the branded destination and literal team terminology.
- `docs/DECISIONS.md`
  - Records the rename decision, Overview consolidation decision and cross-cohort permission decision.
- `scripts/audit-phase-2-member-projects.mjs`
  - Requires `Mettelo Lab` in both project navigation layers and fails if the old branded `href="#team">Team` destination returns.

## Checked but intentionally not renamed

The following language remains correct because it refers to actual people/cohorts rather than the branded destination:

- `Team 1`, `Team 2`, other run/cohort names.
- `Team status`, `team members`, `project team`, member counts.
- `Project Lead`, `Project Architect`, Contributor/Reviewer role labels.
- “Track what the team needs to deliver.” and similar collaboration copy.
- Notification/application language about joining or forming a team.

## Communication templates

No change is made to generic communication-template wording merely because it contains the word “team”. Only copy that specifically names the workspace destination should use “Mettelo Lab”. No such destination-specific communication-template string was identified in the implementation files touched by this change.
