# Mettelo Lab Chat layout architecture

Status: Phase 4 contract.

## Purpose

Mettelo Lab Chat has one predictable layout owner across desktop and mobile. The Chat panel owns its internal header, pinned region, scrollable feed, message presentation, contextual actions and composer. The outer Lab shell owns global navigation and page framing.

## User outcome

Members can read and write Chat messages without the feed, composer, message cards, mobile header or Lab bottom navigation crossing each other when the viewport changes. Messages remain readable on desktop and mobile, including small phones, landscape orientation, browser chrome changes, safe-area insets, long text, long URLs and software-keyboard viewport reduction.

## Layout ownership

The Chat panel uses four rows:

1. Chat header
2. optional pinned messages
3. `minmax(0,1fr)` message feed
4. composer or read-only state

Only the message feed owns the primary Chat scroll region. Pinned content is independently bounded. The composer remains in normal panel flow.

## Message presentation contract

- desktop messages use compact, content-sized bubbles rather than oversized cards;
- other-member rows use `avatar + message`, while own-message rows use `message + avatar`;
- author names remain horizontal and readable;
- normal prose wraps at word boundaries;
- long URLs may break safely without creating horizontal overflow;
- timestamps are visually secondary and do not create a separate oversized row on desktop;
- the `•••` message action trigger is a compact explicit control, never an unbounded `<summary>` block;
- action choices open in an overlaid menu and do not increase message-card height;
- blocker, decision, edited, failed and linked-item states remain visible without dominating message content.

## Mobile contract

At `<=480px`:

- `#discussion` remains in document flow;
- fixed `top` / `bottom` viewport anchoring is prohibited;
- the panel uses the dynamic viewport (`dvh`) only as a sizing bound;
- the feed has `min-height:0` and `overflow-y:auto`;
- the composer remains a normal grid row;
- own messages use `minmax(0,1fr) 36px`; other messages use `36px minmax(0,1fr)`;
- message bubbles consume the available content column and may not collapse into the avatar column;
- message action targets are at least 44px;
- message actions use a mobile overlay sheet rather than expanding the bubble;
- composer text remains at least 16px to avoid iOS focus zoom;
- safe-area bottom inset is respected;
- short landscape viewports reduce secondary copy rather than overlap the composer.

This removes the former brittle dependency on hard-coded `72px` header and `70px` navigation offsets and the own-message grid collapse visible in the previous mobile implementation.

## Preservation boundary

Phase 4 does not change:

- message API payloads;
- polling cadence;
- unread/read behaviour;
- authorisation or RLS;
- member/project-run boundaries;
- sending, retry, edit or delete behaviour;
- pin/unpin behaviour;
- decision/blocker classification;
- project-item linking;
- mention behaviour;
- read-only permissions.

Those are RED preservation boundaries.

## Verification

Phase 4 requires:

- deterministic Lab audit to require the four-row grid;
- deterministic audit to reject the old fixed viewport offsets;
- deterministic audit to protect compact action-menu geometry, horizontal text and mobile message-column ownership;
- mobile visual QA at existing Lab phone widths;
- desktop Chat visual QA at 1440px;
- no horizontal overflow;
- author text must not collapse into a one-character column;
- landscape and 200% zoom resilience;
- lint, typecheck, build and repository release gates.

## Rollback

Revert the Phase 4 PR. There are no database, API, permission or data migrations.