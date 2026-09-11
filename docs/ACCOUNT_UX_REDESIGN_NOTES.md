# Account UX redesign notes

The account experience is structured as an account control centre rather than a long settings document.

- Identity is first because an unclaimed username blocks a core people-facing identity task.
- A compact identity summary keeps username and immutable Member ID visible without exposing Auth UUIDs.
- Sticky section navigation provides direct access to Identity, Security, Privacy and Notifications.
- Save/loading/error state is scoped to each section so an identity request cannot disable unrelated privacy, security or notification actions.
- Notifications use a responsive grouped grid instead of one continuous vertical table.
- Mobile layouts collapse to one column, retain full-width action targets and avoid horizontal overflow.
- Existing backend security, username change policy, profile ownership, notification requirements and privacy semantics remain unchanged.
