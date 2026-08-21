# Mettelo Lab Chat composer

Status: Phase 6 contract.

## Purpose

The Chat composer should be visually calm, immediately understandable and resilient across desktop, mobile, short landscape and software-keyboard conditions. It remains part of the Chat panel established in Phase 4 and does not own viewport positioning.

## User outcome

Members can write, mention and send messages without the composer overwhelming the conversation or colliding with Lab navigation. The primary action is clear, the text field remains readable, and mobile typing does not trigger browser zoom.

## Visual hierarchy

The composer has three levels:

1. message text field — primary input surface;
2. Send action — clear primary action, visually compact;
3. helper/mention guidance — tertiary information.

The composer must remain visually lighter than the message feed and should not look like a separate page section.

## Desktop contract

- flexible textarea plus compact Send action;
- textarea minimum height 48px and bounded growth;
- visible hover and focus states;
- disabled Send state remains legible without appearing actionable;
- helper text remains secondary;
- mention suggestions remain bounded and scrollable.

## Mobile contract

- textarea font size is at least 16px;
- textarea and Send control remain inside the Chat panel flow;
- Send keeps a compact square footprint;
- safe-area inset is respected;
- mention suggestions remain reachable above persistent navigation;
- short landscape states may reduce composer height but keep at least 44px controls;
- no fixed viewport anchoring is introduced.

## Interaction preservation

Phase 6 does not change:

- Enter to send;
- Shift+Enter for a new line;
- IME/composition protection;
- @ mention matching or insertion;
- send API payload;
- optimistic pending message behaviour;
- retry behaviour;
- read-only permissions;
- polling, unread/read state or message actions.

These are RED preservation boundaries.

## Accessibility

- Send has a visible focus indicator;
- mention options retain keyboard focus styling;
- mobile action targets remain at least 44px in constrained landscape and larger in normal portrait use;
- disabled state is communicated visually in addition to the native disabled attribute;
- reduced-motion users do not receive unnecessary composer transitions.

## Verification

Phase 6 requires:

- deterministic Lab audit protection for the composer layer;
- lint and typecheck;
- production build;
- authenticated Lab Chromium visual QA;
- existing 320–430px phone matrix;
- tablet and desktop screenshots;
- 200% zoom and no-horizontal-overflow coverage;
- existing mobile composer-above-navigation and >=16px textarea assertions;
- scope-required Release and Deployment gates.

## Rollback

Revert the Phase 6 PR. No database, API, permission or data rollback is required.
