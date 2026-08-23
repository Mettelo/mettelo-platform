# Admin mobile navigation contract

Last audited: 23 August 2026

This document records the responsive Admin shell contract implemented by `app/admin-mobile-shell.css`. It is a presentation and interaction layer only; it must not change Admin authorization, Supabase access, project/application lifecycle, API routes, audit logging, profile/account queries, or desktop route semantics.

## Scope

The Admin mobile shell is an AMBER shared-navigation change. The authoritative Admin destinations remain the existing Website, Recruiting, Projects, Community & Proof, Content & Comms, Platform, and System groups. The mobile layer may change layout, ordering emphasis, and interaction behavior, but it must not invent or remove operational destinations.

## Mobile contract

At phone widths, including 320, 360, 375, 390, 412, and 430 CSS pixels:

- the Admin drawer is fixed, right-anchored, full-height, and independently scrollable;
- its width is bounded to approximately 92–94vw with a 360px maximum;
- the underlying Admin page is covered by a strong backdrop and cannot scroll while the drawer is open;
- there is no unintended horizontal page overflow;
- one explicit in-drawer close control is at least 44×44px;
- Escape closes the drawer and focus returns to the Menu trigger;
- navigation rows use a consistent 48px interaction rhythm;
- Overview remains a normal navigation row;
- the active Admin group is promoted near the top and is visibly identified without changing route semantics;
- the Member workspace action and existing Admin homepage action remain available in the compact phone header;
- safe-area insets, visible focus, reduced-motion preferences, and long/scrolling navigation content remain usable.

## Tablet and desktop preservation

At widths above the Admin mobile breakpoint (`>760px`), the established Admin shell remains intact, including the sticky sidebar and existing destination hierarchy. The 768px and 1024px layouts must remain bounded and usable rather than inheriting phone drawer geometry.

## Accessibility

The shell must meet the repository WCAG 2.2 AA baseline:

- keyboard-operable open/close behavior;
- visible focus and logical focus restoration;
- accessible labels for icon-only controls;
- touch targets at least 44×44px where practical;
- navigation row targets at the intended 48px rhythm;
- no color-only active-state communication;
- no content loss or horizontal overflow at supported phone widths;
- reduced-motion preferences respected.

## Verification

The blocking authenticated Admin browser coverage must verify settled drawer geometry after its opening transition, active-group state, 48px rows, touch targets, body scroll lock, Escape/focus restoration, no horizontal overflow, and tablet/desktop preservation. Geometry assertions must measure the settled open state rather than an intermediate animation frame.

The normal repository release sequence still applies: static/type/audit checks, blocking public browser regression, isolated Supabase authenticated checks, representative persistence, Release gate, and Deployment gate. A skipped or failing required check is not green.

## Preservation boundary and rollback

This contract must not alter schema, migrations, RLS, Admin authorization, service-role boundaries, API behavior, project CRUD, application lifecycle, audit logging, or profile/account data behavior. If the mobile shell regresses, revert the focused `admin-mobile-shell.css`/Admin-shell change and its corresponding test contract through the normal pull-request release process rather than weakening the regression assertions.
