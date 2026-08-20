# Admin Website Phase 2 — Public chrome management

## Success criteria

1. Admins can manage public navigation, footer structure, social/contact details and branding without editing application code.
2. Navigation, footer and branding use **Draft → Publish**. Saving a draft never changes the public website.
3. Anonymous/public readers can read only published chrome configuration; Admin drafts are not publicly readable.
4. Current Mettelo header/footer/brand values remain runtime fallbacks if configuration is missing, malformed or temporarily unavailable.
5. Internal destinations are root-relative and cannot be protocol-relative or contain backslash/control-character URL tricks. External destinations must use HTTPS.
6. Admin mutations use registered Admin capabilities and create canonical Admin audit events.
7. Existing `platform_settings` remain the single source for public social URLs and contact email.
8. Mobile <=480px, tablet 481–1024px and desktop >=1025px remain responsive and WCAG 2.2 AA compliant.

## Information architecture

```text
Admin
└── Website
    ├── Website overview
    ├── Navigation
    ├── Footer & Social
    └── Branding
```

Later Website phases remain visible only as roadmap items until their real backend and release paths exist:

- Pages CMS
- site-wide SEO
- Media Library

## Persistence architecture

### `website_chrome_drafts`

Service-role-only draft store keyed by:

- `navigation`
- `footer`
- `branding`

It is not granted to `anon` or `authenticated` and has RLS enabled. Admin APIs access it through the server-side service role after authenticated capability checks.

### `website_chrome_public`

Published public store using the same three scopes. `anon` and `authenticated` receive `SELECT` only. Insert/update/delete privileges are not available to browser roles.

This split is intentional. A single table with both draft and published JSON would make it too easy for a public row-level SELECT policy to expose the draft column as well.

## Capability contract

- Navigation read/edit: `website.navigation.manage`
- Footer/branding read/edit: `website.content.edit`
- Publish any public chrome scope: `website.content.publish`
- Existing social/contact direct settings: `platform.settings.manage`

Existing trusted Admins with no explicit capability array remain backward compatible under the #84 capability resolver. Once an explicit capability array exists it is authoritative and malformed/unknown configurations fail closed.

## Audit events

- `website.chrome.draft.updated`
- `website.chrome.published`
- `platform.setting.updated`

Audit data records the governed configuration change but must never include credentials, tokens, cookies, authorization headers or secrets. The shared audit sanitizer remains authoritative.

## Public fallback contract

`lib/website-chrome.ts` contains canonical current Mettelo defaults matching the pre-Admin public header/footer/branding behavior.

Public rendering follows:

```text
valid published configuration
        ↓
render managed header/footer/branding

missing / malformed / unavailable configuration
        ↓
render canonical current Mettelo fallback
```

Public chrome reads opt out of static caching so an explicit Admin publish can become visible without requiring another application deployment.

## Validation

### Navigation

- maximum 30 items;
- unique sanitized IDs;
- non-empty labels;
- placement is `primary`, `secondary` or `explore`;
- at least one enabled desktop-visible item and one enabled mobile-visible item;
- safe root-relative or HTTPS destination only.

### Footer

- maximum 8 columns;
- maximum 20 links per column;
- non-empty description and tagline;
- at least one enabled section;
- safe root-relative or HTTPS links only.

### Branding

- non-empty site name;
- dark/header logo source must be safe root-relative or HTTPS;
- light/footer logo source must be safe root-relative or HTTPS.

Until the Media Library phase lands, Branding accepts governed asset URLs rather than implementing a duplicate upload system.

## Release coverage

The Admin deterministic audit checks the routes, capabilities, migration separation, public consumers and audit events.

Authenticated isolated-Supabase browser coverage verifies:

- unsafe navigation input is rejected;
- draft save succeeds;
- publish succeeds;
- the managed public header reflects the published value without a deploy;
- an audit record exists;
- the original navigation payload is restored before the test exits;
- Navigation, Footer & Social and Branding pages render without page overflow at 390 / 768 / 1440px.

## Preservation boundaries

### RED

Do not change as part of this phase:

- authentication/session contracts;
- project, Careers, Proof, Spotlight or Member lifecycle APIs;
- notification delivery;
- production secrets;
- public page-body CMS content.

### AMBER

- root header/footer rendering;
- Admin Website navigation;
- platform settings authorization.

### GREEN

- additive public-chrome persistence;
- Website chrome Admin routes/editors;
- published-config helper;
- release tests and documentation.

## Rollback

Revert the application PR to restore the existing hard-coded header/footer behavior. The additive chrome tables can remain safely unused; no destructive data rollback is required.
