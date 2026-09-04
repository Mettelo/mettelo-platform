# Member Discover catalogue capacity

## Problem

My Mettelo Discover loaded eligible projects with a hard `.limit(200)`. Once the catalogue exceeded 200 eligible projects, the UI correctly paginated only the truncated input and therefore displayed `200 projects shown` even though more eligible projects existed.

## Resolution

`loadMemberDiscoverProjects` now reads the complete eligible member catalogue in deterministic 200-row transport batches using Supabase range queries. The batch size limits individual query payloads; it is no longer a product catalogue ceiling.

Ordering is stable across batches by `created_at DESC, id DESC`. Existing enriched/core/minimal schema-drift fallbacks still apply to the whole catalogue. Existing member filtering, Capability Path context, role-capacity state, saved state, application state and UI pagination remain unchanged.

## Regression contract

`tests/member-discover-capacity.spec.ts` prevents reintroduction of a fixed `.limit(200)` and requires the deterministic range loop.

## Follow-up

The public catalogue currently has a separate 500-row transport ceiling in `app/projects/page.tsx`. This PR intentionally isolates the production-visible My Mettelo regression; the public loader should be migrated to the same no-fixed-ceiling pattern before the public eligible catalogue approaches 500 records.
