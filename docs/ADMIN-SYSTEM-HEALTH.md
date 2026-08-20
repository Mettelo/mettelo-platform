# Admin System Health & Delivery Operations

## Purpose

System Health is a read-only Admin observability surface backed only by existing trustworthy operational sources. It does not invent service uptime, deployment health, queue health or job status that Mettelo cannot actually observe.

The initial sources are the governed Admin audit ledger (`admin_audit_log`) and transactional email outbox (`email_outbox`). The health API selects aggregate counts and timestamps only.

## Access model

System Health requires the canonical `system.audit.read` capability. Detailed transactional delivery operations require `communications.manage`. A Custom Admin with audit-read access can inspect aggregate delivery counts without receiving message-level delivery data. The delivery queue and manual retry action remain unavailable without Communications management capability.

Anonymous requests receive `401`. Authenticated Admins without `system.audit.read` receive `403` from the API and are redirected away from the page.

## Evidence states

Each source resolves independently to either **Available** or **Unknown**.

Available means the underlying queries completed and the displayed counts/timestamps are evidence from the current database. Unknown means Mettelo could not obtain trustworthy evidence from that source. Unknown is never converted to zero and must not be interpreted as healthy.

An audit-source failure does not suppress a valid delivery summary. A delivery-source failure does not suppress a valid audit summary.

## Aggregate-only boundary

The health response may include audit event counts for the previous 24 hours, denied/failure counts, latest audit timestamp, queued/retrying/failed/dead-letter delivery counts, sent count for the previous 24 hours, latest delivery-record timestamp, generation timestamp and whether the current Admin can open delivery operations.

It does not select or expose recipient email addresses, message subjects, bodies, provider payloads, template content, intake submissions, member records, passwords, sessions, tokens, OAuth credentials, Supabase keys or service-role values.

Detailed records remain in their existing governed workspaces rather than being duplicated into a broad System dashboard.

## Manual delivery recovery

The existing delivery queue is now gated with `communications.manage`, matching the canonical capability model. Manual retry uses the same capability and records `communications.delivery.retry_requested` in the Admin audit ledger. The retry audit records bounded operational state such as delivery status and attempt counts; it does not copy recipient, subject, message content or provider payload into the Admin audit state.

A failed/dead-letter count on System Health is a signal for an authorized Communications Admin to inspect the real attempt history. It is not an instruction to retry automatically.

## Responsive and accessible behavior

The workspace preserves textual state labels so status is not color-only, uses visible focus treatment from the Admin shell, provides an ARIA live region for refresh feedback and reflows from four-column metrics on desktop to two columns on tablet and one column on mobile. Release coverage checks 390, 768 and 1440 pixel widths.

## Future job observability

General background-job telemetry remains deliberately unavailable until Mettelo has a canonical job registry with trustworthy job identity, ownership, state, timestamps, error boundaries and safe retry semantics. A UI must not be introduced ahead of that operational source.

## Rollback

Revert the System Health application PR. No database migration is introduced by this phase. The existing Admin audit ledger and email outbox remain unchanged. Reverting removes the aggregate health view and restores the previous delivery-page/retry authorization behavior, though retaining capability enforcement is recommended because it closes a real least-privilege gap.
