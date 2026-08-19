# My Mettelo Member Home v3

Last updated: 19 August 2026

## Product boundary

My Mettelo is the authenticated member's personal cross-project environment. Mettelo Lab is the working environment for one specific project.

The member mental model is:

```text
Login -> My Mettelo Home -> Project -> Mettelo Lab
```

Home is a prioritisation and orientation surface. It summarizes current state and routes members to the owning destination; it does not recreate project Tasks, Chat, Data, Resources, Events, Team or project Proof interfaces.

## Member information architecture

Desktop navigation is grouped as:

- **My Work:** Home, Projects, Applications, Proof, Profile.
- **Explore:** Discover, Recommended, Opportunities, Saved, Events.
- **Reputation:** Spotlight.
- **Role Tools:** Project Lead and Project Architect only when the authenticated member has the relevant assignment/account state.

The shared source is `lib/member-navigation.ts`.

Mobile persistent navigation is exactly:

1. Home
2. Projects
3. Discover
4. Proof
5. More

Mobile More exposes Applications, Recommended, Opportunities, Saved, Events, Spotlight and Profile, plus applicable Role Tools. The existing Project Architect progression pathway remains reachable for members who are not yet architects without presenting it as an authorized Role Tool.

## Current capability ownership

| Capability | Owning destination | Home behavior |
| --- | --- | --- |
| Active project | `/member/projects` / `/member/projects/[id]` | Summarize current project and route primary action to Mettelo Lab |
| Project work | Mettelo Lab | Select one useful assigned task for Up Next; do not duplicate task management |
| Applications | `/member/applications` | Show latest meaningful status/update |
| Verified Proof | `/member/proof` | Show verified evidence count and explain its value |
| Profile readiness | `/member/profile` | Show accessible completion progress only when useful |
| Discover | `/projects` | Secondary discovery route |
| Recommended | `/member/recommended` | Count projects matched by existing domain/tool preference logic |
| Opportunities | `/opportunities` | Secondary jobs/internships route |
| Saved | `/member/saved-opportunities` | Compact retained-item summary |
| Member Events | `/member/events` | Navigation destination; project events remain in Mettelo Lab |
| Spotlight | `/member/spotlight` | Render Home summary only when draft recognition requires consent |
| Project Lead | `/member/project-lead` | Conditional role entry only when a real lead membership exists |
| Project Architect | `/member/architect-projects` | Conditional role entry only for Project Architect account state |

## Home priority logic

`app/member/page.tsx` derives Home from authenticated production data under the member's Supabase session. The current order is intentionally conservative and does not manufacture urgency:

1. assigned overdue project task;
2. assigned blocked project task;
3. next assigned project task;
4. pending Spotlight consent;
5. application state that opens active work;
6. incomplete profile;
7. profile-matched recommendations or broad discovery.

The personal queue distinguishes `ACTION`, `UPDATE` and `CONSENT`. Informational application states explicitly say when no action is required.

## Data and authorization

Home uses the authenticated server Supabase client for member-owned reads from existing tables such as `profiles`, `project_applications`, `project_members`, `project_tasks`, `contributions`, `saved_opportunities`, `spotlights`, preference tables and public projects.

No new table, migration, RLS rule or service-role browser access is introduced by v3.

Role-tool visibility is derived from the member's own account/assignment state. Visibility is not the authorization boundary: Project Lead, Project Architect, project workspace and Spotlight destinations continue to enforce their existing server/RLS rules.

Cohort privacy remains unchanged. Home may show the authenticated member's own team/run context through their membership data but does not load or expose another cohort's private roster.

## Responsive and accessibility contract

- Mobile `<=480px`: compact header, single-column Home hierarchy, five-item persistent bottom navigation, safe-area padding and mobile More.
- Tablet `481-1024px`: compact persistent rail with readable main column; cards are not squeezed into a desktop grid.
- Desktop `>=1025px`: grouped member rail, dominant working column and secondary supporting column.

Required browser evidence covers 375, 390, 414, 768, 1024 and 1440 pixels plus 200% text zoom and horizontal-overflow assertions.

All member navigation exposes `aria-current` for the current destination. Icon-only controls retain accessible names, keyboard focus remains visible, progress uses `role="progressbar"` with numeric values, mobile targets are at least 44 CSS pixels, status is expressed in text as well as styling, and reduced-motion preferences disable non-essential motion.

## Regression evidence

- `npm run audit:member-home` validates the information architecture, dynamic-data/no-placeholder contract, Spotlight separation, conditional role-tool behavior, accessibility semantics and responsive source rules.
- `tests/member-home-v3-visual.spec.ts` exercises the authenticated Home hierarchy, navigation, mobile More, overflow, Mettelo Lab routing and responsive screenshots.
- The test is included in `test:e2e:smoke` and `test:e2e:staging`.
- `npm run build` includes the deterministic member-Home audit.

Do not weaken these assertions to accommodate a future redesign. Update the contract intentionally when product behavior changes.

## Rollback

The change is isolated to the member navigation source/shell, `/member` Home, focused tests/audit and this documentation. A regression can be reverted through a focused PR without rolling back Mettelo Lab data, APIs, RLS or database state.
