# My Mettelo account access UX

Last audited: 18 August 2026

The canonical account access route is `/signin`; account creation is `/signin?mode=signup` and password recovery is `/signin?mode=reset`.

## Journey

Account creation is the first step of a longer profile setup journey. Successful email or social signup continues to `/onboarding`, whose five stages are About you, Skills, What you’re looking for, Availability, and Profile preview. The account creation surface therefore presents `Step 1 of 6` during signup.

## Hierarchy contract

- Sign in and Create account are peer modes in a compact two-option segmented control.
- Password reset is recovery, not a peer acquisition mode. It is reached from `Forgot password?` beside the password field in Sign in mode, while direct `/signin?mode=reset` links remain supported.
- Google and GitHub remain the lower-friction path and appear before the email form.
- Mobile groups the mode switch/OAuth choices in an auth-options card and keeps the email fields in a separate form card.
- Desktop preserves the established split layout: account story and mode switch on the left, authentication form on the right.
- Signup CTA copy is `Create Mettelo account`.

## Password interaction

Password fields include an accessible show/hide control. Signup includes a lightweight four-segment strength indicator with textual Weak/Good/Strong feedback announced through `aria-live`. Strength feedback is guidance only; the existing server/auth password contract remains authoritative.

## Trust signal

Signup may show the current Mettelo profile count near the primary CTA. The count must come from the same public `profiles` count used as the homepage member/community metric source. Do not hardcode a member-count placeholder on the auth page. If the public count cannot be read, omit the trust line rather than inventing a value.

## Responsive and accessibility contract

Verify the signup surface at 375px, 390px, and 414px with no horizontal overflow. All interactive controls must provide at least a 44px target. The segmented control and password toggle must have visible keyboard focus; the password toggle needs a stateful accessible name; status and strength feedback must remain available to assistive technology. All work remains within the Ink and Value tokens and WCAG 2.2 AA requirements.
