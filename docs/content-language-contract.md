# Mettelo Content Language Contract

This contract governs product and public-facing content across Mettelo. It is intended to keep the product proposition, trust language and lifecycle semantics consistent as the platform evolves.

## Definitive proposition

Mettelo helps Information Technology, Data & AI professionals build industry-ready experience through meaningful projects, make their contributions visible, and turn supporting evidence into credible professional Proof.

Use **Information Technology, Data & AI professionals** on first or strategically important mention. Use **IT, Data & AI professionals** thereafter where the shorter form improves readability.

The homepage hero should lead with the professional value and project mechanism rather than the phrase **real work**. Use **meaningful projects**, **practical technology projects** or precise descriptions of project contribution when that better communicates a technology-product proposition. “Real work” may still be used selectively as explanatory language where it adds clarity rather than acting as the brand promise.

## Core value chain

**MEANINGFUL PROJECT WORK → CONTRIBUTION → EVIDENCE → REVIEW → METTELO PROOF → CAPABILITY → CREDIBILITY → PROGRESSION → OPPORTUNITY**

Do not compress this lifecycle in a way that implies project participation, work or evidence automatically becomes Mettelo Proof.

## Vocabulary

### Skill
A specific ability or area of knowledge. Skills may be self-described in a professional profile and are not automatically verified.

### Capability
Demonstrated ability to apply skills in context. Do not describe a person or their overall capability as verified unless the product introduces a separate, explicit verification model that supports that claim.

### Contribution
Meaningful work a professional actually performed. Reserve **Contribution** for work completed, not for an application statement about what someone might do.

### Evidence
Artefacts, outputs, context or records that support a contribution. Evidence supports a claim; it is not automatically Proof and should not be called independently verified unless the product explicitly verifies that object.

### Review
Assessment of a contribution and its supporting evidence by an authorised reviewer. Review is not accreditation, employer verification or certification.

### Mettelo Proof
A structured professional representation created from contribution evidence that has completed the Mettelo review process and reached the required verified contribution state. Mettelo Proof is not a badge, certificate, generic portfolio item or claim that the professional is verified.

### Opportunity
A route forward that may include a project, role, collaboration, leadership responsibility, research, event, employment or another relevant professional path. Opportunity does not imply guaranteed selection, matching, hiring or outcome.

### Professional
Preferred general term for people using Mettelo. Use **member** when referring specifically to membership/account state.

## Verification language

Preferred:

- Contribution verified
- Verified contribution
- Verified contribution evidence
- Reviewed by Project Lead
- Reviewed by Reviewer
- Mettelo Proof based on reviewed/verified contribution evidence

Use with caution:

- Mettelo verified

Avoid unless a future product contract explicitly supports them:

- Verified professional
- Verified capability
- Employer verified
- Mettelo-certified capability
- Certified professional
- Guaranteed job, role, match or opportunity

## Visibility and publication

These concepts are separate:

1. Contribution and evidence exist in the project record.
2. Review determines the contribution review state.
3. A verified contribution may support Mettelo Proof.
4. Visibility controls whether an eligible Proof record is public.
5. Spotlight/Showcase publication is a separate publication decision/consent where the product requires it.

Never imply that making something public changes its review or verification status.

## Profile versus Proof

**Profile** describes the professional: background, experience, skills, interests, goals and availability.

**Mettelo Proof** provides structured context from reviewed project contribution evidence.

A profile statement is not Mettelo Proof merely because it appears on Mettelo.

## Applications

Use **How you could contribute** for project applications. Do not label an applicant's proposed future work as Contribution or Evidence.

Only surface a member-facing action-required state when the member has a real executable action in the product.

## Opportunities

The public opportunity feed must reflect its real inventory and filtering. Do not claim full IT coverage while the live query remains Data & AI-focused.

Listing checks, source checks or freshness checks are about the listing. They do not verify the employer, role outcome, professional or capability.

## Events and Community

Events and community participation can create learning, relationships, collaboration and context around work. Attendance, networking or presenting does not automatically create Mettelo Proof.

Project showcases may explain work and contribution in context. Mettelo Proof remains tied to reviewed contribution evidence.

## Homepage positioning contract

The approved homepage hero is:

- **Eyebrow:** INFORMATION TECHNOLOGY · DATA · AI
- **Headline:** Build industry-ready experience through meaningful projects.
- **Lead:** Work on practical technology projects, collaborate with others and build evidence of how you apply your skills, solve problems and deliver outcomes.
- **Support:** Turn your contributions into credible professional Proof that strengthens your profile and helps you stand out for relevant opportunities.

The hero should remain concise. Do not add the full review lifecycle, capability taxonomy or long lists of technical/professional skills into this first screen. Explain those mechanics progressively in later sections.

## Content release rules

Product/content changes must preserve the approved design unless a separate design change is explicitly authorised.

Before merge:

- run `npm run audit:content-governance`;
- run `npm run audit:content-trust`;
- run the normal lint, typecheck, deterministic audits and build;
- run the relevant public/authenticated browser coverage;
- revalidate after any rebase or head-SHA change;
- reconcile CMS-published content when a CMS value can override a code fallback.

The content governance audits are a minimum safety net, not a substitute for Product/Content review of new concepts or claims.
