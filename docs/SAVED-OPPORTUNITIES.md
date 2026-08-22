# Saved Opportunities member workspace

Last audited: 22 August 2026

## Purpose

Saved Opportunities is the authenticated member shortlist for employment and career opportunities. It is intentionally separate from Saved Projects because project participation and employment journeys have different lifecycle and eligibility rules.

## Data-access boundary

The member must authenticate through the normal Supabase session before any saved-opportunity read or mutation occurs.

The Saved Opportunities page and `/api/opportunities/saved` may use the server-only Supabase service credential after authentication because a member is allowed to retain a saved listing after the public opportunity changes state or becomes unavailable through public opportunity RLS. This is required for truthful `Closed / changed` history and for member-controlled reminder preferences.

The privileged reader is never exposed to the browser. Every operation against `saved_opportunities` is constrained to the authenticated `user.id`; callers cannot supply or select another member ID. New saves additionally verify that the target opportunity is currently published, public, Data & AI relevant, and not past its closing date.

## Supported operations

- GET one saved opportunity status for the authenticated member.
- GET the authenticated member's saved opportunity IDs/preferences.
- POST a currently eligible opportunity into that member's shortlist.
- PATCH only that member's `reminders_enabled` value for a saved opportunity.
- DELETE only that member's saved record.

The page may still display a previously saved opportunity after publication/access/relevance/deadline changes, but labels it `Closed / changed` and explains the reason. It does not offer a deadline reminder for closed/changed listings.

## UX contract

Each saved role keeps the existing opportunity truth while presenting it as a scannable member card. The primary action is `View role` for open listings or `Review listing` for changed listings. The Saved control remains available as the secondary action, and the deadline reminder remains independently controllable while the listing is open.

## Security and regression verification

The browser never receives the service-role key. The API authenticates first, scopes all privileged saved-row queries to `user.id`, and does not accept a user ID in request payloads. Regression coverage uses disposable local Supabase data and verifies saved status, reminder off/on persistence, responsive layout and no horizontal overflow. Production member data is not mutated by E2E.