# Design system: Ink and Value

Last audited: 18 August 2026

Mettelo's visual system pairs dark “ink” surfaces with warm bronze/value signals and quiet paper/sand backgrounds. The design should feel credible, practical, and evidence-led: hierarchy comes from contrast, spacing, typography, and state—not decorative noise.

The implemented tokens live primarily in `app/globals.css` and `app/page-system.css`. Responsive public-shell/mobile-navigation overrides live in `app/public-chrome.css`.

## Colour

| Token | Value | Intended use |
| --- | --- | --- |
| `--ink` | `#10131D` | Primary text, dark buttons, dark surfaces |
| `--ink-2` | `#171B28` | Secondary dark surface |
| `--indigo` | `#2A2F52` | Brand/nav/icon accent |
| `--indigo-2` | `#373E70` | Interactive/secondary indigo |
| `--bronze` | `#C6892A` | Primary value/accent signal |
| `--bronze-2` | `#E0AD59` | Lighter bronze highlight |
| `--bronze-deep` | `#8B5A17` | Bronze text on light surfaces |
| `--sand` | `#F7EFDD` | Warm feature/active surface |
| `--sand-2` | `#FBF7EE` | Subtle warm section surface |
| `--slate` | `#5B6472` | Secondary text |
| `--muted` | `#8B93A1` | Tertiary text; verify contrast before use |
| `--paper` | `#FCFBF7` | Main page background |
| `--white` | `#FFFFFF` | Cards, forms, menu panel |
| `--line` | `#E7E1D6` | Borders and separators |
| Status green | `#157347` | Success/approved state |
| Status blue | `#2356A8` | Informational/in-progress state |
| Status red | `#A53A3A` | Error/destructive state |

Use status colour with an icon, label, or text. Never make colour the only way to understand a state. Confirm WCAG 2.2 AA contrast in the final rendered combination; a token's existence is not proof that every pairing passes.

## Typography

Fonts load through `next/font/google` in `app/layout.tsx`, expose CSS variables, and use `display: swap`.

| Role | Typeface | Use |
| --- | --- | --- |
| Headings/display | Space Grotesk | Page and section headings, high-level statements |
| Body/UI | Inter | Paragraphs, controls, navigation, forms |
| Data/labels | IBM Plex Mono | Eyebrows, step numbers, metrics, metadata, operational labels |

### Responsive type tokens

| Token | Desktop | Tablet | Mobile | Use |
| --- | --- | --- | --- | --- |
| `--type-page-title` | `clamp(2.5rem, 4vw, 4rem)` | `clamp(2.3rem, 5.2vw, 3.35rem)` | `clamp(2rem, 9vw, 2.45rem)` | Standard primary-page titles that should remain a balanced 1–2 line block |
| `--type-accordion-question` | `clamp(1.02rem, 1.3vw, 1.22rem)` | `clamp(1rem, 2vw, 1.16rem)` | `1rem` | Scan-friendly disclosure/FAQ question headings |

Guidelines:

- Keep display copy short enough to scan; use fluid `clamp()` sizes where already established.
- Use sentence case for UI actions. Uppercase/letter spacing is reserved for short data labels and eyebrows.
- Keep body line length readable and let long names, URLs, errors, and translated-length text wrap.
- Do not substitute the mono face for paragraph copy.

## Spacing, shape, and layout

The page-system spacing scale is:

| Token | Value |
| --- | ---: |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-7` | 32px |
| `--space-8` | 40px |
| `--space-9` | 48px |
| `--space-10` | 64px |
| `--space-11` | 80px |

Use the scale instead of one-off gaps. A component should have one internal rhythm; repeated rows should not receive item-specific margins.

Shape tokens include 10, 14, 20, and 26px radii. Smaller controls/fields use smaller radii; cards/panels use the larger values. Shadows are restrained and describe elevation or drawer separation rather than decoration.

The shared `.shell` constrains content to a maximum width of 1240px with responsive inline padding. Grids must use `minmax(0, 1fr)` where content might overflow.

## Responsive contract

Every user-facing change must be deliberately checked at:

| Range | Width | Expected behavior |
| --- | ---: | --- |
| Mobile | `<= 480px` | Single-column where appropriate; no horizontal overflow; reachable 44px+ touch controls |
| Tablet | `481–1024px` | Purposeful intermediate composition, not a compressed desktop layout |
| Desktop | `>= 1025px` | Complete hierarchy with efficient line lengths and card widths |

Some components additionally transition at 1080, 767/720, 430, 375, and 320px. Those local breakpoints refine the three product ranges; they do not replace the required range checks. Test at 200% zoom, phone landscape, long content, visible validation, and open software keyboard.

## Component patterns

### Buttons and actions

- `.button.primary` — bronze high-priority product action.
- `.button.dark` — ink high-priority operational/submission action.
- `.button.ghost` — secondary outline action.
- `.button.soft` — low-emphasis action on quiet surfaces.

Primary and secondary actions must be visually distinct. Buttons perform actions; links navigate. Async actions expose working, error, and success states and prevent accidental double submission.

### Cards and panels

Use shared card/panel surfaces and borders before inventing a new container. Cards in a repeated grid should stretch to a consistent row height; action regions should align to the bottom without hard-coding a fixed content height. Avoid oversized cards caused by large minimum heights or ad hoc padding.

### Labels, chips, and metrics

Eyebrows and data labels use the mono face, compact sizing, and limited letter spacing. Chips identify category/status; they are not buttons unless they have explicit interaction semantics.

### Forms

- Every control has a visible associated label.
- Required/optional guidance and constraints appear before submission.
- Validation remains close to the field or journey and is announced via an appropriate live region.
- Multi-step/review flows preserve values and files across back/edit actions.
- Inputs use visible focus and a minimum comfortable touch height.
- Errors explain the recovery action; they do not erase valid user input.

### Navigation drawers and disclosures

The public mobile menu is a right-anchored, viewport-height, opaque panel because its trigger is at the top-right. It renders inside the menu panel on first open, slides with `translateX`, contains a solid white surface, and places a dim backdrop behind—not over—the controls.

Required behavior:

- the three-bar trigger morphs to an X while open;
- `aria-label` changes between “Open menu” and “Close menu”;
- `aria-expanded` mirrors the native `<details>` state;
- Escape, outside tap/backdrop, link selection, and the X all close it;
- focus remains within the open drawer and returns to the opener;
- Explore rotates its chevron and animates a distinguished sub-item group;
- content scrolls independently while account/guest actions remain reachable;
- reduced-motion removes non-essential transitions.

Do not reintroduce a second close button inside the panel unless a tested design decision replaces the stateful trigger. Do not portal the menu in a way that leaves its first render empty or moves the backdrop above the controls.

## Node-and-connection language

Mettelo's visual metaphor is capability connected through contribution: people, projects, evidence, and opportunity are nodes joined by progression. Use this language in diagrams, timelines, proof/activity trails, and relationship summaries. Keep connectors structural and subtle; they must not compete with content or imply a relationship the data does not support.

## Accessibility baseline

All work targets WCAG 2.2 AA:

- semantic landmarks, headings, links, buttons, lists, and form elements;
- visible keyboard focus and logical order;
- text contrast at least 4.5:1 and non-text component contrast at least 3:1;
- accessible names for icon-only controls;
- no keyboard traps except deliberate focus containment in an open modal/drawer with an exit;
- status/error messages available to assistive technology;
- touch targets at least 44×44 CSS pixels where practical;
- no content loss at 200% zoom;
- `prefers-reduced-motion` respected.

Automated checks are necessary but not sufficient. Manual keyboard, screen-reader, iOS Safari, Android Chrome, tablet, and zoom checks remain release evidence requirements.

## Governance

- Reuse existing tokens/classes before adding a new design value.
- If a new token or reusable pattern is necessary, add it to the source CSS and document it here in the same change.
- Visual refactors must preserve interaction, API payloads, validation, authorization, persistence, and Admin visibility.
- Include mobile/tablet/desktop screenshots and keyboard notes in the pull request.
- Do not ship Next.js dev indicators, debug badges, fixtures, or test overlays as product UI. `next.config.ts` currently sets `devIndicators: false` for local development; production builds do not include that indicator.
