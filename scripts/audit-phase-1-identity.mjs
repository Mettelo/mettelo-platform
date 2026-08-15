import fs from 'node:fs';

const read=(path)=>fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const signin=read('app/signin/page.tsx');
const callback=read('app/auth/callback/route.ts');
const checkEmail=read('app/auth/check-email/page.tsx');
const resetSent=read('app/auth/reset-sent/page.tsx');
const updatePassword=read('app/auth/update-password/page.tsx');
const passwordChanged=read('app/auth/password-changed/page.tsx');
const verified=read('app/auth/verified/page.tsx');
const onboardingPage=read('app/onboarding/page.tsx');
const onboarding=read('components/OnboardingFlow.tsx');
const profileApi=read('app/api/profile/route.ts');
const phase0=read('scripts/audit-phase-0-communications.mjs');

const checks=[
 ['signup redirects to check-email',signin.includes('/auth/check-email?email=')],
 ['check-email route exists',Boolean(checkEmail)],
 ['check-email masks destination email',checkEmail.includes('maskEmail')],
 ['verification resend is wired',checkEmail.includes("supabase.auth.resend")],
 ['verification resend cooldown exists',checkEmail.includes('setCooldown(60)')],
 ['wrong-email recovery exists',checkEmail.includes('Wrong email? Change it')],
 ['verification callback exchanges code',callback.includes('exchangeCodeForSession')],
 ['signup verification reaches verified page',callback.includes("flow==='signup'")&&callback.includes('/auth/verified')],
 ['verified page has explicit success state',verified.includes('Your email is verified.')],
 ['safe next path rejects protocol-relative redirects',signin.includes("!value.startsWith('//')")&&callback.includes("!value.startsWith('//')")],
 ['reset request redirects to reset-sent',signin.includes('/auth/reset-sent?email=')],
 ['reset-sent route exists',Boolean(resetSent)],
 ['reset-sent avoids account-existence disclosure',resetSent.includes('does not confirm whether an account exists')],
 ['recovery callback targets password update',signin.includes("flow=recovery")&&signin.includes('/auth/update-password')],
 ['password update checks recovery session',updatePassword.includes('getSession()')],
 ['password show/hide controls exist',updatePassword.includes('showPassword')&&updatePassword.includes('showConfirm')],
 ['password mismatch is validated',updatePassword.includes('The passwords do not match.')],
 ['password completion redirects to dedicated state',updatePassword.includes("/auth/password-changed")],
 ['password-changed route exists',Boolean(passwordChanged)],
 ['onboarding route requires authentication',onboardingPage.includes("redirect('/signin?next=%2Fonboarding')")],
 ['onboarding has five named steps',onboarding.includes("'About you'")&&onboarding.includes("'Skills'")&&onboarding.includes("'What you’re looking for'")&&onboarding.includes("'Availability'")&&onboarding.includes("'Profile preview'")],
 ['onboarding exposes progress',onboarding.includes('Step {step+1} of {steps.length}')&&onboarding.includes('% complete')],
 ['onboarding can save and continue later',onboarding.includes('Save and continue later')&&onboarding.includes("fetch('/api/profile'")],
 ['onboarding reuses canonical profile API',profileApi.includes("supabase.from('profiles').update")],
 ['onboarding has required-field gating',onboarding.includes('canContinue')],
 ['onboarding supports back navigation',onboarding.includes('← Back')],
 ['onboarding ends in My Mettelo',onboarding.includes("window.location.assign('/member')")],
 ['auth status messages expose aria-live',signin.includes('aria-live="polite"')&&checkEmail.includes('aria-live="polite"')&&updatePassword.includes('aria-live="polite"')&&onboarding.includes('aria-live="polite"')],
 ['responsive typography uses clamp',signin.includes('clamp(')&&checkEmail.includes('clamp(')&&onboarding.includes('clamp(')],
 ['responsive controls can wrap',checkEmail.includes("flexWrap:'wrap'")&&onboarding.includes("flexWrap:'wrap'")],
 ['Phase 0 audit still exists',Boolean(phase0)]
];

let passed=0;
checks.forEach(([label,ok],index)=>{const prefix=String(index+1).padStart(2,'0');console.log(`${ok?'PASS':'FAIL'} ${prefix}/${checks.length} ${label}`);if(ok)passed+=1;});
console.log(`\nPhase 1 deterministic identity audit: ${passed}/${checks.length} checks passed.`);
if(passed!==checks.length)process.exit(1);
