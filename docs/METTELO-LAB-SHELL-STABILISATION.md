# Mettelo Lab shell stabilisation

Last updated: 21 August 2026

## Phase 3 purpose

Phase 3 stabilises the outer Mettelo Lab shell without redesigning individual Lab screens. It is stacked on the Phase 2 design-system layer and preserves the existing project/auth/data boundaries.

## Success contract

The shell must:

- retain the existing desktop three-column composition at full desktop width;
- collapse the right context rail at the existing intermediate desktop breakpoint;
- provide a contained tablet navigation surface without page-level horizontal overflow;
- retain the mobile header and five-destination bottom navigation contract;
- keep the main content region `min-width:0` and width-contained so long content cannot force shell overflow;
- respect safe-area insets on mobile;
- remain usable in short landscape viewports and at the existing 200% zoom regression check;
- preserve all current Lab destinations, unread Chat badge behaviour and project context information.

## Implementation ownership

`phase4-workspace.module.css` remains the legacy Lab workspace/view stylesheet during the phased redesign.

`phase3-shell-stabilisation.module.css` is the additive outer-shell containment layer. It is attached through the existing Lab root class in `phase4-mobile-fixes.module.css`, avoiding a broad rewrite of the legacy stylesheet in this phase.

The stabilisation layer scopes itself to semantic Lab landmarks including:

- `aria-label="Mettelo Lab workspace"`;
- `aria-label="Mettelo Lab project context"`;
- `aria-label="Mettelo Lab primary navigation"`;
- `aria-label="Mettelo Lab mobile navigation"`;
- `#mettelo-lab-content`;
- `#lab-more`.

This keeps the change local to the authenticated Lab shell rather than affecting unrelated pages.

## Preservation boundary

### RED — unchanged

Authentication, project membership/run authorisation, RLS, database schema, APIs, Admin access, service-role boundaries, task/proof permissions, project lifecycle, notification contracts and Production data.

### AMBER — controlled

Lab shell composition, responsive navigation, rails, main-content containment and safe-area behaviour.

### Deferred to later phases

Chat feed/composer architecture, message presentation, Home hierarchy, Team redesign and individual Plan/Tasks/Data/Proof/Resources/Events harmonisation.

## Verification

The Lab audit requires the shell stabilisation layer, its semantic landmark contracts, overflow containment, landscape handling and safe-area handling to remain present. CI must still pass the repository-wide lint, typecheck, audits, build and authenticated Lab browser checks before this phase is considered complete.

## Rollback

Revert the Phase 3 pull request. No database, data, auth or permission rollback is required.
