# Admin Foundation: Capability and Audit Boundary

## Purpose

This slice establishes low-conflict Admin platform primitives while other feature PRs are still in flight. It is intentionally additive and does not redesign the Admin shell, Overview, settings, Careers, Spotlight, CI, package scripts, or shared feature tests.

## Success criteria

- Trusted Admin identity remains rooted in `app_metadata.role === 'admin'`.
- Existing trusted Admins retain access until an explicit capability array is configured.
- Once `app_metadata.admin_capabilities` exists, capability checks fail closed.
- Browser clients cannot directly read or mutate the Admin audit table.
- Authorized server APIs use the server-only service client after independently checking capability.
- Audit history is append-only at the application privilege boundary.
- Audit snapshots redact sensitive key names before persistence.
- No secrets, tokens, cookies, credentials, service-role keys, private keys, or authorization headers belong in audit records.

## Capability model

`lib/admin-capabilities.ts` defines the initial capability registry and resolver.

Current migration behavior is deliberately backwards compatible:

1. A user must first be a trusted Admin through `app_metadata.role === 'admin'`.
2. If `admin_capabilities` is absent, that trusted Admin keeps the existing broad access behavior.
3. If `admin_capabilities` is present, it becomes authoritative.
4. Invalid capability metadata fails closed.
5. `*` is supported only for a trusted Admin and represents all registered capabilities.

This prevents the first foundation PR from accidentally locking out existing operators while making later least-privilege rollout possible.

## Audit model

`public.admin_audit_log` stores operational history with:

- actor user ID and optional email snapshot;
- evaluated capability;
- action;
- resource type and optional resource ID;
- success/failure/denied result;
- optional reason;
- sanitized before/after state;
- sanitized operational metadata;
- timestamp.

The table has RLS enabled. `anon` and `authenticated` receive no direct privileges. The server service role receives only `select` and `insert`; update/delete/truncate privileges are revoked for the application service role.

## Audit API

`GET /api/admin/audit`

Requires:

- authenticated user;
- trusted Admin identity;
- `system.audit.read` capability.

Supports bounded filtering by:

- `actor`;
- `action`;
- `resource_type`;
- `result`;
- `limit` (1–100, default 50).

There is intentionally no public POST/PATCH/DELETE audit endpoint. Domain-specific privileged mutations should call `recordAdminAudit()` after their own authorization and business-rule validation.

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
2. rerun exact-head checks;
3. integrate audit recording into selected high-risk Admin mutations incrementally;
4. add the Audit Log UI under the final Admin IA without weakening the server boundary;
5. migrate Admin accounts to explicit capability arrays only with a controlled access plan.
