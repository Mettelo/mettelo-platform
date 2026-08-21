# Mettelo Lab Chat message experience

Status: Phase 5 contract.

## User outcome

Messages should be easy to scan, read and act on across desktop and mobile without visual noise. The message body is primary; author, timestamp, message state and linked-work metadata are supporting information.

## Ownership

Phase 4 continues to own Chat geometry, scrolling and composer placement.

Phase 5 owns presentation inside each message:

- author and timestamp hierarchy;
- message body typography and wrapping;
- own-message differentiation;
- pinned, decision and blocker presentation;
- linked project work presentation;
- failed, edited and deleted states;
- message-action discoverability;
- desktop/mobile density.

## Desktop contract

- Message bubbles remain content-sized and compact.
- Author and timestamp sit on a clear metadata line.
- Timestamps use tabular numerals and remain visually secondary.
- Message actions stay hidden in the compact action control until requested.
- Linked project work is shown as a bounded supporting card, not as loose metadata.
- Decision and blocker states use restrained semantic accents rather than large banners.

## Mobile contract

- Author names remain horizontal and readable.
- Timestamp remains visible without forcing author text into a narrow column.
- Message body uses the available bubble width and wraps by words.
- Long links may break safely without causing horizontal overflow.
- Supporting state chips do not compete with the message body.
- The action control remains reachable and preserves Phase 4's 44px interaction target.

## Long-content contract

- Normal text uses natural word wrapping.
- Long URLs and linked-work labels may break safely.
- Message bubbles and linked-work surfaces remain width-contained.
- Deleted and failed states remain legible and do not collapse the message row.

## Preservation boundary

Phase 5 does not change:

- collaboration API payloads;
- polling cadence;
- unread/read behaviour;
- send/retry/edit/delete behaviour;
- pin/unpin behaviour;
- decision/blocker classification logic;
- project-item linking behaviour;
- mentions;
- auth, project membership/run authorisation or RLS.

These remain RED boundaries.

## Verification

Phase 5 requires:

- deterministic Lab audit proving the message-experience layer is attached and consumed;
- existing mobile author-width regression coverage;
- no horizontal overflow across the Lab viewport matrix;
- authenticated Chat visual QA on desktop and mobile;
- lint, typecheck, build and scope-required release gates.

## Rollback

Revert the Phase 5 PR. No database, API, permission or data rollback is required.
