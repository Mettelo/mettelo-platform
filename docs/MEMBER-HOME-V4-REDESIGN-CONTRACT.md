# Member Home V4 redesign contract

The Member Home V4 redesign is governed by the approved product criteria and the approved HTML concept.

## Product hierarchy
- One clear Up Next priority; do not repeat the same action in Up Next, profile readiness and updates.
- Order: welcome/status → Up Next → current work → important updates → Proof → Explore & Grow.
- Current project work remains central; Open Mettelo Lab is the primary project CTA and Project details is secondary.
- Overview is limited to Active projects, Applications, Verified Proof and Saved. Recommendations live in Explore.
- Personal Queue is replaced by Important Updates containing meaningful changes that are not already the Up Next action.
- Application statuses remain truthful while Home copy guides the member toward an appropriate next step.
- Proof leads with its reusable-evidence value, not a zero count.

## Visual system
- Ink `#10131D`, white primary surfaces, warm neutral page background, restrained bronze and sand/cream support surfaces.
- Page title approximately 22–24px desktop and 20–22px mobile; section headings 18–20px desktop and 17–18px mobile; card/project titles 16–18px; body copy 13–14px; meaningful supporting text 11–12px; bronze uppercase eyebrows 11–12px; buttons around 13px.
- Heading weight 700–800; section headings 650–750; body 400–500; metadata 500–600. Large heading line-height 1.1–1.2; body 1.45–1.6.
- Main cards use roughly 14–18px radius; Up Next roughly 20–22px; button radius roughly 9–11px; minimal shadow; soft borders.
- Spacing follows the 4/8/12/16/20/24/32/40/48 scale. Major section gap 16–24px; card gap 12–18px; heading/body gap 6–10px.
- Buttons have practical minimum height 44px. Ink/white is primary; white/neutral-border is secondary; hero may use the inverse treatment.
- Up Next is the strongest visual object. Profile readiness remains compact and secondary.
- Overview is maximum four equal metrics on desktop, 2 columns on tablet, one column at very narrow mobile widths.
- Desktop content is constrained around 1180–1240px and uses an approximate 65/35 content split. Tablet collapses before content becomes cramped. Mobile is single-column.
- Mobile page/card rhythm must remain readable with no clipped labels, one-character wrapping or tiny meaningful copy.
- Production should materially match the approved HTML concept in typography scale, card proportions, spacing rhythm, CTA priority, colour use, density and overall Mettelo character at 1440px and 390px.

## Responsive and accessibility
- Test 320, 360, 375, 390, 412, 430, 768, 1024 and 1440+.
- No horizontal overflow, clipping, overlapping CTAs or one-character columns.
- WCAG 2.2 AA target, visible focus, logical headings, 200% text zoom and colour-independent status meaning.

## Preservation boundary
RED unchanged: authentication, RLS, database schema, project membership, application workflow/status logic, profile completion calculations, Proof calculations, recommendation logic, Saved data, Admin permissions, project APIs and Mettelo Lab behaviour.

AMBER: Member Home hierarchy, cards, typography, spacing, CTA hierarchy, summaries, copy and responsive presentation.

GREEN: duplicated presentation, decorative spacing, visual grouping, labels, supporting microcopy and empty-state presentation.

No prototype content may be hard-coded into production; live member data and existing permission boundaries remain authoritative.
