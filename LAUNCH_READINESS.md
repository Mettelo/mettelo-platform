# Mettelo Launch Readiness Audit

Updated: 9 August 2026

This audit uses the Mettelo Business Plan and Brand Requirements as the product source of truth: Mettelo is a technology company building professional capability infrastructure for Data & AI, with Community as the front door and contribution connecting real work, proof and opportunity.

## Launch status

**Code foundation: materially improved. Production launch gate: not yet passed.**

The remaining blockers are external configuration and real launch content, not another visual redesign:

1. Apply the Supabase migration in `supabase/migrations/20260809_launch_readiness.sql`.
2. Configure production Supabase URL, anon key and service-role key.
3. Create the first admin identity and set `app_metadata.role=admin`.
4. Run and pass GitHub Actions CI (lint, typecheck, build).
5. Test account creation, email confirmation, sign-in, reset and session persistence in production.
6. Confirm official social URLs, especially Instagram and LinkedIn.
7. Publish only verified live events, opportunities and recruiting Labs briefs.
8. Replace the interim SVG Open Graph card with the final 1200×630 brand export when available.
9. Configure analytics measurement ID and verify conversion events.
10. Complete mobile/tablet/desktop browser QA on the deployed domain.

## 1. Product strategy & positioning

**Exists**
- Homepage and core routes now use the same Connect → Build → Contribute → Prove → Get discovered system.
- Community is positioned as the front door; Talent is positioned as the destination.
- The product explicitly differentiates itself from courses, bootcamps and job boards.
- Primary pages have one dominant CTA with secondary navigation visually subordinate or removed.

**Changed**
- Homepage was rewritten around the capability gap and the contribution loop.
- Membership, Labs, Opportunities, Events, Media and Spotlight were rewritten to avoid category confusion and inflated launch claims.

**Remaining**
- Real member/project proof must replace conceptual explanation as soon as the first reviewed work exists.

## 2. Functional completeness

**Exists now**
- Supabase email/password sign-up, sign-in, reset and password-update code.
- Protected `/member` and role-protected `/admin` middleware.
- Working server endpoints for contact, partnership, contributor, project-interest, feedback and newsletter submissions once Supabase is configured.
- Success/error/loading states on functional submission forms.

**Fixed**
- Removed dead `#` event/video/article/Spotlight actions from launch-facing routes.
- Removed fake submit buttons that previously used `type="button"`.
- Removed copy claiming a future backend while showing a form as though it worked.

**Remaining**
- Supabase must be configured and migrated before forms/auth are production-operational.
- Live project application workflow beyond interest registration still needs project-specific database entities and admin review UI.
- Luma/YouTube/Make integrations remain optional external integrations, not launch-complete features.

## 3. Information architecture & navigation

**Exists now**
- Shared global navigation and footer across App Router pages.
- Working responsive mobile menu with a 44px hamburger control and fixed scrollable drawer.
- Sitemap and robots routes.
- Branded 404 and global error recovery.
- Member, contributor, partner and organisation entry routes are visible through Join/navigation.

**Fixed**
- Mobile menu is forced visible below 1080px while desktop navigation/actions are hidden, preventing the no-menu state seen in the mobile preview.
- Removed duplicate X treatment in the footer.

**Remaining**
- Final deployment QA must confirm sticky-header/drawer behaviour in Safari iOS, Chrome Android and tablet widths.

## 4. Content & copy quality

**Exists now**
- Core language follows the brand voice: sharp, human, ambitious, practical and contribution-led.
- Labs, Community, Proof and Talent are used consistently.
- Draft/future copy was removed from key conversion paths.

**Fixed**
- Removed placeholder published articles, videos, event dates, Spotlight winner and fabricated opportunity listings.
- Removed demo operational statistics from member/admin experiences.

**Remaining**
- Content publishing needs a real CMS/data workflow before recurring editorial content scales.

## 5. Trust, credibility & social proof

**Exists now**
- WhatsApp, Discord, Community Hub, X/X Community, LinkedIn and Facebook links are present.
- Privacy Policy, Terms of Use and Community Guidelines are populated and linked.
- Contact and feedback routes are available.

**Fixed**
- Removed fake/current Spotlight profile and unlabeled fake opportunity/event/media proof.
- Instagram is explicitly withheld rather than linking to a wrong account.

**Remaining**
- Verify every official social URL before launch.
- Add real testimonials, partner logos or case studies only after permission/evidence exists.

## 6. Design & accessibility

**Exists now**
- Shared Ink/Indigo/Bronze/Sand/Slate design tokens and Space Grotesk/Inter/IBM Plex Mono system.
- Responsive grid breakpoints.
- Visible focus states, skip link, labelled forms, accessible status messages and 44px mobile menu target.
- Logo images include alt text; decorative UI is CSS-based.

**Fixed**
- Mobile navigation visibility and drawer behaviour.
- Keyboard focus treatments across links, buttons, inputs, selects, textareas and summaries.

**Remaining**
- Run automated WCAG checks and manual keyboard/screen-reader QA against the deployed site.
- Validate final contrast across all browser-rendered states.

## 7. Performance & technical hygiene

**Exists now**
- `next/font` uses `display: swap`.
- Removed unused `ModuleLanding` scaffold.
- Added lint/typecheck scripts and GitHub Actions quality workflow.
- Supabase service role stays server-side.

**Remaining**
- CI must pass on the actual repository after dependency installation.
- Add a lockfile after the next clean install for deterministic builds.
- Consider splitting large global CSS into component/module layers as the application grows.
- Replace remaining plain `<img>` logo use with `next/image` only if it materially improves loading; current SVG logo is already lightweight.

## 8. SEO & discoverability

**Exists now**
- Root metadata, Open Graph and Twitter metadata.
- Route metadata added to key launch and conversion pages.
- `sitemap.xml` and `robots.txt` generated through Next metadata routes.
- App icon SVG and branded Open Graph SVG exist.

**Remaining**
- Add unique metadata to any secondary route that still inherits root metadata.
- Final OG image should be exported as a 1200×630 PNG/JPG for maximum social-platform compatibility.
- Validate headings with an automated crawl after deployment.

## 9. Analytics & feedback loops

**Exists now**
- Configurable GA/gtag component using `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- Intent tracking for membership, projects, partnerships and events.
- Submission conversion events for functional forms.
- Dedicated feedback form.

**Remaining**
- Configure the production measurement ID.
- Define the reporting taxonomy/dashboard and confirm events in GA DebugView before launch.

## 10. Legal, safety & compliance

**Exists now**
- Privacy Policy covers submitted data, accounts, public proof, international processing, analytics, retention and user choices.
- Terms clarify no guaranteed employment/outcomes, third-party opportunity responsibility, project contribution and IP expectations.
- Community Guidelines cover harassment, privacy, spam, opportunity integrity, project integrity, moderation and reporting.
- Form consent language is explicit and non-coercive.

**Remaining**
- Obtain legal review as the organisation formalises, especially before paid services, employer talent products or high-volume international processing.
- Add controller/company legal identity and registered contact details when formally available.

## 11. Growth & retention mechanics

**Exists now**
- Low-friction newsletter capture for visitors not ready to join.
- Events, Labs, opportunities and editorial content are structured as repeatable content types conceptually.
- Member workspace gives a future home for returning activity.

**Remaining**
- Connect recurring content to real data/CMS instead of static source files.
- Add notification preferences only when there is enough recurring activity to justify them.

## 12. Launch readiness

**Improved**
- A first-time visitor can understand Mettelo without knowing the business plan.
- Join presents clear routes for member, contributor, community, project and partner intentions.
- Fake/demo launch claims have been removed from the highest-risk public routes.
- The site now has legal, navigation, error, feedback, SEO and auth foundations that were previously missing.

**Launch gate**
Do not call the product fully launched until Supabase is configured/migrated, CI passes, auth/forms are tested end-to-end, official social links are verified, and the first public events/opportunities/project openings are backed by real destinations and owners.
