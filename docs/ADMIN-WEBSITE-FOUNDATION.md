# Admin Website foundation

Date: 20 August 2026

## Purpose

This phase establishes the information architecture and responsive Admin navigation required for the broader Website, Platform and System management programme. It deliberately does not switch public pages, footer, header navigation, branding or SEO to new persistence yet.

The foundation extends the existing Mettelo Admin design instead of introducing a second visual system. It keeps the dark Admin top bar, white operational navigation/panels, Ink and Value tokens, compact mono labels, restrained bronze accents, existing table/form patterns and existing Admin routes.

## Success criteria

- Website, Platform and System are visible, understandable Admin destinations.
- Settings is directly discoverable from persistent Admin navigation.
- Every linked destination is a real protected Admin route; planned controls are never represented as dead links or fake buttons.
- Existing Recruiting, Projects, Community & Proof, Content & Comms, Audit, QA, Intake and Admin Access routes remain available.
- Mobile Admin navigation uses a contained drawer rather than a horizontally scrolling navigation strip.
- Tablet and desktop retain the efficient left navigation rail.
- The Admin shell remains usable with long labels, keyboard-only navigation, reduced motion and 200% zoom.
- No public website behavior, API contract, database table, RLS policy or production content is changed by this phase.

## Admin information architecture introduced in this phase

```text
Admin
  Overview

  Website
    Website overview

  Recruiting
    Careers
    Project applications
    Opportunity review
    Job sources

  Projects
    Project operations
    Project Architect
    Project governance

  Community & Proof
    Proof review
    Spotlight & awards
    Events

  Content & Comms
    Content & Insights
    Communications

  Platform
    Platform overview
    Settings

  System
    System overview
    Audit log
    QA team
    Intake
    Admin access
```

Later phases add Website Pages, Navigation, Footer & Social, Branding, SEO and Media only when their real persistence and public-consumption paths exist. Platform later adds Authentication & SSO and Feature Flags. System later adds Health and Jobs & Errors.

## Overview-route policy

`/admin/website`, `/admin/platform` and `/admin/system` are real protected overview routes. Their cards link only to workflows that already function in the current platform. Future controls are shown as non-interactive roadmap rows with explicit phase labels so an Admin can understand the destination without being sent to unfinished pages.

This follows the product rule: no placeholder actions, `href="#"` controls or navigation entries to missing routes.

## Responsive behavior

### Mobile — `<= 480px`

- The desktop navigation rail becomes a left-anchored drawer below the 60px Admin top bar.
- The menu trigger is at least 44×44 CSS pixels and exposes `aria-expanded` and `aria-controls`.
- The drawer has an explicit 44×44 close control.
- Escape closes the drawer and returns focus to the opener.
- Focus is contained while the drawer is open.
- Tapping the backdrop or choosing a destination closes the drawer.
- Closed drawer links use `visibility:hidden` and cannot remain keyboard-focusable off-screen.
- The top breadcrumb is hidden at the narrowest range because the page heading and active drawer item preserve context without crowding the toolbar.
- No page-level horizontal overflow is permitted.

### Tablet — `481–1024px`

- At 761px and above the persistent left navigation rail remains visible.
- The rail narrows from the full desktop width while the content column keeps `minmax(0,1fr)` behavior.
- Workspace overview cards become two columns, then one column below the drawer breakpoint.

### Desktop — `>= 1025px`

- The established 244px Admin navigation rail remains persistent and independently scrollable.
- New Website, Platform and System groups use the same label, active-state and focus treatment as existing groups.

## Accessibility

The foundation targets WCAG 2.2 AA and follows the repository accessibility contract:

- semantic `aside`, `nav`, headings, links and buttons;
- visible keyboard focus;
- accessible names on the menu and close controls;
- `aria-expanded`/`aria-controls` on the drawer trigger;
- no color-only current-state communication (`aria-current="page"` remains authoritative);
- 44px mobile interaction targets;
- Escape, focus containment and focus return;
- reduced-motion support;
- no hidden focusable navigation when the drawer is closed;
- no content loss or unintended horizontal scrolling at supported breakpoints.

## Security and preservation boundaries

### RED — unchanged

- authentication and middleware;
- Admin identity requirement (`app_metadata.role === 'admin'`);
- Admin capability resolver;
- service-role usage;
- RLS and database schema;
- Careers, Projects, Proof, Spotlight and Communications lifecycle contracts;
- production data and public content;
- release/deployment controls.

### AMBER — extended carefully

- `components/AdminShell.tsx` shared Admin navigation and responsive behavior.

### GREEN — additive

- Website, Platform and System overview routes;
- shared overview presentation component;
- deterministic Admin audit assertions;
- this documentation.

## Verification

`npm run audit:admin` is extended to fail when the new groups, routes, drawer semantics or overview components disappear. Existing authenticated staging smoke still renders protected Admin pages at mobile, tablet and desktop widths and checks the Audit workspace for overflow. The normal Mettelo CI release contract remains required before merge.

A future PR that introduces new persistence or changes public rendering must add its own backend/browser evidence rather than treating this foundation as proof of those later workflows.
