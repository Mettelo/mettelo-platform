# Project application inline terms regression fix

## Decision

Project interest and full project applications use one canonical, versioned, text-based Mettelo Project Participation Terms contract from `lib/project-participation-terms.ts`.

The current version is submitted as `terms_version` and the server records `terms_accepted_at` for both intake kinds.

## User experience

Both Submit interest and Apply for a role:

- show the concise participation summary inline;
- expose **Read full participation terms** in an in-page dialog;
- require an unchecked agreement checkbox;
- keep the final submit action disabled until agreement is explicit;
- do not require a PDF/DOCX or external document to be published.

## Backend authority

`POST /api/project-applications` validates both `terms_accepted === true` and the exact current `PROJECT_PARTICIPATION_TERMS_VERSION` for interest and full applications.

Full applications continue to revalidate project eligibility, prior canonical participation and live role capacity before insertion. Terms consent is additive to those existing controls.

New submissions record:

- `terms_accepted_at`;
- `terms_version`;
- `terms_attachment_id = null` for the text-based contract.

Historical applications that reference a governed attachment remain intact. The generic governed communication attachment infrastructure remains available for communication templates; it is simply no longer the source of truth for Project Participation Terms.

## Regression protection

The blocking project-interest/application audit requires both member intake surfaces to use the shared terms constants and forbids the member application/API from depending on `/api/project-terms`, `communication_template_attachments`, or a `project_application_terms` attachment.

## Rollback

A focused revert can restore the previous UI/API behavior, but doing so would intentionally reintroduce the attachment publication dependency. No schema rollback is required by this change.
