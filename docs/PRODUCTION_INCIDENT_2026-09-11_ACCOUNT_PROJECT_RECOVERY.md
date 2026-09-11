# Production incident — account, profile and project recovery

Date: 2026-09-11

## Symptoms

- unclaimed members could not claim a username and received `Invalid member identity change request`;
- profile saving reported that the profile schema was unavailable;
- account privacy and preference actions failed;
- public project detail pages could fail after application code began selecting canonical participation fields that were absent from hosted production.

## Root cause

The deployed application had advanced beyond the hosted Supabase migration state. Production had migrations through `project_application_submission_contract`, while later repository contracts for member identity, atomic profile saves, privacy preferences and canonical project participation were not present.

A separate UI bug compounded the identity failure: `MemberAccountSettings` always sent `PATCH /api/member-identity`. `PATCH` is the username-change operation and requires an existing username; first claim must use `POST`.

## Recovery

1. Add and apply the idempotent `production_schema_account_project_recovery` migration to restore the minimum deployed contracts without deleting data or weakening RLS.
2. Backfill stable `MTL-` Member IDs for existing profiles.
3. Restore canonical username claim/change RPCs and atomic profile saving.
4. Restore member privacy preferences and the Phase 18 privacy transaction.
5. Restore canonical project participation fields and compatibility trigger for all existing projects.
6. Route unclaimed username submissions to `POST` and claimed username changes to `PATCH`.
7. Replace the oversized account settings wall with a responsive account control centre, section navigation, identity summary and section-scoped save/error states.

## Safety

- no Auth UUID is exposed;
- Member ID remains immutable after assignment;
- username changes remain canonical and rate-limited;
- profile/domain/tool saves remain owner-scoped through existing RLS;
- member privacy preferences remain owner-scoped;
- no project records are deleted and legacy `team_size_threshold` remains synchronized with canonical participation capacity.

## Verification

The hosted recovery migration was applied successfully. All existing projects were backfilled with non-null canonical participation fields. CI must still validate the repository change before merge to `main`.
