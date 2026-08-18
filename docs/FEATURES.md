# Features

Last audited: 18 August 2026

Mettelo's product loop is **Connect → Build → Contribute → Prove → Get discovered**. Public discovery brings people into authenticated member journeys; structured project work creates evidence; reviewed evidence feeds Proof and recognition; opportunities and organisations connect that capability to next steps.

This document describes the implementation that exists. Product readiness remains governed by [LAUNCH_READINESS.md](../LAUNCH_READINESS.md), and authentication acceptance remains governed by [PHASE_1_SUCCESS_CRITERIA.md](../PHASE_1_SUCCESS_CRITERIA.md).

## Capability map

| Capability | What exists | Why/trade-off | Main dependencies |
| --- | --- | --- | --- |
| Public discovery | Home, About, Community, Projects, Opportunities, Proof/Showcase, Events, People, Insights, Spotlight, Careers, organisations, legal/support, search | Server-rendered routes keep discovery indexable. Breadth creates a content-governance burden and requires metadata/link audits. | App Router, public Supabase reads, design system |
| Identity and onboarding | Email/password, Google/GitHub OAuth, verification, reset/update password, onboarding/resume, profile | One account connects applications, work, and Proof. Hosted Supabase redirect/template configuration is an external dependency. | Supabase Auth, `profiles`, middleware, auth templates |
| Projects and applications | Public briefs/cards, interest registration, role applications, member tracking/withdrawal, Admin review, team formation | A canonical application record avoids disconnected intake. Interest and role applications share storage but have distinct lifecycle rules. | `projects`, `project_roles`, `project_applications`, RLS, notifications |
| Delivery workspace | Member projects, milestones, tasks, discussions, resources, data workspace, evidence, presentations, completion | Structured delivery makes contribution reviewable. The richer model increases RLS and lifecycle complexity. | project workspace tables, LiveKit, service operations |
| Proof and credentials | Contributions, review history, proof visibility, public proof/credential pages, reputation/Spotlight | Proof is derived from reviewed work rather than self-assertion. Publication depends on review and consent. | contribution, review, credential, Spotlight tables |
| Project Architect | Member progression application, evidence, credential, governed projects, Admin review and assignment | Architect is an earned member state, not a separate anonymous identity. It requires strong authorization and audit history. | account identities, architect/governance tables, middleware |
| Careers | Published roles, multi-section application with local draft/review, private CV upload, member tracking, Admin pipeline, interview/offer/onboarding communications | Review-before-submit improves confidence; preserving DOM fields retains selected files. Privileged storage and several schema objects must exist. | service role, careers tables, `career-cvs`, communications |
| Opportunities | Public discovery/detail, saved/recommended items, source registry, ingestion, verification, lifecycle and reminders | Source and verification history reduce stale/fabricated listings. Automated discovery still needs source ownership and monitoring. | opportunities/source tables, cron, notification preferences |
| Events | Public events/calendar links, registrations, member events, governed project meetings, attendance/review, live rooms | Separates public programming from private delivery events. Live video is feature-configured and returns `503` when absent. | event tables, LiveKit, cron |
| Organisations and support | Organisation/partnership pages, contact/partnership/feedback intake, proposal documents, Admin triage/conversion | Server-owned anonymous writes prevent direct client access to sensitive queues. Every submission depends on service configuration. | `/api/forms`, intake tables, private Storage, notifications |
| Communications | Notification catalogue/preferences, in-app notifications, governed templates/versioning, records/audit, email outbox/retry, newsletter preferences | Durable outbox and audit records decouple user actions from delivery. Current baseline migrations are incomplete for some notification tables. | `lib/notifications.ts`, communications tables, cron |
| Admin operations | Access, application/career queues, project operations/governance, content, opportunities, events, Proof/QA, Spotlight, intake, communications | Consolidates operational work behind trusted role checks. Service-role access remains restricted to privileged enrichment/actions. | Admin middleware/route checks, RLS, service role |
| Analytics and SEO | Metadata, sitemap, robots, Open Graph asset, configurable gtag events | Configuration remains optional so local builds can run without analytics. Production taxonomy and final OG export still need verification. | Next metadata routes, GA measurement ID |

## Authentication and first experience

Primary routes:

- `/signin` — sign in; `?mode=signup` selects sign-up; `?mode=reset` selects recovery.
- `/auth/callback` — exchanges Supabase email/OAuth codes and routes by flow.
- `/auth/check-email`, `/auth/verified`, `/auth/reset-sent`, `/auth/update-password`, `/auth/password-changed`, `/auth/social-complete` — explicit transition states.
- `/onboarding` and `/onboarding/complete` — first-time profile setup.
- `/member` and `/admin` — protected workspaces.

The system intentionally avoids a separate `/signup` product route. Redirect origins are controlled by `NEXT_PUBLIC_SITE_URL`, with the intended production fallback set in the sign-in component. Local development must set the local origin to prevent callbacks returning to production.

Do not claim Phase 1 complete until the [125 acceptance criteria](../PHASE_1_SUCCESS_CRITERIA.md) and credentialed browser journey have current evidence.

## Project interest and role applications

`POST /api/project-applications` is the canonical endpoint for both journeys. `components/SubmissionForm.tsx` routes project-interest forms there; `/api/forms` accepts only contact, partnership, and feedback.

### Authoritative lifecycle policy

- **Submit interest**: authenticated member, public project, contribution area supplied, 40+ character statement, before deadline, and project status in `pilot`, `recruiting`, `open`, `forming`, `active`, or `review`.
- **Apply for a role**: authenticated member, valid role belonging to the project, 40+ character statement, before deadline. For `project_type === "open"`, any status except `pilot`, `completed`, `archived`, or `cancelled` is accepted; other project types accept `recruiting`, `open`, or `forming`.
- Duplicate database conflicts are treated idempotently when the existing matching record can be found; otherwise the endpoint returns `409`.
- The member write uses the authenticated Supabase client and RLS. Notifications are attempted only when the server service-role client is configured.
- The Admin application queue reads records through the authenticated Admin client when the service key is absent; privileged auth email lookup and review operations still require the service key.

The route handler is the source of truth. Public cards/detail pages must derive button visibility and wording from the same policy; when the policy changes, update the API, cards, detail page, tests, and this section together.

## Public forms and intake

| Journey | Endpoint | Persistence | Admin destination | Communication |
| --- | --- | --- | --- | --- |
| Contact | `/api/forms` (`contact`) | `form_submissions` | `/admin/intake` | Admin notification |
| Partnership | `/api/forms` (`partnership`) | `form_submissions` | `/admin/intake` | Admin notification plus submitter receipt |
| Feedback | `/api/forms` (`feedback`) | `form_submissions` | `/admin/intake` | Admin notification |
| Newsletter | `/api/newsletter` | Server-only `newsletter_subscribers` upsert with normalized email and explicit service-role grant | No dedicated subscriber queue found | Client validation, inline footer success/error state, secure preferences link, best-effort confirmation/outbox |
| Project interest/application | `/api/project-applications` | `project_applications` | `/admin/project-operations/applications` | Member and Admin notifications when privileged service is available |
| Career application | `/api/careers/apply` | CV in Storage, row/event/communication records | `/admin/careers/applications` and pipeline | Receipt/outbox and Admin notification |
| Project Architect | `/api/project-architect-application` | Architect application/evidence/history | `/admin/project-architect-applications` | Governed status notifications |

All public inputs are revalidated server-side. A visually successful button is not proof of a complete journey; use the browser → API → database → Admin queue → notification checks in [Regression testing](REGRESSION_TESTING.md).

## Careers journey

The career form supports optional authenticated account linking, local-device autosave for text fields, HTML constraint validation, a responsive review step, XHR upload progress, private CV storage, duplicate detection, and a confirmation route. Optional LinkedIn and portfolio fields accept protocol-free public domains and use the same shared normalizer in the client and API to prepend `https://` before review, storage, and submission. The review screen conditionally hides rather than unmounts the original fields so the selected `File` and previously entered values remain present when editing or submitting.

The server validates role state, identity/email consistency, links, question requirements, file MIME type, and 5 MB size. It removes the uploaded CV if database insertion fails. Admins can manage stages, communications, interview/offer details, offer documents, and onboarding items.

Known dependency: the repository does not currently version the base careers tables or `career-cvs` bucket. See [Open issues](OPEN-ISSUES.md).

## Project work, governance, and Proof

Authenticated members work within project runs and membership boundaries. APIs cover collaboration, messages/read state, tasks/history, milestones/delivery, data governance/workspace, evidence/contributions, presentations, events, and completion. Project Lead, reviewer, Architect, member, and Admin actions are enforced in route logic and RLS rather than navigation alone.

Contribution review events preserve how evidence moved through review. Public Proof and credentials expose only records permitted for visibility. Project Architect credentials and assignments add an additional governed identity layer.

## Content, opportunity, event, and recognition operations

- Insights are read from `content_posts` and managed through Admin content APIs.
- Opportunities have a source registry, discovery/ingestion, verification, lifecycle, saving, recommendation, and reminder paths.
- Public events and governed project events are separate models; project rooms can use LiveKit.
- Spotlight selection, consent, and Admin operations support member recognition.

These features should never publish fabricated proof, events, opportunity claims, or member stories. The evidence/content constraints in [LAUNCH_READINESS.md](../LAUNCH_READINESS.md) remain applicable even where the implementation has advanced.

## Deliberate limitations

- No payment/billing system is present.
- Optional Luma, YouTube, Make, LiveKit, and Analytics integrations are not required for the core build, but their affected routes must fail clearly when unconfigured.
- A Vercel deployment succeeding does not prove Supabase migrations, Auth redirects, cron secrets, Admin queues, or email delivery are correct; those require staging/production journey verification.
