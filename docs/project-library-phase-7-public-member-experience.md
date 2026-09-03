# Project Library Phase 7 — Public and authenticated member experience

## Status
PASS

## Exact-head evidence

Phase 7 was accepted only after the first UX implementation was reopened for correction. The corrected exact head is:

`1dde8832057c616453a6602cc8f2faa9fb4b9e42`

Exact-head GitHub Actions validation completed green:

- Mettelo CI — run `33777320625` / #2511 — success
- Event Room Phase 1-12 Contract — run `33777320722` / #585 — success
- Release Gate Status Bridge — run `33777320719` / #800 — success

## User-experience correction

The catalogue and member detail were deliberately changed from source-document rendering to decision-first product presentation without changing canonical data.

- Discover summaries are constrained for scanability and project titles are bounded.
- Cards keep the key decision facts visible while reducing repeated metadata and capability noise.
- Member project detail uses progressive disclosure for long challenge, governance and acceptance material.
- Deliverables are presented as compact outcomes; detailed acceptance information remains available on demand.
- Success criteria are rendered as concise checklist items with duplicate presentation text collapsed.
- Contribution areas no longer repeat generic role copy where richer source detail is unavailable.
- Capability signals are framed as opportunities to practise or demonstrate capability, not verified Proof.
- The five-step member journey remains intact.
- The 320px responsive regression was corrected by making the member detail content track deterministically single-column at every supported width.

## Canonical/public safety

- All 300 canonical projects are discoverable through the intended public/member projection.
- Existing operational project UUIDs and historical role/application relationships remain preserved.
- Canonical projects render canonical role rows rather than historical generic contributor rows.
- Public/member projections do not select restricted resource URL or internal governance fields.
- Restricted resource links remain server/database gated and are not protected only by client-side hiding.
- Capability Path relationships remain preserved.

## Completion decision

Phase 7 is complete. Phase 8 may now proceed to Mettelo Lab canonical projection, governance enforcement and security verification.
