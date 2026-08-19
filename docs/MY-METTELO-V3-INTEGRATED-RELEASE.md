# My Mettelo v3 integrated release evidence

This runtime-neutral note records that PR #71 is the integrated release candidate for both My Mettelo Home v3 and the follow-on Projects portfolio redesign.

The feature branch contains the Home v3 navigation/shell and command-centre changes plus the Projects lifecycle portfolio changes. It is intentionally validated directly against `main` so the exact-head Release Gate covers the combined member experience in one run: deterministic audits, production build, public Chromium regression, authenticated Home responsive QA, Projects responsive QA, Mettelo Lab visual QA, and persisted submission checks.

PR #70 is superseded only after this integrated exact-head Release Gate succeeds and PR #71 merges. No product assertion or authorization boundary is weakened by this consolidation.
