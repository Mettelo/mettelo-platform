# Project Catalogue Filters V2 — Phase 1 Success Criteria

## Phase 1: Taxonomy, metadata coverage and catalogue readiness

### Product outcome
Create a trustworthy project-classification foundation so project discovery never depends on a small set of hand-filled role skill arrays. Phase 1 is a hard prerequisite for Member Discover Filters V2 and the public Projects filter experience.

### Baseline observed before implementation
- 120 visible/member-discoverable projects.
- 119 projects have at least one project role.
- Only 27 projects currently have any `project_roles.skills` metadata.
- 151 distinct raw role-skill strings already exist, including combined and inconsistent values such as `SQL/Python`, `Power BI/Tableau`, casing duplicates and near-synonyms.
- Only 3 visible projects currently have canonical domain relations.
- Only 1 visible project currently has canonical tool relations.
- Only 2 visible projects currently have canonical method relations.
- 117 imported projects have governed Capability Path placement/context that can be used as deterministic backfill evidence.

The phase is not successful if the UI can display more filter options while most projects remain unclassified.

## Product and design principles
1. Taxonomy values are governed product data, not frontend constants.
2. One concept has one canonical meaning and one canonical display label.
3. Tool/technology, method, domain, role and capability are distinct dimensions.
4. Specific classification is used only when source evidence supports it. Unknown industry classification falls back to `Cross-industry / Open Data` rather than guessing.
5. Future projects must satisfy catalogue-readiness rules before becoming discoverable.
6. Phase 1 must not alter application, membership, team formation, Mettelo Lab, Proof, Capability Path progression or project lifecycle semantics.

## Canonical data model

### Roles
`project_role_catalogue` remains the canonical role-family vocabulary.

`project_roles` gains an optional canonical role-family reference so project-specific role titles can remain human-readable while filtering uses a stable role family.

### Skills / capabilities
Use the existing `capabilities` and `project_capabilities` model rather than introducing a parallel skills table.

Capabilities must be separated into:
- `technical`
- `professional`

Examples include Data Analysis, Data Quality, Statistical Analysis, Forecasting, Feature Engineering, Model Validation, Research Design, Data Storytelling, Stakeholder Communication, Critical Thinking, Documentation and Leadership.

### Tools / technologies
Use the existing `tools` taxonomy for concrete technologies such as SQL, Python, Power BI, Tableau, GitHub, dbt, Spark and cloud platforms.

Generic disciplines such as Machine Learning, NLP or Generative AI must not be treated as interchangeable with concrete vendor/tool choices in new catalogue logic.

### Methods
Use the existing `methods` taxonomy for analytical or delivery methods such as Forecasting, Classification, Regression, Clustering, Experimentation, Data Quality and Dashboarding.

### Domains
Use the existing `domains` taxonomy for industry/problem domains.

### Catalogue readiness
Expose one deterministic readiness contract per project. Required discovery dimensions are:
- project type;
- at least one canonical role family;
- at least one domain;
- at least three canonical capabilities across the project/roles;
- working model where applicable;
- duration;
- weekly commitment;
- valid project stage.

Tools may legitimately be empty when the project is tool-agnostic. Empty and missing must be distinguishable in readiness output.

## Backfill rules
1. Preserve existing canonical project-domain/tool/method relations.
2. Import-ledger metadata is preferred when explicitly present.
3. Capability Path target roles and competency text may be used as governed evidence for imported projects.
4. Existing role skill strings may seed capability/tool mappings only through explicit aliases; raw strings are never copied blindly into the canonical taxonomy.
5. Combined values are split (`SQL/Python` -> SQL + Python; `Power BI/Tableau` -> Power BI + Tableau).
6. Case-only duplicates and synonyms resolve to one canonical record.
7. For industry domain only, projects without defensible domain evidence receive the neutral fallback `Cross-industry / Open Data`.
8. The migration must be idempotent and safe to run against an environment where some taxonomy relations already exist.

## Future-project governance
A new or edited project must be able to answer catalogue readiness before publish/recruiting visibility.

Readiness must report individual criteria, for example:
- `role: ready`
- `domain: ready`
- `capabilities: 4/3 ready`
- `working_model: ready`
- `duration: ready`
- `commitment: missing`
- `tools: intentionally_optional`

The phase may introduce the readiness function/view now; blocking authoring UI is Phase 3.

## Security and privacy criteria
1. Taxonomy tables contain no private member data.
2. Public users may only read active taxonomy values and relations for projects already permitted by project visibility rules.
3. Member-only project taxonomy must not be exposed to anonymous users.
4. Write access remains restricted to trusted/admin/service paths; normal members cannot mutate canonical taxonomy.
5. All new SQL functions use an explicit safe `search_path` where applicable.
6. No security-definer function may unintentionally broaden project visibility.
7. Existing RLS protections remain intact.

## Performance criteria
1. Canonical relations have appropriate lookup indexes.
2. Catalogue queries can bulk-load facets; no N+1 taxonomy reads are required.
3. The design supports hundreds to thousands of projects without replacing the taxonomy model.
4. Migration/backfill operations are bounded, deterministic and idempotent.

## QA success criteria
Phase 1 is accepted only when all of the following are true:

1. 100% of visible/member-discoverable projects have a valid canonical project type.
2. 100% have at least one canonical role family.
3. 100% have at least one canonical domain; neutral fallback is allowed only where no more specific source evidence exists.
4. 100% have at least three canonical capabilities.
5. 100% have duration and weekly commitment where catalogue semantics require them.
6. Working model is populated or explicitly handled where applicable.
7. Canonical taxonomy has no case-insensitive duplicate labels/slugs.
8. Combined raw values do not survive as canonical tool/capability values.
9. A project with a newly associated canonical capability automatically becomes discoverable through shared facet data without frontend code changes.
10. A project with a newly associated tool/domain/method automatically becomes available to relevant future filters without frontend code changes.
11. Existing public/member project visibility remains unchanged.
12. Existing Apply, Save, membership, Capability Path, Lab and Proof journeys remain unchanged.
13. Migration is repeatable/idempotent in isolated Supabase QA.
14. RLS tests prove anonymous users cannot read member-only project facet relations.
15. Typecheck/lint/build and database migration validation pass.
16. Existing public browser regression and authenticated regression remain green.
17. Supabase security and performance advisor results introduce no new unresolved issue attributable to this phase.
18. Exact-head Release Gate is green before merge.

## Exit gate to Phase 2
Phase 2 must not start implementation against production semantics until a Phase 1 evidence query proves all required visible projects meet catalogue readiness and the Phase 1 exact head is green.