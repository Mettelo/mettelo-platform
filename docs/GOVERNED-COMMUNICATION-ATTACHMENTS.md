# Governed communication attachments and project terms

Last updated: 18 August 2026

## Decision

Reusable documents belong to communication templates rather than individual UI flows. Template attachments are private governed records that are resolved server-side when an email is delivered. Existing Career offer documents remain per-candidate records and are combined with governed template attachments at send time.

Project participation Terms use the same governed attachment layer. An application records the exact active Terms attachment accepted by the member; replacing the Terms invalidates a stale acceptance rather than silently carrying consent forward.

## Storage and limits

`communication-template-documents` is a private Storage bucket. Supported files are PDF and DOCX, with a 10 MB per-file database/storage limit. Delivery resolves no more than four combined governed/per-send attachments and enforces a combined raw-size ceiling before calling the email provider.

Attachment metadata includes template ownership, file name, storage path, MIME type, size, order, active state, creator and timestamps.

## Authorization and safety

- Attachment management is Admin-only through server routes.
- Storage paths are never made public for email delivery.
- The delivery worker loads documents with server authority immediately before sending.
- Test sends resolve the same governed attachments as real sends.
- Project application Terms acceptance is validated on the server against the current active Terms attachment.
- Historical application consent points to an immutable attachment record; it is not rewritten when Admin publishes a replacement.

## User experience

The Communication Centre exposes attachment upload/remove/order controls only for templates that allow attachments. Project applicants must explicitly confirm the current Terms before submission. The form includes labelled, keyboard-operable controls, visible status messaging and responsive layout consistent with the existing application review flow.

## Verification contract

This storage/database/runtime change requires:

1. lint and TypeScript;
2. communication and project-application deterministic checks;
3. isolated Supabase migration/storage bootstrap;
4. test-send and real-send attachment resolution checks;
5. stale-Terms rejection and persisted acceptance verification;
6. browser regression;
7. `Release gate` and `Deployment gate`.

## Rollback

Email rendering can stop resolving governed attachments without deleting metadata or files. Do not delete Terms attachments referenced by applications. The foreign-key restriction intentionally preserves consent history; replace/deactivate documents instead of mutating historical acceptance.
