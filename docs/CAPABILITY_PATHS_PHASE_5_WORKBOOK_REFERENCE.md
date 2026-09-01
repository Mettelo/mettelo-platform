# Verified Phase 5 workbook reference

This implementation was validated against `Mettelo_Project_Library_AI_Ready_Domain_Sheets_v15.xlsx` from the Mettelo working library.

Observed source SHA-256: `61eda9609895c517b1fb54df2c9fb1b079dcd9c76bccaf7293ca82df0dd4006c`.

Observed structure:

- 15 rows in Domain Paths Index
- 15 numeric project placements per Path
- 225 numeric placements total
- 117 unique project codes across those placements
- 117 source rows governing the used project candidates
- independent `Review` and `Sources` sheets

This document is evidence of the workbook used during Phase 5 implementation only. The production importer must compute the fingerprint again from the exact file selected by Admin. A different fingerprint requires a new dry run and approval.
