# Mobile stability contract

Date: 20 August 2026

## Purpose

Mettelo must remain usable when people use iOS Safari, Android Chrome, browser/text zoom, long real-world content, the on-screen keyboard, and the supported mobile/tablet/desktop widths.

This contract does **not** disable pinch zoom. Accessibility zoom remains available.

## Form focus zoom

Mobile Safari can automatically zoom a page when a focused text-entry control renders below 16 CSS pixels. Mettelo therefore keeps visible text-entry controls at **16px or larger on widths up to 760px**.

The rule applies to normal text/search/email/url/number/date-style inputs, selects, and textareas. It intentionally excludes hidden inputs, checkboxes, radios, ranges, and colour controls.

Do not use viewport restrictions such as `user-scalable=no` or `maximum-scale=1` to hide layout defects.

## Content reflow

Admin-entered and user-entered content must be treated as untrusted layout input. Long titles, URLs, identifiers, status text, locations, role names, skills, and summaries must not widen the page.

Project catalogue/detail and Member Discover surfaces therefore use:

- `min-width: 0` on grid/flex children that contain dynamic project content;
- `minmax(0, 1fr)` for shrinkable mobile grid tracks;
- `max-width: 100%` on dynamic-content containers;
- `overflow-wrap: anywhere` for long real-world text;
- wrapping action/tag groups rather than page-level horizontal scrolling.

The GA4 project created through Admin exposed this class of issue because its summary/problem content contained long mostly unbroken strings. The fix is shared defensive layout; the project is not special-cased and its production data is not mutated by this change.

## Responsive verification

For relevant public/project UI, verify at minimum:

- 375px
- 390px
- 414px
- 480px
- 768px
- 1024px
- desktop

Also verify 200% browser/text zoom where applicable. Page-level horizontal overflow is a release failure. Intentional component-level scrolling remains acceptable for data tables or other explicitly scrollable regions.

## Regression evidence

`tests/mobile-stability.spec.ts` is part of `npm run test:regression` and checks:

- visible mobile text-entry controls render at 16px or larger;
- Projects has no page-level horizontal overflow at the core phone widths;
- long unbroken project titles/summaries stay contained inside the mobile project card;
- long unbroken project title/summary/problem content stays contained on the mobile project detail page.

This complements, rather than replaces, manual iOS Safari and Android Chrome device verification.
