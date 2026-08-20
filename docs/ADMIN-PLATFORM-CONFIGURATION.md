# Admin Platform configuration safety

## Purpose

The Platform workspace gives authorized Mettelo operators access to real shared configuration while keeping deployment secrets and unsupported controls outside the browser. Phase 8 aligns the existing Settings surfaces with the canonical Admin capability model and adds read-only Authentication & SSO status from actual runtime/public Supabase Auth configuration.

## Authorization

Reading `/admin/settings`, mutating platform settings, operating the project contribution-role catalogue, viewing `/admin/platform/auth`, and reading `/api/admin/platform/auth-status` all require `platform.settings.manage`.

The Platform overview is capability-aware. It only links Platform Settings and Authentication & SSO status when the signed-in Admin has `platform.settings.manage`, Admin Access when they have `admin.access.manage`, and Audit Log when they have `system.audit.read`.

## Editable Platform Settings

The existing `platform_settings` store remains the source for public social/contact settings. Values continue to be validated by type: secure HTTPS for URL settings and email syntax for email settings. Text settings render as text inputs rather than being incorrectly forced through a URL input.

The contribution-role catalogue remains the source for project-application contribution choices. Its Admin API now uses `platform.settings.manage` consistently and records `platform.project_role.created` and `platform.project_role.updated` audit events. Safe role state only is written to audit history.

Saved settings and catalogue changes apply immediately to the connected product surfaces; they are not a deployment preview or draft system.

## Authentication & SSO status

Authentication status is read-only. The server checks whether required runtime configuration exists and, when possible, reads Supabase Auth's public `/auth/v1/settings` endpoint to observe email-signup and Google/GitHub provider availability.

The UI exposes only these bounded states: **Configured**, **Missing**, **Enabled**, **Disabled**, and **Unknown**. `Unknown` means the public setting could not be safely observed or was not exposed in a recognized shape. It must not be interpreted as Disabled.

The status response never returns Supabase anon/publishable keys, service-role keys, OAuth client IDs or secrets, passwords, recovery tokens, sessions, refresh tokens, cookies or provider credentials. Provider configuration changes still belong in the authorized deployment/Supabase/OAuth configuration rather than Mettelo Admin.

## Feature flags

Feature Flags remain roadmap-only. No governed runtime feature-flag consumers are currently registered in the repository, so Phase 8 deliberately does not expose a toggle table or pretend that changing an Admin value would alter product behavior. A future flag workspace should only be introduced together with a defined runtime consumer, ownership, default behavior, audit semantics and release tests.

## Failure behavior

If the Supabase Auth settings endpoint is unavailable, slow, returns an unexpected payload or cannot be reached, the Admin status page still renders. Provider/service observations degrade to **Unknown** instead of guessing or taking the Platform workspace down.

Missing core environment configuration is surfaced as **Missing** without returning the environment value itself.

## Testing

Deterministic release checks verify capability gates, audit hooks, safe status fields, the absence of fake Feature Flag controls, responsive contracts and this documentation. Authenticated isolated-Supabase browser coverage verifies:

- the status endpoint returns only recognized states;
- configured secret values are not echoed in the JSON response;
- an anonymous status request returns `401`;
- unsafe `http://` Platform URLs remain rejected;
- the real contribution-role catalogue remains reachable to an authorized Admin;
- Platform overview, Authentication status and Settings have no page-level horizontal overflow at 390, 768 and 1440 px.

## Rollback

Revert the application changes from the Platform configuration safety PR. The existing `platform_settings` and `project_role_catalogue` persistence remains unchanged, so no destructive database rollback is required.

Do not move secrets into `platform_settings` as a rollback workaround. Authentication provider and service credentials must remain in the authorized deployment/Supabase/OAuth configuration. Feature Flags should remain unavailable until a real runtime consumer exists.
