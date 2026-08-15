# Phase 1 — Identity, Authentication & First Experience

Status: IN PROGRESS

Phase 1 is successful only when every criterion below is verified. A build alone is not sufficient.

## Journey 1 — Create an account
1. Account creation is reachable from intended entry points.
2. Required fields have clear labels and validation.
3. Invalid/duplicate signup attempts have recoverable errors.
4. Successful signup redirects to `/auth/check-email`.
5. Check-email shows a masked destination email.
6. Verification requirement is explicit.
7. Verification email can be resent.
8. Resend has a cooldown.
9. Wrong-email recovery is available.
10. Missing-email guidance includes spam/support guidance.
11. Verification callback is reliable.
12. Successful verification lands on `/auth/verified`.
13. Verification success explains what happened.
14. Verification success offers the correct next action.
15. Invalid/expired verification links are recoverable.
16. Refresh/back behaviour remains understandable.
17. Page and communication state agree.

## Journey 2 — Sign in
18. Valid email/password sign-in succeeds.
19. Invalid credentials have a useful error.
20. Errors avoid unnecessary account-existence leakage.
21. Unverified users know what to do.
22. Unverified users can recover/resend verification.
23. Google auth completes correctly.
24. GitHub auth completes correctly.
25. Cancelled OAuth is recoverable.
26. OAuth provider failure is recoverable.
27. Expired sessions are handled intentionally.
28. Protected routes redirect to sign-in.
29. Original destination is preserved.
30. Successful auth returns to the originating task.
31. `next` cannot become an open redirect.
32. Back/reload does not corrupt auth state.
33. Authenticated users opening sign-in are handled sensibly.

## Journey 3 — Password recovery
34. Forgot-password is reachable from sign-in.
35. Reset request validates input.
36. Reset response avoids unnecessary account-existence disclosure.
37. Successful request redirects to `/auth/reset-sent`.
38. Reset-sent explains what happens next.
39. Recovery email points to the production callback.
40. Valid recovery opens password update.
41. New password supports show/hide.
42. Password requirements are visible.
43. Weak passwords have useful validation.
44. Confirmation mismatch is clear.
45. Successful update goes to `/auth/password-changed`.
46. Password-changed confirms success.
47. User can continue/sign in.
48. Expired links are recoverable.
49. Used links are recoverable.
50. Wrong-browser/session state is recoverable.
51. Another recovery email can be requested.
52. Back/refresh remains understandable.

## Journey 4 — First-time onboarding
53. Newly verified members enter onboarding, not an unexplained dashboard.
54. Welcome state exists.
55. Onboarding progress is visible.
56. About you works.
57. Skills works.
58. What you are looking for works.
59. Availability works.
60. Profile preview works.
61. Existing data is prefilled where appropriate.
62. Step validation works.
63. Back navigation preserves data.
64. Progress is saved.
65. Save and continue later persists.
66. Returning users resume appropriately.
67. Completion has a clear success state.
68. Profile value is explained.
69. Completion reaches My Mettelo.
70. Existing members are not forced through first-time onboarding.

## Cross-journey
71. Page, email, notification and Admin-visible state do not contradict.
72. Important auth transitions have canonical states.
73. Success is explicit.
74. Failure is explicit.
75. Failures offer a next action.
76. No critical journey ends at a dead end.
77. Loading states prevent duplicate submission.
78. Buttons never silently fail.
79. Safe user-entered data survives recoverable errors where appropriate.
80. Relevant auth events are supportable/auditable.

## Responsive/device gate
81. 320px phone has no horizontal overflow.
82. 375/390px phone layout passes.
83. 430px phone layout passes.
84. Phone landscape passes.
85. 768px tablet passes.
86. 1024px tablet passes.
87. 1280px laptop passes.
88. 1440px desktop passes.
89. 1920px+ desktop passes.
90. No application-caused horizontal scrolling.
91. Text never overlaps controls.
92. Long messages wrap correctly.
93. Forms remain usable with validation visible.
94. Touch targets are usable.
95. Fixed/sticky UI does not hide actions.
96. Mobile keyboard does not block completion.
97. Autofill/password managers do not break layout.
98. 200% browser zoom remains usable.
99. Long emails/names/errors do not break containers.
100. Loading/success/error states are checked at major viewport classes.

## Accessibility gate
101. Inputs have associated labels.
102. Keyboard-only navigation works.
103. Focus order follows the visible journey.
104. Focus state is visible.
105. Validation does not rely on colour alone.
106. Status/error messages are exposed to assistive technology.
107. Buttons use button semantics.
108. Links use link semantics.
109. Modal focus is correct if modals exist.
110. Contrast is readable.

## Engineering/regression gate
111. Typecheck passes.
112. Lint passes without new blocking errors.
113. Production build passes.
114. Phase 0 audit remains 25/25.
115. Interaction audit passes.
116. Dedicated Phase 1 audit exists and passes.
117. Callback destinations are verified.
118. No secrets are exposed client-side.
119. Redirect handling is security-reviewed.
120. Existing users can still sign in.
121. Password recovery is not regressed.
122. OAuth is not regressed.
123. Protected routes remain protected.
124. Production deployment succeeds.
125. Post-deployment smoke checks pass.
