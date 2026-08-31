# Phase 5 import security boundaries

- Import UI is Admin-only.
- Import tables are service-role only; anon/authenticated receive no direct privileges.
- Commit and rollback RPCs are service-role only.
- Human Admin authentication occurs at the Next.js server route before service-role operations.
- Source workbook bytes are parsed client-side and are not uploaded by Phase 5.
- External resource binaries are not downloaded by Phase 5.
- Source URLs and licence/provenance metadata are treated as untrusted data.
- Import commit is feature-switched off outside an approved release window.
- New projects are private Drafts; new Paths are Drafts.
- Existing project identity and member/application/Proof records are not rewritten.
- Unknown taxonomy values are not created automatically.
