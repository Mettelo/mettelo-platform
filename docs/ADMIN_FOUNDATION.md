# Admin Foundation: Capability and Audit Boundary

## Purpose

This slice establishes low-conflict Admin platform primitives while other feature PRs are still in flight. It is intentionally additive and does not redesign the Admin shell, Overview, settings, Careers, Spotlight, CI, package scripts, or shared feature tests.

## Success criteria

- Trusted Admin identity remains rooted in `app_metadata.role === 'admin'`.
- Existing trusted Admins retain access until an explicit capability array is configured.
- Once `app_metadata.admin_capabilities` exists, capability checks fail closed if the array or any entry is invalid.
- Browser clients cannot directly read or mutate the Admin audit table.
- Authorized server APIs use the server-only service client after independently checking capability.
- Audit history is append-only at the application privilege boundary.
- Audit snapshots redact sensitive key names and obvious credential-like values before persistence.
- No secrets, tokens, cookies, credentials, service-role keys, private keys, authorization headers, sessions, or signatures belong in audit records.
- The Audit Log is read-only, keyboard accessible, responsive, filterable and paginated without page-level horizontal overflow.

## Capability model

`lib/admin-capabilities.ts` defines the initial capability registry and resolver.

Current migration behavior is deliberately backwards compatible:

1. A user must first be a trusted Admin through `app_metadata.role === 'admin'`.
2. If `admin_capabilities` is absent, that trusted Admin keeps the existing broad access behavior.
3. If `admin_capabilities` is present, it becomes authoritative.
4. Every explicit entry must be a registered capability or the trusted `*` wildcard; one unknown or malformed entry fails the entire explicit configuration closed.
5. `*` is supported only for a trusted Admin and represents all registered capabilities.
6. An explicit empty array grants no capabilities.

This prevents the first foundation PR from accidentally locking out existing operators while making later least-privilege rollout possible. It also prevents a partially valid but malformed capability payload from silently retaining privileged access.

## Audit model

`public.admin_audit_log` stores operational history with:

- actor user ID and optional normalized email snapshot;
- evaluated capability;
- action;
- resource type and optional resource ID;
- success/failure/denied result;
- optional reason;
- sanitized before/after state;
- sanitized operational metadata;
- timestamp.

The table has RLS enabled. `anon` and `authenticated` receive no direct privileges. The server service role receives only `select` and `insert`; update/delete/truncate privileges are revoked for the application service role.

The migration also constrains the lengths accepted by the database and adds indexes for the main operational read paths: newest events, actor ID/email, action, resource and result.

## Audit sanitization

`recordAdminAudit()` is the only intended application helper for inserts.

Before persistence it:

- truncates bounded text fields;
- normalizes actor email to lowercase;
- recursively limits depth and array size;
- converts non-finite numeric values into safe strings;
- redacts sensitive key names including password, secret, token, authorization, cookie, credential, session, refresh, signature, API key, service-role and private-key patterns;
- redacts obvious bearer/Supabase credential-like string values even when a caller puts one under a poorly named key.

Sanitization is a defence-in-depth guard, not permission to pass secrets to the audit helper. Callers must still provide only the minimum operational context required for accountability.

## Audit API

`GET /api/admin/audit`

Requires:

- authenticated user;
- trusted Admin identity;
- `system.audit.read` capability.

Supports bounded filtering by:

- `actor` — exact Admin user UUID or normalized email;
- `action`;
- `resource_type`;
- `result` (`success`, `failure`, `denied`);
- `page`;
- `page_size` (max 100).

The legacy `limit` query parameter remains accepted as a page-size alias for compatibility. Responses include `items`, `page`, `page_size`, `total`, and `pages`. Invalid result filters return `400` instead of being silently ignored.

There is intentionally no public POST/PATCH/DELETE audit endpoint. Domain-specific privileged mutations should call `recordAdminAudit()` after their own authorization and business-rule validation.

## Audit Log UI

`/admin/system/audit` is a read-only server-rendered workspace.

The experience follows existing Mettelo Admin list conventions rather than adding a separate dashboard style:

- concise page header and explanation;
- Actor email/ID filter;
- Action filter;
- Resource type filter;
- Result dropdown;
- Rows dropdown (`25`, `50`, `100`);
- explicit Apply and Clear actions;
- result summary (`Showing x–y of total`);
- Previous/Next pagination that preserves active filters;
- semantic table headers and a screen-reader caption;
- contained keyboard-focusable horizontal table scrolling where a narrow viewport cannot show all operational columns;
- textual Success/Failure/Denied labels, so state is not communicated by colour alone;
- distinct source-error and true-empty states.

Responsive intent:

- mobile `<=480px`: single-column filters, stacked summary/pagination, 44px controls, contained table scrolling;
- tablet `481–1024px`: two/three-column filter composition with readable controls;
- desktop `>=1025px`: compact multi-column filters and dense operational table.

The page deliberately does not add its own replacement navigation. The active stacked Admin work currently touches `components/AdminShell.tsx`; after that stack settles, Audit Log should be inserted into the final **System** navigation group and protected by the same capability boundary.

## Integration rule for future Admin mutations

Preferred sequence:

```text
request
→ authenticate
→ trusted Admin check
→ capability check
→ validate input
→ enforce domain rule
→ mutate canonical domain
→ record sanitized audit event
→ return safe response
```

A failed audit insert should be surfaced to engineering and considered explicitly when integrating high-risk mutations. Do not silently put secrets into the audit record to improve debugging.

## Follow-up

After the active PR stack settles and the repository returns to a verified Rolling Green Baseline:

1. rebase this branch onto current `main`;
2. inspect the resulting Admin shell/settings changes and resolve the intended System navigation once, not in parallel;
3. rerun exact-head lint, typecheck, interaction/regression audits, build and required isolated Admin/backend tests;
4. integrate audit recording into selected high-risk Admin mutations incrementally;
5. add the Audit Log destination to the final Admin IA without weakening the server boundary;
6. migrate Admin accounts to explicit capability arrays only with a controlled access plan and rollback path.
