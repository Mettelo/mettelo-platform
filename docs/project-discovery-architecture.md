# Project Discovery Infrastructure

## Architecture discovered

Mettelo already has one shared catalogue filtering utility (`lib/project-catalogue-filtering.ts`) used by both `/projects` and `/member/discover`. Public Projects owns shareable URL state and server pagination; Member Discover adds member state, saved state, application state, live role capacity and Capability Path context before passing projects into the same filtering utility.

Project data originates in `projects`. Discovery enrichment is relational: `project_role_catalogue`, `capabilities`, `domains`, `tools`, `methods`, Capability Paths and capability aliases. Public and member loaders deliberately fall back when optional PostgREST relationships are unavailable so a taxonomy problem does not blank the catalogue.

Admin project writes go through `/api/admin/projects`. Lifecycle status, visibility and application intake are separately governed. Existing scalar discovery fields include `difficulty_level`, `location_type`, `team_size_threshold`, `duration_weeks`, `weekly_commitment`, `project_type`, status, visibility, application deadline and `applications_open`. The current Admin editor exposes only a subset of those fields, while role/capability management is already separate and governed.

Production taxonomy inspection confirms controlled tables for project roles, domains/industries, capabilities, tools and methods. The active `domains` taxonomy is already the controlled industry layer (for example Healthcare & Life Sciences, Finance & FinTech, Technology & SaaS, Government & Public Sector and Cross-industry / Open Data), so a duplicate Industry table is not required.

## Canonical discovery model

The existing `ProjectCatalogueFilters` remains the authority. It is extended rather than replaced with canonical dimensions for query, career/role, experience, Solo/Team format, capability, industry/domain, tool, weekly commitment, working model, project source, availability, lifecycle stage, duration and sorting.

Cross-category matching is AND. Taxonomy values are resolved from governed relationships, not a frontend list. Single-value public bands are normalized from existing project metadata.

### Normalisation

- Experience: Entry/Foundation/Beginner -> Beginner; Intermediate and Intermediate-Advanced -> Intermediate; Advanced/Capstone -> Advanced. Unknown values remain unclassified.
- Format: existing `team_size_threshold=1` -> Solo; values greater than one -> Team. The exact team size remains authoritative metadata.
- Commitment: existing display text is preserved, while discovery maps it to Up to 3, 3-5, 5-7, 7-10 or 10+ hours/week.
- Length: `duration_weeks` remains authoritative and maps to Short (<=3), Standard (4-6) or Extended (7+).
- Project source: existing `project_type` remains authoritative and is presented as Mettelo Open Projects or Partner Projects.
- Availability: discovery derives Open to join, Team forming, In progress or Completed from lifecycle/application/capacity context. The lifecycle state machine is not replaced.
- Working model: existing `location_type` maps to Remote, Hybrid or On-site.

## Compatibility boundaries

Existing projects are not removed when new metadata is missing. Null/unknown values simply do not participate in that facet. Existing project cards, application/interest routing, member readiness, saved state, live role capacity, lifecycle rules, visibility, RLS and Capability Path logic remain authoritative.

The catalogue must never depend on static workbook values. Imported or Admin-created projects become discoverable from their stored scalar fields and governed taxonomy relationships. New taxonomy rows become filter options automatically once associated with eligible projects.

## Scalability

Member Discover uses deterministic bounded Supabase range batches rather than a fixed 200-project product ceiling. Public Projects must follow the same no-fixed-ceiling contract while retaining 12-card UI pagination; future database-side filtering/full-text search can replace in-memory filtering without changing the canonical filter vocabulary.

## Implementation sequence

1. Canonical normalization/filter model and regression tests.
2. Public loader no-fixed-ceiling query and new filter URL dimensions.
3. Approved public desktop/mobile filter controls using the existing component/design system.
4. Member Discover contextual integration using the same engine.
5. Admin discovery metadata/taxonomy controls using existing tables and `/api/admin/projects` governance.
6. Capability Path contextual refinements, analytics, E2E, responsive/200% and final regression coverage.
