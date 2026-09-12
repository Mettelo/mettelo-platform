# Workstream 2 — Canonical Project Recovery Audit

Baseline `main`: `f406a9771732a9344466b14ffc96bfbb62695af1`

Branch: `workstream2-canonical-project-discovery-decision`

Scope: Project Experience Phases 3, 4 and 5 only. This audit was completed before functional Workstream 2 changes.

## Canonical ownership

```text
public.projects (identity, lifecycle, participation, timing)
  ├─ project_problem_briefs / project_objectives / project_key_questions / project_scope_items
  ├─ project_data_sources + resource-provider/governance metadata
  ├─ project_deliverables / project_success_criteria / project_milestones
  ├─ project_roles / project_role_skills / project_capability mappings
  ├─ project_applications (interest/admission request state; never project definition)
  └─ project_runs (runtime snapshot/history; never a competing definition)
       ├─ project_members
       ├─ Lab/workspace activity
       ├─ completion state
       └─ Proof/contribution evidence

Public, Member, Admin, admission, run, Lab, completion and Proof surfaces are projections/consumers of the above owners.
```

Run snapshots are deliberately historical projections and are not competing canonical definitions. Existing IDs/FKs, applications, runs, memberships, Lab history and Proof history are preservation boundaries.

## Architecture audit matrix

| Area | Current file/table | Canonical owner | Current consumers | Duplication | State | Gap | Risk | Proposed change | Test required |
|---|---|---|---|---|---|---|---|---|---|
| Root instructions | `AGENTS.md` | Repository governance | all engineering | no | PASS | none | low | preserve | static audit |
| Projects table | `public.projects` | `public.projects` | Public/Member/Admin/Lab/runtime | no | PARTIAL | some legacy compatibility fields remain | medium | keep compatibility but make canonical fields authoritative | schema + migration |
| Project migrations | `supabase/migrations/*project*` | migration history | all DB consumers | historical overlap | PASS | large evolution surface | high | additive repair only | clean + populated upgrade |
| Project child tables | canonical content migrations | child relations keyed by project_id | detail/Admin/Lab | no competing project owner found | PASS | acceptance/dependency support incomplete | medium | extend canonical children where needed | CRUD + projection |
| Project ID / slug | `projects.id`; routes use UUID | `projects.id` | all | no ID duplicate | PARTIAL | UUID is stable; slug ownership/routing incomplete | medium | preserve UUID URLs; govern slug without breaking existing routes | ID/URL preservation |
| Project type | `projects.project_type` | projects | Public/Member/Admin | no | PASS | controlled open/partner already | low | preserve | constraint test |
| Visibility | `projects.is_public` + lifecycle predicates | projects | Public/Member | no | PASS | ensure all projections fail closed | high | centralize public-safe predicate | RLS/API test |
| Lifecycle | `projects.status` | projects | all | no | PASS | UI labels can drift | medium | shared projection mapping | lifecycle E2E |
| Recruitment/application state | `applications_open` + run recruitment policy | projects/run policy | Member/Phase6+/Lab | partial semantic duplication | PARTIAL | catalogue still uses role openings | high | derive public/member availability from canonical recruitment/capacity | closed/full E2E |
| Participation mode | `projects.participation_mode` | projects | Member/Phase9 | no | PASS | stale consumers possible | medium | reuse only | mode E2E |
| Minimum/target/maximum | `min_team_size`,`target_team_size`,`max_team_size` | projects | Member/Phase9 | legacy threshold compatibility only | PASS | Public availability not using it | high | shared capacity projection | geometry E2E |
| Duration | projects duration fields | projects | catalogue/detail | no | PARTIAL | presentation/fallback drift | low | canonical projection only | consistency test |
| Weekly commitment | projects commitment fields | projects | catalogue/detail | no | PARTIAL | fallback can hide schema drift | medium | remove legacy fallback | consistency test |
| Working model/format | project fields/taxonomy | projects | catalogue/detail | no | PARTIAL | not uniformly projected | medium | expose through canonical projection | filter/detail E2E |
| Interest close date | lifecycle/application deadline fields | projects | eligibility | no | PASS | must be enforced in RPC | high | retain server enforcement | deadline test |
| Expected start | projects schedule fields | projects/run snapshot | detail/runtime | legitimate snapshot | PARTIAL | projection consistency | medium | preserve canonical→run snapshot boundary | propagation test |
| Context/problem | canonical content child tables | project content children | detail/Admin/Lab | no | PASS | public completeness must be enforced | high | publication gate consumes readiness | publish test |
| Resources/data | `project_data_sources` et al | project resources | Public/Admin/Lab | safe projection exists | PASS | private/public projection must stay strict | critical | whitelist projection | privacy E2E |
| Licence/reuse/storage | resource governance fields + review RPC/history | governance relations | Admin/public safe attribution | no | PARTIAL | Admin publication path bypasses canonical readiness | critical | authoritative publish blockers | governance publish test |
| Deliverables | `project_deliverables` | project children | Member/Lab/completion | no | PASS | publication path not enforcing canonical readiness | high | enforce through publish gate | propagation test |
| Success criteria | `project_success_criteria` | project children | Member/Lab/completion | no | PASS | same | high | enforce gate | propagation test |
| Acceptance criteria | no dedicated canonical owner confirmed | project delivery model | later completion | n/a | MISSING | required structured acceptance model | medium | add canonical criteria relation or governed equivalent | CRUD + projection |
| Milestones | `project_milestones` | project children | Member/Lab | no | PASS | ensure safe projection | medium | reuse | projection test |
| Dependencies | no dedicated project dependency relation confirmed | project definition | Lab/completion | n/a | MISSING | cannot represent explicit dependencies | medium | add canonical dependency relation | CRUD test |
| Skills/capabilities | role skills + capability taxonomy/mappings | canonical taxonomy relations | discovery/detail/Proof context | no | PASS | search must not use stale labels | medium | canonical indexed search | search E2E |
| Responsibilities | Phase10 responsibility model / role responsibilities | project/run responsibility owners | Member/Lab | legitimate run allocation | PASS | initial interest incorrectly asks for formal role | high | keep pre-interest informational; allocate later | role-neutral E2E |
| Role architecture | `project_roles` | project definition | Admin/Member/Phase6+ | no | PASS | role currently required by Team interest UI/RPC | critical | remove role requirement from initial interest | interest E2E |
| Leadership requirement | Phase10 lead/responsibility governance | project/run governance | formation/Lab | no | PARTIAL | pre-interest presentation needs clarity | medium | project-level explanation only | detail test |
| Project Architect | architect/governance migrations | project architect assignment/governance | Admin/Lab | no | PARTIAL | edit authority needs direct IDOR proof | high | preserve assignment authority; add tests | architect IDOR |
| Publication gate | readiness view + legacy TS lifecycle policy | DB/server | Admin | duplicated authority | BROKEN | privileged route can publish when canonical readiness says incomplete | critical | server/DB-authoritative publish operation + direct-mutation guard | invalid/direct publish tests |
| Public Projects | `app/projects/page.tsx` | public-safe projection | anonymous | loader fallback | STALE | role-opening availability + legacy fallback | high | canonical loader/capacity only | catalogue E2E |
| Public Project Detail | `app/projects/[id]` + public-detail RPC | public-safe projection | anonymous | no project-specific pages | PARTIAL | SEO and some state consistency incomplete | high | canonical public detail + metadata | detail/privacy/SEO E2E |
| Member Discover | `app/member/discover` + loader | canonical project + member-safe state | member | loader fallback | STALE | ignores active role-neutral interest in catalogue state | high | canonical interest state + capacity | member discover E2E |
| Member Project Detail | `app/member/discover/[id]` | canonical project + member state | member | no separate project copy | PARTIAL | some service-role projection; eligibility split | high | central server eligibility/state projection | member detail E2E |
| Submit Interest entry | apply page + flow + API + RPC | `project_applications` request state | members | UI/RPC role dependency | BROKEN | Team interest requires formal role | critical | role-neutral initial interest, DB uniqueness retained | submit-interest E2E |
| Profile readiness | Workstream1 readiness + application API | canonical member readiness | interest journey | no | PASS | exact-project return must be verified | high | reuse and preserve next path | profile-return E2E |
| Capacity/member count | memberships + reserved offers + max | membership/run/project geometry | Member detail/Phase9 | Public role-opening approximation | PARTIAL | Public catalogue can disagree | critical | shared canonical capacity projection | full/team state E2E |
| Saved projects | `saved_projects` | member-private bookmark | Member Discover | no | PASS | not lifecycle/admission | low | preserve owner-only RLS | RLS test |
| Search/filter | catalogue taxonomy/filter engine | canonical taxonomy/project relations | Public/Member | fallback projection | PARTIAL | availability and legacy fallback can contradict detail | high | retain engine, canonicalize data inputs | search/filter E2E |
| Source attribution | project data source/provider model | resource governance | Public detail | no | PARTIAL | partnership implication must be controlled | medium | provider attribution independent from project_type | attribution E2E |
| SEO/metadata | public project route | public-safe project projection | crawlers/social | none | MISSING | no project-specific canonical metadata contract confirmed | high | generate metadata from safe public RPC; noindex non-public | SEO leakage test |
| Public-safe APIs | Phase4 public RPC | whitelisted SQL projection | anonymous | no | PASS | catalogue still bypasses via direct table loader | high | make projection/fail-closed loading consistent | anon direct API tests |
| Member APIs | project application API + member reads | server + canonical DB | member | mixed service-role/member client | PARTIAL | eligibility rules split | high | DB final authority for interest eligibility | API + RLS tests |
| Admin editing | admin projects API + draft atomic RPCs | canonical project | Admin | lifecycle readiness duplicated | PARTIAL | publish bypass | critical | route through authoritative publish contract | admin E2E |
| Project Architect editing | architect governance migrations/routes | canonical project | authorized architect | no separate model | PARTIAL | cross-project authority requires proof | high | direct authority/IDOR tests | architect E2E |
| Mettelo Lab reads | run/project relations | canonical project + run snapshots | Lab | legitimate snapshots | PASS | must preserve delivery propagation policy | high | do not create alternate definition | Lab regression |
| Phase6 interest/admission | Phase6 RPCs | application/admission model | review/offers | no | PASS | WS2 changes must remain compatible | critical | preserve downstream statuses/columns | Phase6 regression |
| Phase9 participation | Phase9 runtime/capacity RPCs | project geometry + run snapshot | formation/runtime | legitimate snapshot | PASS | none identified | critical | preserve | Phase9 regression |
| Phase11 readiness | Phase11 readiness/activation | run snapshot + canonical requirements | activation | no | PASS | none identified | critical | preserve | Phase11 regression |
| Phase19 completion | completion boundary | run/delivery state | completion | no | PASS | canonical delivery edits must respect run history | critical | preserve snapshot/history | Phase19 regression |
| Phase20 Proof | contribution/Proof model | verified evidence authority | Proof | no project-definition duplicate | PARTIAL | potential Proof vs Verified Proof presentation must remain separated | high | label potential evidence only; no verification on participation | Proof regression |
| RLS | project/content/resource/member policies | database | all roles | n/a | PARTIAL | service-role success is not proof | critical | direct anon/member/architect tests | RLS suite |
| Service role | server-only Supabase admin helpers | server | APIs/server components | n/a | PARTIAL | several reads rely on service role | high | ensure no browser exposure; pair with direct RLS proof | bundle/security test |
| Analytics | Phase6/12/18+ analytics | privacy-safe event tables | product reporting | no | PARTIAL | WS2 funnel coverage/PII contract incomplete | medium | add safe event names/field allowlist only if needed | analytics privacy test |
| Accessibility tests | existing Playwright/a11y suites | UI components | Public/Member/Admin | n/a | PARTIAL | WS2 exact 320px/keyboard/SR/reflow matrix not dedicated | high | dedicated WS2 accessibility job | browser a11y |
| Public/member regression | existing CI browser shards | repository CI | release gate | n/a | PARTIAL | no WS2 dedicated exact-head contract | critical | add WS2 workflow plus existing CI | exact-head release |

## Duplicate/deprecate list

The following are compatibility/projection mechanisms, not new canonical owners, and must not be allowed to override canonical project data:

1. `team_size_threshold` — legacy compatibility alias of canonical minimum; preserve only for older consumers.
2. Legacy scalar catalogue loader fallback — deprecate/fail closed rather than silently projecting incomplete data.
3. Role-opening based `getProjectPublicAvailability` — replace as project-capacity/recruitment authority.
4. Legacy TypeScript publication completeness check — deprecate as publish authority; retain only presentation if it delegates to the database-authoritative result.
5. `project_runs` project fields — historical runtime snapshots; preserve and never treat as editable canonical project definition.
6. `project_applications.project_role_id` — remains valid for later/formal role workflows and historical applications, but must not be required for initial role-neutral interest.

## Preservation boundaries

- Never rewrite existing `projects.id`.
- Preserve all existing UUID project routes.
- Preserve existing slug values if present; any slug repair must be additive and collision-safe.
- Preserve applications, memberships, runs, Lab activity, completion records and Proof/contributions.
- Do not fabricate licence, reuse, retention, storage or evidence-sensitive governance values.
- Do not rewrite geometry snapshots for already-started runs.
- Keep Phase 9 target semantics: target is preferred, not the activation minimum; maximum is hard capacity.
- Keep Phase 20/Proof as verification authority.

## Implementation decision

Workstream 2 is a recovery/consistency project, not a replacement project model. Functional work may begin only by extending the owners above, closing stale projection/bypass paths, and adding exact-head release evidence.