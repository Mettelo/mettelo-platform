# Mettelo Lab Workspace

## Purpose

Mettelo Lab is the complete member-facing project workspace. It is not a nested feature inside a separate "Project Workspace" shell, and Team is a working context inside the Lab rather than a synonym for the Lab.

## Information architecture

Desktop primary navigation:

- Home
- Plan
- Tasks
- Chat
- Data
- Proof

Project tools in the same Lab rail:

- Resources
- Events
- Team

Mobile primary navigation:

- Home
- Tasks
- Chat
- Data
- More

Mobile More contains Plan, Proof, Resources, Events and Team.

Do not create a second competing project navigation layer. Local tabs are appropriate only for genuine subviews inside a destination.

## Cohort visibility decision

A normal member's Mettelo Lab contains only the cohort/team they actually belong to. Other project cohorts are not shown as locked cards, "not a member" cards, switcher items or a project-wide directory. Project-wide cohort administration is an Admin concern. Project-level surfaces outside the Lab may show approved aggregate cohort counts without exposing cohort membership.

This boundary is both a UX rule and a data-access requirement. Server-side authorization remains authoritative.

## Event meeting-mode decision

An authorized event creator chooses between Mettelo Video and External Meeting. External Meeting accepts a valid secure meeting URL, including Zoom, Microsoft Teams, Google Meet and other HTTPS meeting providers. Attendees receive a consistent Join event interaction regardless of provider.

The existing Events capability must be preserved: create, upcoming/past views, details, join, edit/cancel where authorized, reviews, project links and Final Presentation lifecycle.

## Terminology

Member-facing terminology is:

- Mettelo Lab
- Home
- Plan
- Tasks (not Work)
- Chat (not Conversation)
- Data
- Proof
- Resources
- Events
- Team

Internal table/API names do not need to be renamed when they are not user-facing.

## Accessibility

The workspace must meet WCAG 2.2 AA. Normal text contrast is at least 4.5:1, meaningful UI boundaries at least 3:1, status never relies on color alone, keyboard focus is visible, icon-only actions have accessible names, headings/landmarks are logical, forms have real labels and errors, and interactive targets are approximately 44x44px or larger. Reduced-motion preferences must be respected.

## Responsive contract

- Mobile <=480px: single-column content, no desktop rail, bottom Lab navigation Home / Tasks / Chat / Data / More, safe-area support, no horizontal document scroll, Chat composer remains usable above the keyboard/navigation.
- Tablet 481-1024px: controlled compact navigation, layouts adapt rather than squeezing desktop tables.
- Desktop >=1025px: persistent Mettelo Lab rail and main working canvas. Contextual secondary rails may appear only when they add unique information.

Acceptance widths: 375, 390, 414, 768, 1024 and desktop.

## Release acceptance

The redesign is not complete because screens resemble a prototype. Existing project capabilities and server authorization must remain intact. Exact-head CI, Release gate and Deployment gate must be green before merge. The deterministic `audit:mettelo-lab` check is part of the production build gate and protects the core workspace identity, navigation, terminology and member Team privacy contract.
