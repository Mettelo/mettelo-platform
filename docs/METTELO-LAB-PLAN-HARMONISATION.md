# Mettelo Lab Phase 9 — Plan harmonisation

## User outcome
Plan should feel like a native Mettelo Lab destination while preserving the existing problem brief and project logic.

## Design hierarchy
1. Lab/Plan eyebrow and project archetype context.
2. Decision-first Plan heading.
3. Structured problem brief with priority fields allowed to span the full content width.
4. Secondary brief fields in a balanced two-column desktop grid.
5. Intentional empty/preparing state when a structured brief is not yet available.

## Responsive contract
- Desktop: two-column brief grid with Context, Primary question and Expected outcome spanning full width.
- Tablet/mobile: one-column brief flow with no horizontal scrolling.
- Mobile heading uses a controlled `clamp()` scale.
- Long brief content uses natural `overflow-wrap: break-word` rather than arbitrary word fragmentation.
- Existing Lab shell, safe-area and bottom navigation behaviour remains authoritative.

## Design-system contract
Phase 9 consumes the established Phase 3 shell tokens for ink, surfaces, borders, bronze and muted surfaces. It does not introduce a parallel colour system.

## Preservation boundary
No changes to `DataNativeWorkspace` actions, API payloads, project/run resolution, brief data, auth, RLS, permissions, database schema or Production data.

## Verification
The existing authenticated Mettelo Lab Chromium suite covers the Plan destination across desktop, tablet and 320–430px mobile widths, including no-horizontal-overflow and 200% zoom checks.

## Rollback
Remove the Phase 9 composition from `phase4-mobile-fixes.module.css` and delete `phase9-plan-harmonisation.module.css`. No data or API rollback is required.
