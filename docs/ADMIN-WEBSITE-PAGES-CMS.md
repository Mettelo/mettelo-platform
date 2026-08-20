# Admin Website Phase 3 — Public Pages CMS

Date: 20 August 2026

## Outcome

Phase 3 makes approved public copy on the Homepage, About and Contact pages editable from Admin without turning Mettelo into an unrestricted page builder.

The existing public layouts, components, forms, live metrics and application workflows remain code-owned. Admin controls bounded text and governed CTA destinations only.

## Success criteria

- Website → Pages is a real persistent Admin destination.
- Homepage, About and Contact have typed field definitions with canonical code fallbacks.
- Draft saves never change the public website.
- Publishing requires `website.content.publish` and changes only the selected page.
- Public readers can read published payloads but cannot read drafts or write page content.
- CTA destinations are limited to safe root-relative paths or HTTPS URLs.
- Contact form fields, consent, validation and submission routing remain unchanged.
- Homepage live metrics, project/opportunity/Proof surfaces and responsive composition remain unchanged.
- About ecosystem structure and founder media remain code-owned.
- Admin and public rendering remain responsive at mobile <=480px, tablet 481–1024px and desktop >=1025px.
- Mobile form controls remain at least 16px to avoid iOS focus zoom.
- WCAG 2.2 AA focus, labeling, keyboard and reflow requirements remain in force.

## Information architecture

```text
Admin
└── Website
    ├── Website overview
    ├── Pages
    ├── Navigation
    ├── Footer & Social
    └── Branding
```

The Pages workspace currently manages:

- Homepage `/`
- About `/about`
- Contact `/contact`

Additional public pages should be added only when their editable/content-owned boundaries are explicitly defined.

## Content model

`lib/website-pages.ts` is the canonical contract for:

- page keys;
- field keys;
- field labels and grouping;
- text/textarea/URL field type;
- maximum lengths;
- current code fallbacks;
- payload validation;
- safe public reads.

The model intentionally does not accept HTML, CSS, JavaScript, arbitrary React structures or free-form layout JSON.

### Homepage

Admin-managed slots include selected hero, How Mettelo works, Proof, Organisations, Why Mettelo and final CTA copy/links.

Code-owned boundaries include:

- live community/member count logic;
- project/opportunity/Proof metrics;
- `HomeHeroShowcase`;
- `HomeLiveContent`;
- Data & AI area cards;
- organisation route cards;
- signal path structure;
- page layout and responsive styling.

### About

Admin-managed slots include selected hero, thesis, story/gap headings, ecosystem intro, future positioning, mission/vision, founder heading/quote and final CTA copy/links.

Code-owned boundaries include:

- detailed problem list;
- ecosystem pillar structure;
- capability system steps;
- future-stage cards;
- founder image and biography structure;
- page layout and responsive styling.

### Contact

Admin-managed slots include surrounding hero/panel/form-intro/faster-route copy and CTA destinations.

Code-owned RED boundary:

- `SubmissionForm`;
- name/email/topic/message fields;
- required consent;
- validation;
- `/api/forms` submission behavior;
- operational routing semantics.

## Persistence

### `website_page_drafts`

Service-role-only draft rows keyed by `home`, `about` or `contact`.

Browser roles have no read/write grants.

### `website_page_public`

Published rows keyed by the same page keys.

`anon` and `authenticated` receive `SELECT` only. Browser roles cannot insert/update/delete.

Public page helpers use `noStore()` so a successful publish is visible without an application deployment.

## Authorization

- read/edit Admin page content: `website.content.edit`
- publish: `website.content.publish`

Trusted Admin identity remains required by the shared Admin capability resolver.

## Audit events

- `website.page.draft.updated`
- `website.page.published`

The shared Admin audit sanitizer remains authoritative. Page copy is bounded, but credentials/secrets must never be introduced into these fields or audit metadata.

## Editor behavior

The Admin editor uses the existing Mettelo operational design language:

- page dropdown rather than separate duplicated screens;
- grouped expandable field sections;
- visible character limits;
- explicit Save draft / Publish page controls;
- Reset draft to currently published content;
- content hierarchy summary;
- Open public page link for the real rendered experience;
- inline live status announcements.

The summary is deliberately not a second rendering engine. The public page is the source of truth for visual preview.

## Responsive behavior

### Mobile — <=480px

- one-column page selector/editor/actions;
- preview summary is removed to prioritize editing space;
- form controls use 16px minimum text size;
- buttons reflow to full-width rows;
- no page-level horizontal overflow.

### Tablet — 481–1024px

- one-column editor with content summary below;
- field groups collapse to one input column where needed;
- Admin navigation follows the Phase 1 responsive shell.

### Desktop — >=1025px

- editor and sticky content summary use the available workspace efficiently;
- grouped fields use two columns where safe.

## Release evidence

`npm run audit:admin` includes the Phase 3 deterministic Website Pages audit.

Authenticated isolated-Supabase browser coverage verifies:

- unsafe CTA URLs are rejected;
- a temporary Homepage draft can be saved and published;
- the real public Homepage reflects the published marker without a deploy;
- the publish event appears in the Admin audit log;
- original published content is restored;
- any pre-existing draft is restored after the test;
- the Pages workspace has no page overflow at 390 / 768 / 1440px;
- the Contact form retains its canonical name, email, topic, message and consent controls.

## Preservation boundaries

### RED

- auth/session behavior;
- public form submission API;
- Contact routing semantics;
- Homepage live metrics/data sources;
- project/opportunity/Proof lifecycle;
- founder image/media endpoint;
- public layouts and design-system CSS;
- production secrets.

### AMBER

- public Home/About/Contact copy rendering;
- Admin Website navigation;
- page fallback definitions.

### GREEN

- additive page tables;
- typed page content helper;
- Pages Admin route/editor;
- page API;
- release tests and audits.

## Rollback

Revert the application PR. Public pages fall back to the canonical code content if managed data is unavailable or the Phase 3 consumer is removed. The additive page tables may remain safely unused; no destructive database rollback is required.

## Next phase

Phase 4 adds immutable publication revision history, revision preview and restore-as-new-draft. It must not rewrite or delete historical revisions.
