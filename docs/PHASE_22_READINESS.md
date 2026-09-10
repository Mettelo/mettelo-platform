# Project Experience Phase 22 — Analytics, Security, Accessibility & Release Hardening

**Status: DRAFT / PRE-IMPLEMENTATION READINESS — NOT APPROVED**

Phase 22 is the final Project Experience phase. It is intentionally stacked on Phase 21 and must not merge ahead of unresolved dependency phases.

## Objective

Validate the complete Mettelo Project Experience as one coherent system.

Phase 22 does not introduce another product lifecycle. It hardens and verifies the full programme across analytics, security, RLS, accessibility, migrations, full end-to-end journeys, deployment gates, release gates, documentation and the Rolling Green Baseline.

## Source-defined primary affected functionality

- Product analytics;
- Security;
- Supabase/PostgreSQL RLS;
- Accessibility;
- Full E2E journeys;
- All regressions;
- Migration validation;
- Deployment Gate;
- Release Gate;
- Documentation;
- Rolling Green Baseline.

## Product analytics validation

Phase 22 must verify privacy-safe measurement for the complete journey, including:

- Signup completion;
- Onboarding completion;
- Project view → interest;
- Interest → offer;
- Offer acceptance / expiry;
- Time to team formation / start;
- Projects starting below target;
- Solo start;
- Solo-to-team;
- Withdrawal;
- Replacement;
- Support cases;
- Completion;
- Proof verification.

Analytics must not contain sensitive free text, private support content, private Pulse content, confidential project-resource content, private Proof evidence or other restricted payloads.

## Security validation

At minimum test:

- Authentication;
- Authorization;
- RLS;
- IDOR;
- Service-role isolation;
- Username enumeration;
- Invite abuse;
- Offer manipulation;
- Capacity races;
- Support privacy;
- Private resources;
- Removed-member access;
- Open redirects;
- XSS;
- Upload validation;
- Rate limits.

Security failures are release blockers. Service-role success must never be accepted as proof that normal RLS is correct.

## Accessibility validation

Target WCAG 2.2 AA and validate:

- 320px;
- mobile;
- tablet;
- desktop;
- 200% zoom/reflow;
- keyboard-only operation;
- visible and logical focus;
- screen reader semantics;
- form labels;
- accessible validation/errors;
- success announcements;
- touch targets;
- contrast;
- reduced motion;
- no colour-only status;
- no horizontal overflow.

## Full E2E journey authority

Phase 22 must validate complete journeys across the shipped architecture, not isolated route fragments. At minimum preserve the playbook-defined journeys including:

### Journey A — New team member

Public Project → Submit Interest → Create account → Username → Verify → Onboarding → Return → Submit → Review → Offer → Accept → Team formation → Start → Lab → Collaborate → Complete → Proof.

### Journey B — Existing eligible member

Signin → Discover → Project → Submit Interest → Offer → Accept → Start.

Additional programme journeys must include Solo/Flexible participation, late collaboration, replacement, support/privacy, completion, individual Proof, and the Phase 21 future-project flow.

### Future-project scale journey

Admin create → Publish → Public → Member Discover → Submit Interest → Offer/admission → Team/Solo/Flexible → Start → Lab, with no developer-created project-specific JSX.

## Release gates

Run every applicable release control at the exact final head:

- Lint;
- Typecheck;
- Production build;
- Static audits;
- Migration reconstruction/validation;
- Public regression;
- Auth regression;
- Member regression;
- Application regression;
- Admin regression;
- Lab regression;
- Project collaboration regression;
- RLS tests;
- Security checks;
- Accessibility;
- Mobile/responsive checks;
- Staging E2E;
- Deployment Gate;
- Release Gate.

**Critical skipped tests are NOT green.**

## Cross-phase hardening rule

Phase 22 may repair defects discovered while validating the complete system only when the defect is:

1. required for final release coherence;
2. a direct regression or unsafe gap in the Project Experience programme;
3. repaired at the canonical owner rather than patched around;
4. protected by regression evidence.

Do not introduce duplicate lifecycle systems, disable tests, weaken RLS, bypass canonical state machines or mark inherited failures as Phase 22 success.

## Mandatory audit register

| Area | Initial state | Required evidence |
| --- | --- | --- |
| Analytics | AUDIT REQUIRED | Event inventory, payload privacy, journey coverage, no sensitive data. |
| Auth | AUDIT REQUIRED | Signup/signin/OAuth/verification/reset/session regressions. |
| Authorization | AUDIT REQUIRED | Admin/Project Lead/member/partner scopes. |
| Supabase/Postgres | AUDIT REQUIRED | Clean migration reconstruction and schema compatibility. |
| RLS | AUDIT REQUIRED | Direct positive/negative policies and cross-project/run denial. |
| IDOR | AUDIT REQUIRED | API + DB boundary tests. |
| Service role | AUDIT REQUIRED | Server-only use and no masking of broken user-path RLS. |
| Invitations | AUDIT REQUIRED | Internal/external abuse, expiry, joining-window and freeze behaviour. |
| Offers | AUDIT REQUIRED | Manipulation, expiry, capacity reservation and race tests. |
| Recruitment | AUDIT REQUIRED | Updated Phase 18 + Phase 19 completion freeze. |
| Support privacy | AUDIT REQUIRED | Confidential data stays confined. |
| Resources | AUDIT REQUIRED | Public/member/private and storage/reuse boundaries. |
| Removed members | AUDIT REQUIRED | Historical traceability without active Lab access. |
| XSS/open redirects | AUDIT REQUIRED | All affected user/admin content and redirect surfaces. |
| Upload validation | AUDIT REQUIRED | Size/type/authority/private storage behaviour. |
| Rate limits | AUDIT REQUIRED | Auth/invite/high-risk mutation endpoints. |
| Accessibility | AUDIT REQUIRED | WCAG 2.2 AA across required widths/zoom/AT. |
| Full E2E | AUDIT REQUIRED | Complete cross-phase journeys. |
| Deployment/Release Gate | AUDIT REQUIRED | Exact-head required checks only. |
| Documentation | AUDIT REQUIRED | Final architecture, known limitations, release evidence. |
| Rolling Green Baseline | AUDIT REQUIRED | Establish only after all required exact-head gates are green. |

## Initial success criteria register

The source-defined Phase 22 criteria begin with:

1. Analytics works.
2. Sensitive data excluded.
3. Security tests pass.
4. RLS tests pass.
5. Auth regression passes.

The remaining playbook success criteria and complete journey/release evidence must be transcribed into the Phase 22 acceptance matrix during the audit before approval.

## Approval rule

**PHASE 22: NOT APPROVED**

Do not approve the final phase while any material security, RLS, accessibility, migration, E2E, release-gate or cross-phase regression remains unresolved.
