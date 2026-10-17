# Phase 2B isolated schema proof plan

This is a **prototype SQL file under docs/**, not a Supabase migration. It is NOT wired into migration tooling or automatic deployment. Never apply to Production without the pending Phase 1 restore/data-disposition and approval gates.

## Success criteria
1. Run SQL against disposable Postgres 17 environment with public.projects(id uuid PRIMARY KEY) test fixture.
2. Query pg_catalog: four tables in private schema; RLS on all; no anon/authenticated PUBLIC grants or policies.
3. Insert one staged revision and 50 distinct catalogue projects in one transaction; every external ID 001–050 occurs once.
4. Reapply identical revision source SHA+digest; unique index prevents duplicate version. Repeated import must reconcile rather than blindly insert.
5. Duplicate external ID or repository link within revision must fail transaction. Invalid GitHub URL, absent name/brief or improper state must fail.
6. Operational mapping must refer to existing project UUID; deleting a mapped original project must fail due to RESTRICT. No mapping inferred from legacy key position.
7. Zero rows in all four new tables immediately after schema creation, with public.projects and all existing child row counts/IDs identical.
8. No anonymous member can read a private catalogue table or update publication state. No server keys enter client code.
9. Rollback is not automatically destructive: isolate test fixture, confirm original project and child counts, drop disposable environment only.
10. Review exact schema choices, permissions and RLS with security before generating any versioned production migration.

## Limitations
- Not executed against a disposable database in this PR, therefore the SQL is **unverified**.
- No implementation of an approved revision pointer or server-side synchroniser yet.
- Existing projects mapping table intentionally references legacy/public projects; all current rows remain intact.
- New public catalogue UI is deliberately outside this stage; do not claim the 305→50 discovery transition has occurred.
- PostgreSQL extensions/privileges, schema grants, intended administration mechanism and immutable revision-state enforcement still require review before production migration.
