# Careers four-stage recruitment workflow

**Status:** Approved product workflow, implementation in `feature/careers-four-stage-workflow`  
**Date:** 25 August 2026

## Product decision

Mettelo Careers uses four primary recruitment stages:

1. **Application Received** (`submitted`)
2. **Under Review** (`in_review`)
3. **Shortlisted** (`shortlisted`)
4. **Interview & Final Decision** (`interview`)

The first three stages may use configured automatic candidate updates. Entering the fourth stage does not automatically contact the candidate.

## Final-stage model

The final stage separates facts and actions that were previously overloaded into the application `status`:

- **Final outcome:** `pending`, `hired`, or `rejected`.
- **Interview:** scheduled and communicated explicitly by Admin while the application remains in Stage 4. More than one interview communication may be sent.
- **Hired notification:** a manual, editable candidate message. It confirms success and states that the formal offer/documentation will follow separately.
- **Rejection communication:** a manual, editable message after the final outcome is set to Rejected.
- **Formal offer:** a separate manual communication after Hired, with editable subject/body and private PDF attachments.
- **Offer status:** `not_prepared`, `ready`, `sent`, or `send_failed`.

Changing the final outcome never sends candidate communication. Sending a formal offer never changes the primary recruitment stage.

## Data compatibility

The versioned careers baseline is incomplete in historical migrations, so the workflow migration is additive and guarded. Where an existing hosted `career_applications` table is present, legacy `offer`, `hired`, and `rejected` primary statuses are normalised into Stage 4 while preserving their final-outcome/offer meaning in the new fields.

No CV, application answer, profile, private offer-document, communication-record, onboarding, or audit data is intentionally removed.

## Communication and audit rules

- Under Review and Shortlisted may send one configured automatic candidate update per application/stage.
- Final-stage communications require an explicit Admin send.
- Manual communication sends use a per-send idempotency token to prevent duplicate delivery caused by browser retries while still allowing a legitimate later interview or message.
- Candidate-facing communication is recorded in `communication_records`.
- Stage, outcome, manual communication, failures, and private internal-note changes are recorded through the existing audit/event infrastructure.
- Failed offer delivery must not be represented as a successfully sent offer.

## Security and privacy

- Admin workflow APIs require authenticated Admin role.
- Internal notes remain private and are not inserted into candidate communication.
- Candidate email is sourced from the original application for final-stage composers.
- Existing private offer-document storage, MIME/size validation, attachment-count limits, and signed/private access remain in force.
- A candidate cannot withdraw online after a Hired or Rejected final outcome.

## UI contract

The Admin candidate workspace presents separate sections for:

- Internal note
- Recruitment Stage
- Interview
- Final Outcome
- Candidate Communication
- Formal Offer
- Communication History

The candidate-facing Careers tracker shows four stages and treats final outcome, interview details, formal offer and onboarding as separate information inside/after Stage 4.

## Verification contract

The workflow is not eligible to merge until repository-required lint, typecheck, build, migration/staging checks, authenticated Admin QA, careers regression coverage, release gate and deployment gate are green on the exact PR head. Focused browser regressions cover at minimum:

- entering Stage 4 sends no interview email;
- explicit interview scheduling persists details and sends the candidate communication;
- marking Hired sends no hired/offer email;
- hired notification is a separate explicit send;
- formal offer is a separate explicit send and does not change the primary stage.
