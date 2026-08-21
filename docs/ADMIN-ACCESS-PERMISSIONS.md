# Admin Access & Permissions

## Purpose

Mettelo Admin authorization uses one canonical capability registry in `lib/admin-capabilities.ts`. The Admin Access workspace operates that existing model; it does not introduce a second roles system or expose raw authentication metadata.

## Access modes

- **Member** — no `app_metadata.role='admin'`; Admin capabilities are unavailable.
- **Legacy full Admin** — trusted Admin with no `admin_capabilities` value. This remains full access for backward compatibility until explicitly normalized.
- **Full Admin** — trusted Admin with `admin_capabilities: ['*']`.
- **Custom Admin** — trusted Admin with an explicit non-empty list of known capabilities.
- **Invalid configuration** — malformed capability metadata or any unknown capability. The capability resolver fails closed rather than silently ignoring an unsafe value.

Only capability keys from the canonical registry may be saved. The UI presents human-readable labels, groups and explanations, but persists canonical keys only.

## Security invariants

The Admin Access page and API require `admin.access.manage`. A manager cannot remove their own Admin role or remove their own `admin.access.manage` capability. The API also prevents changes that would leave Mettelo without at least one Admin who can manage Admin access.

Custom Admin access must contain at least one known capability. `*` is available only through Full Admin mode, not as a custom checkbox value. Unknown or malformed configuration remains fail closed until repaired by an authorized access manager.

The workspace intentionally exposes only the account identifier, email, display name, creation date, Admin state and capability state needed to operate permissions. It does not expose or edit passwords, password hashes, recovery tokens, refresh tokens, sessions, MFA secrets, provider credentials or unrelated user metadata.

## Operator workflow

Use search plus the Member/Admin filter to find an account. Pagination is server-bounded to 25, 50 or 100 rows per page. Grant either Full Admin or Custom Admin access. Custom permissions are selected from grouped canonical capabilities. Existing Legacy full Admin accounts can be normalized to explicit Full or Custom access when reviewed.

Removing Admin access requires explicit confirmation. Invalid configurations are surfaced as an error state so an authorized manager can repair them instead of assuming the account is safe.

## Audit events

Permission mutations record bounded Admin audit events:

- `admin.access.granted`
- `admin.access.revoked`
- `admin.capabilities.updated`

Audit state contains the Admin state, access mode and capability list before/after the change. It does not copy passwords, tokens or session material.

## Testing and release evidence

The deterministic Admin access audit verifies the canonical registry, page/API capability gate, lockout safeguards, UI states, audit event names, responsive contract and this documentation. Authenticated isolated-Supabase browser coverage grants the disposable E2E member a narrow Custom Admin role, proves an allowed Website read and a denied Website publish, expands the permissions, verifies self-lockout protection and revokes the temporary Admin role during cleanup.

Responsive coverage includes 390, 768 and 1440 pixel viewports. Interactive controls retain visible focus treatment, mobile form controls use a 16px minimum text size, status feedback uses an ARIA live region and destructive revocation requires explicit confirmation.

## Rollback

Revert the application changes from the Admin Access & Permissions PR. Existing `app_metadata.role` and `admin_capabilities` values remain authoritative because this phase changes the operator tooling around the existing authorization model rather than migrating identity data to a new store.

Do not bulk-delete `admin_capabilities` during rollback. A missing capability array has legacy full-Admin semantics, so destructive metadata cleanup could unintentionally broaden access. If a specific account must be repaired after rollback, review that account deliberately and preserve at least one trusted Admin with access-management authority.
