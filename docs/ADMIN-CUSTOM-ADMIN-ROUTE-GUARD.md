# Custom Admin Route Guard

## Purpose

Mettelo now has a canonical capability model for Custom Admin access. Older Admin pages and APIs predate that model and some still authorize only by the trusted Admin role. Without a central route guard, a narrowly configured Custom Admin could potentially reach legacy operations outside its granted capability set.

This phase adds a fail closed route firewall in middleware for both `/admin/*` pages and `/api/admin/*` APIs. It does not replace finer authorization inside route handlers. It prevents Custom Admins from reaching unrelated Admin route families before those handlers run.

## Compatibility modes

- **Legacy full Admin**: trusted Admin with no `admin_capabilities` value. Existing broad Admin access is preserved for backward compatibility.
- **Full Admin**: trusted Admin with `admin_capabilities: ['*']`. Existing broad Admin access is preserved.
- **Custom Admin**: trusted Admin with an explicit list of known capabilities. Only mapped route families matching at least one granted capability are reachable.
- **Invalid configuration**: malformed or unknown capability metadata. Access fails closed.

The Admin overview itself remains reachable to a valid Custom Admin so the user has a safe landing page.

## Route policy

The policy lives in `lib/admin-route-capabilities.ts`. Ordering is intentional: more specific route prefixes are evaluated before broader families.

Explicit mappings cover the capability model already defined by Mettelo, including Admin Access, Platform Settings, System audit/health, Communications, Careers, Project operations/review, QA, Proof, Spotlight and governed Website operations.

The firewall does **not** invent new capabilities for legacy areas that have no canonical capability yet. Unmapped Admin page or API routes remain Full/Legacy Admin only. This is safer than assigning an unrelated permission based on naming or UI location.

Within a mapped family, existing handlers remain authoritative for finer actions. For example, `website.content.edit` allows a Custom Admin to reach Website Media and its API, while the SEO publish endpoint still independently requires `website.content.publish`.

## Page versus API behavior

For browser pages:

- unauthenticated users continue to be redirected to sign-in;
- non-Admin users continue to be redirected to the member workspace;
- a trusted Custom Admin without the required route capability is redirected to `/admin?reason=capability`.

For `/api/admin/*`:

- unauthenticated requests return JSON `401`;
- non-Admin or capability-denied requests return JSON `403`;
- unknown/unmapped routes are denied to Custom Admins before legacy handler logic can grant broad role-only access.

The middleware matcher explicitly includes `/api/admin/:path*` so direct API calls cannot bypass the page boundary.

## Security invariants

Malformed capability configuration is never treated as Full Admin. Unknown capability keys do not grant access. The central guard uses the same canonical capability registry and resolver as the Admin Access workspace.

No passwords, sessions, access tokens, refresh tokens, provider secrets, service-role values or production identity data are changed by this phase.

## Release evidence

The deterministic audit checks the route maps, Full/Legacy compatibility, fail-closed fallback, API middleware coverage and the browser test contract.

The isolated-Supabase Admin capability lifecycle temporarily grants the disposable E2E member only `website.content.edit`, proves `/admin/website/media` and `/api/admin/website/media` remain available, proves `/api/admin/intake` is denied with `403`, proves `/admin/intake` redirects to the safe Admin overview, proves ungranted Website publish is still denied by the finer handler capability, then revokes the disposable Admin role during cleanup.

## Adding a new Custom Admin route

Do not add a route mapping merely to make a screen reachable. First identify the canonical capability that actually governs the data and actions. If no appropriate capability exists, keep the route Full/Legacy-only until the product introduces and tests a deliberate capability contract.

API and page mappings should be as specific as practical. Broad family mappings are acceptable only when their child handlers already enforce finer action-level authorization.

## Rollback

Revert the route-guard application PR to restore previous middleware behavior. No database migration or identity rewrite is involved.

Rollback broadens legacy role-based reach for Custom Admins, so it should be treated as a security regression rather than a neutral configuration change. Existing `admin_capabilities` metadata remains authoritative and should not be deleted as part of rollback.
