# Phase 5 Director sign-off gate

Director sign-off requires all blocking Phase 5 criteria and all inherited Phase 1–4 criteria to be green on one exact head.

No code review, dry-run report or successful local import may substitute for the protected exact-head Release Gate.

Director decision states:

- `ARCHITECTURE APPROVED` — design is acceptable.
- `IMPLEMENTATION CONDITIONALLY APPROVED` — code exists but exact-head evidence is incomplete.
- `PHASE 5 APPROVED FOR INTEGRATION` — every blocking check is green and no production import has been performed.
- `CAPABILITY PATHS V1 APPROVED FOR PRODUCTION` — reserved for the final consolidated PR/deployment plus controlled production dry-run/import verification.
