# Mettelo Lab Phase 17 — Accessibility Hardening

## User outcome
Mettelo Lab must remain fully usable by keyboard, assistive technology and users who rely on enlarged text or reduced motion, without changing any business logic or project permissions.

## Success criteria
- visible focus treatment across Lab interactive elements;
- logical keyboard order and no focus traps introduced by Lab presentation layers;
- accessible names for icon-only or ambiguous controls;
- coherent landmark and heading structure;
- status and async feedback continue to use live-region semantics where already present;
- colour is not the only signal for active, status or review state;
- practical interactive targets remain at least 44px where applicable;
- reduced-motion preference remains respected;
- forced-colour/high-contrast mode retains visible current/focus states;
- 200% text zoom remains usable without horizontal overflow;
- no auth, RLS, API, route, permission, persistence or workflow behaviour changes.

## Preservation boundary
### RED — unchanged
Auth, RLS, project/run membership, reviewer/lead permissions, API contracts, database schema, task/data/proof/resource/event behaviour, unread calculation and Production data.

### AMBER — presentation/accessibility only
Focus visibility, semantic labels, active-state affordance, control target sizing, reduced motion, forced colours, keyboard resilience and assistive-technology clarity.

## Existing semantics intentionally preserved
- Lab skip link and labelled workspace/project-context landmarks;
- `aria-current` navigation state;
- Chat labelled composer/send control;
- Chat `role="log"` and polite live feedback;
- native details/summary disclosure behaviour;
- form labels, fieldsets and legends in project flows.

## Verification
- lint
- typecheck
- `npm run audit:mettelo-lab` including the Phase 17 accessibility audit
- build
- authenticated Chromium Lab visual QA
- keyboard traversal spot-check across Home, Tasks, Chat, Data, Proof, Resources, Events, Team and More
- reduced-motion preference
- forced-colour resilience
- 200% text zoom
- no-horizontal-overflow matrix

## Rollback
Remove only the Phase 17 composition, stylesheet, audit-chain entry, audit file and this documentation. No backend rollback is required.
