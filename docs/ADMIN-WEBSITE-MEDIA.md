# Admin Website Media Library

## Scope

Website → Media provides one governed library for public website images that can be reused by Website content, Branding and SEO. It reuses Supabase Storage rather than introducing a separate asset service.

## Storage boundary

The `website-media` bucket is public because the website must be able to deliver published image URLs directly. The bucket is limited to JPEG, PNG, WebP and AVIF with an 8 MB file-size ceiling. SVG is intentionally excluded from the initial phase because SVG can contain active/executable content.

There are no anon/authenticated upload, update or delete policies for this bucket. Admin uploads pass through the server-side capability-checked API and use the service role. The metadata table is also service-role only behind RLS.

## Metadata and accessibility

Every asset records a title, original filename, storage path, public URL, MIME type, file size, status, uploader and timestamps. A non-decorative image requires meaningful alt text. An image may instead be explicitly marked decorative, in which case its alt text is intentionally empty. The database enforces the same invariant as the API.

## Admin workflow

Admins can upload an approved image, search titles, filter by active/archived state and image type, sort newest/oldest and page through 25/50/100 results. Selecting an asset exposes a stable public URL and editable title/alt/decorative metadata.

The initial phase deliberately has no user-facing delete action. Archiving removes an asset from the normal active view while preserving its public object URL so an already-published page cannot be broken by an accidental library action. Internal upload rollback may remove a just-uploaded object only when metadata persistence fails in the same request.

## Audit events

- `website.media.uploaded`
- `website.media.updated`
- `website.media.archived`
- `website.media.restored`

Audit state contains governed metadata only; binary file contents are never copied into the audit log.

## Release evidence

`npm run audit:admin` includes the deterministic Website Media audit. Authenticated isolated-Supabase coverage rejects an unsafe MIME type, uploads a valid PNG, verifies public object delivery, searches the metadata API, updates accessibility metadata, archives the asset, verifies audit events and confirms the public URL remains available. The Admin workspace is checked at 390, 768 and 1440 pixels.

## Rollback

Revert the application changes to remove the Media workspace/API. Existing public objects and metadata rows should remain in place so published URLs are not broken by application rollback. Destructive storage cleanup is a separate governed operational task, not part of this feature rollback.
