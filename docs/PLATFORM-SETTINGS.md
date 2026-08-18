# Platform settings

Last updated: 18 August 2026

## Decision

Small public configuration values that operations needs to change without a frontend deployment are stored in a governed `platform_settings` table and managed through Admin. Computed product metrics, member data and Proof counts are not settings and remain derived from authoritative records.

Initial settings cover the general contact email and public social/community URLs used by the footer. The public renderer retains known-safe fallbacks so a missing database row does not remove established channels.

## Data and authorization

Each setting has a stable key, value, public-read flag, description and update metadata. Public pages may read only settings marked for public use. Admin writes remain server-authorized and record the updating user/time.

The Settings workspace also provides an operational entry point to the governed project contribution-role catalogue; that catalogue remains its own schema and authorization boundary.

## Admin experience

`/admin/settings` groups editable contact/social configuration separately from role-catalogue management. Controls are labelled, keyboard accessible, have visible focus states, and collapse to a single-column form on narrow screens. The Admin Overview exposes a Platform settings shortcut so the workspace does not depend on a hidden URL.

## Public behavior

Footer/social rendering loads configured values server-side. If the settings service is unavailable or a key has not been configured, the existing public URL is used as a fallback. Empty optional channels such as Instagram/YouTube are omitted rather than rendered as broken links.

## Verification contract

This runtime/database change requires lint/TypeScript, Admin and responsive interaction audits, isolated Supabase migration/RLS verification, public rendering regression, and both `Release gate` and `Deployment gate` before merge.

## Rollback

The public renderer can revert to static fallbacks without deleting settings. Keep the table and update history if values have been changed in production so configuration history is not lost.
