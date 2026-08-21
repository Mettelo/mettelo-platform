# Mettelo Lab Chat layout architecture

Status: Phase 4 contract.

## Purpose

Mettelo Lab Chat must have one predictable layout owner across desktop and mobile. The Chat panel owns its internal header, pinned region, scrollable feed and composer. The outer Lab shell owns global navigation and page framing.

## User outcome

Members can read and write Chat messages without the feed, composer, mobile header or Lab bottom navigation crossing each other when the viewport changes, including small phones, landscape orientation, browser chrome changes, safe-area insets and software-keyboard viewport reduction.

## Layout ownership

The Chat panel uses four rows:

1. Chat header
2. optional pinned messages
3. `minmax(0,1fr)` message feed
4. composer or read-only state

Only the message feed is intended to own the primary Chat scroll region. Pinned content is independently bounded when necessary. The composer remains in normal panel flow.

## Mobile contract

At `<=480px`:

- `#discussion` remains in document flow;
- fixed `top` / `bottom` positioning is prohibited;
- the panel uses the dynamic viewport (`dvh`) only as a sizing bound, not as a fixed viewport anchor;
- the feed must have `min-height:0` and `overflow-y:auto`;
- the composer must remain a normal grid row;
- safe-area bottom inset is respected;
- short landscape viewports may reduce secondary descriptive copy and pinned height rather than overlap the composer.

This removes the former brittle dependency on hard-coded `72px` header and `70px` navigation offsets.

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

## Deferred work

Phase 4 does not redesign message bubbles, action density, timestamps, raw-link presentation or composer visual hierarchy. Those are handled by later Chat-message and Chat-composer phases.

## Verification

Phase 4 requires:

- deterministic Lab audit to require the four-row grid;
- deterministic audit to reject the old fixed viewport offsets;
- mobile visual QA at existing Lab phone widths;
- landscape and 200% zoom resilience;
- lint, typecheck, build and repository release gates.

## Rollback

Revert the Phase 4 PR. There are no database, API, permission or data migrations.
