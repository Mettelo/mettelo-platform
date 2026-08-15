# Phase 1 authentication content standard

This document is the canonical user-facing language standard for Mettelo authentication. It applies to authentication screens, transactional authentication emails, security notifications, and support-facing recovery guidance.

## Content principles

- Use clear, professional, organisation-grade language.
- Use **Mettelo account** for the account and **My Mettelo** for the signed-in workspace.
- Prefer **email address**, **verification email**, **password reset email**, and **sign-in method** consistently.
- Explain the next action directly and avoid conversational phrases such as “still stuck”.
- Do not disclose whether an account exists for a supplied email address in password recovery or duplicate-signup states.
- Security-sensitive messages should explain what happened, what the user should do, and what to do if they did not initiate the action.
- Keep calls to action short and specific.

## Supabase authentication email templates

Supabase supports `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .OldEmail }}`, `{{ .Provider }}`, and other template variables. For the current Mettelo flows, confirmation and recovery emails should use `{{ .ConfirmationURL }}` so the redirect supplied by the application remains part of the verification flow.

### Confirm sign up

**Subject:** Verify your email address | Mettelo

```html
<h2>Verify your email address</h2>
<p>Thank you for creating a Mettelo account.</p>
<p>Please verify your email address to complete your account setup and continue to My Mettelo.</p>
<p><a href="{{ .ConfirmationURL }}">Verify email address</a></p>
<p>If you did not create a Mettelo account, you can safely ignore this email.</p>
<p>For your security, this verification link may expire and should not be shared.</p>
<p>Regards,<br>Mettelo Support</p>
```

### Reset password

**Subject:** Reset your Mettelo password

```html
<h2>Reset your password</h2>
<p>We received a request to reset the password for your Mettelo account.</p>
<p>Select the button below to choose a new password.</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>If you did not request a password reset, you can ignore this email. Your existing password will remain unchanged.</p>
<p>For your security, this link may expire and should not be shared.</p>
<p>Regards,<br>Mettelo Support</p>
```

### Invite user

**Subject:** You have been invited to Mettelo

```html
<h2>You have been invited to Mettelo</h2>
<p>You have been invited to create a Mettelo account.</p>
<p>Select the button below to accept the invitation and continue your account setup.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
<p>If you were not expecting this invitation, you can safely ignore this email.</p>
<p>Regards,<br>Mettelo Support</p>
```

### Magic link / passwordless sign in

**Subject:** Your secure Mettelo sign-in link

```html
<h2>Sign in to Mettelo</h2>
<p>Use the secure link below to sign in to your Mettelo account.</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Mettelo</a></p>
<p>If you did not request this sign-in link, you can safely ignore this email.</p>
<p>For your security, this link is time-limited and should not be shared.</p>
<p>Regards,<br>Mettelo Support</p>
```

### Change email address

**Subject:** Confirm your new Mettelo email address

```html
<h2>Confirm your new email address</h2>
<p>A request was made to change the email address associated with your Mettelo account to <strong>{{ .NewEmail }}</strong>.</p>
<p>Select the button below to confirm the new address.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm new email address</a></p>
<p>If you did not request this change, do not confirm it and contact Mettelo Support.</p>
<p>Regards,<br>Mettelo Support</p>
```

### Reauthentication

**Subject:** {{ .Token }} is your Mettelo verification code

```html
<h2>Verify your identity</h2>
<p>Use the verification code below to continue with this security-sensitive action:</p>
<p><strong>{{ .Token }}</strong></p>
<p>If you did not request this code, do not share it and review the security of your account.</p>
<p>Regards,<br>Mettelo Support</p>
```

## Security notification emails

### Password changed

**Subject:** Your Mettelo password was changed

```html
<h2>Your password was changed</h2>
<p>The password for your Mettelo account was recently changed.</p>
<p>If you made this change, no further action is required.</p>
<p>If you did not make this change, reset your password immediately and contact Mettelo Support.</p>
<p>Regards,<br>Mettelo Support</p>
```

### Email address changed

**Subject:** Your Mettelo email address was changed

```html
<h2>Your email address was changed</h2>
<p>The email address for your Mettelo account was changed from <strong>{{ .OldEmail }}</strong> to <strong>{{ .Email }}</strong>.</p>
<p>If you made this change, no further action is required.</p>
<p>If you did not make this change, contact Mettelo Support immediately.</p>
<p>Regards,<br>Mettelo Support</p>
```

### Sign-in method linked

**Subject:** A new sign-in method was added to your Mettelo account

```html
<h2>A new sign-in method was added</h2>
<p>{{ .Provider }} was added as a sign-in method for your Mettelo account.</p>
<p>If you made this change, no further action is required.</p>
<p>If you did not make this change, review your account security and contact Mettelo Support.</p>
<p>Regards,<br>Mettelo Support</p>
```

### Sign-in method removed

**Subject:** A sign-in method was removed from your Mettelo account

```html
<h2>A sign-in method was removed</h2>
<p>{{ .Provider }} was removed as a sign-in method for your Mettelo account.</p>
<p>If you made this change, no further action is required.</p>
<p>If you did not make this change, review your account security and contact Mettelo Support.</p>
<p>Regards,<br>Mettelo Support</p>
```

## Dashboard application

For the hosted Supabase project, apply these templates in **Authentication → Emails → Email Templates**. Template content is hosted configuration and is not deployed automatically from this repository.

Before Phase 1 is marked successful, verify at least one real delivery and successful link completion for:

1. New account email verification.
2. Password reset.
3. Password-changed security notification, if enabled.
4. Email-address-change notification, if enabled.

Do not advance to Phase 2 until the user-facing screen copy and the live hosted email templates have both been verified end to end.
