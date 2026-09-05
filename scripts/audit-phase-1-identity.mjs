import fs from 'node:fs';

const read=(path)=>fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const signin=[read('app/signin/page.tsx'),read('app/signin/AuthAccountClient.tsx'),read('app/signin/signin.css')].join('\n');
const callback=read('app/auth/callback/route.ts');
const socialComplete=read('app/auth/social-complete/page.tsx');
const checkEmail=read('app/auth/check-email/page.tsx');
const resetSent=read('app/auth/reset-sent/page.tsx');
const updatePassword=read('app/auth/update-password/page.tsx');
const passwordChanged=read('app/auth/password-changed/page.tsx');
const verified=read('app/auth/verified/page.tsx');
const onboardingPage=read('app/onboarding/page.tsx');
const onboardingComplete=read('app/onboarding/complete/page.tsx');
const onboarding=read('components/OnboardingFlow.tsx');
const profileApi=read('app/api/profile/route.ts');
const onboardingMigration=read('supabase/migrations/20260815153916_phase_1_onboarding_state.sql');
const atomicProfileMigration=read('supabase/migrations/20260905110000_project_experience_phase_2_atomic_profile_save.sql');
const responsiveGate=read('app/dev/phase-1-responsive-gate/page.tsx');
const onboardingPreview=read('app/dev/phase-1-onboarding/page.tsx');
const browserGate=read('tests/phase1-browser.spec.ts');
const workflow=read('.github/workflows/ci.yml');
const phase0=read('scripts/audit-phase-0-communications.mjs');
const identityMigration=read('supabase/migrations/20260905090000_project_experience_phase_1_member_identity.sql');
const identityApi=read('app/api/member-identity/route.ts');
const identityRules=read('lib/member-identity.ts');
const identityClaim=read('components/MemberIdentityClaimForm.tsx');
const identityPage=read('app/member/identity/page.tsx');
const profilePage=read('app/member/profile/page.tsx');
const adminAccessApi=read('app/api/admin/access/route.ts');
const adminIdentity=read('components/AdminMemberIdentityLookup.tsx');
const teamOverview=read('lib/project-team-overview.ts');
const teamRoster=read('components/ProjectTeamRoster.tsx');
const lab=read('components/MetteloLabPanel.tsx');
const messagePanel=read('components/ProjectMessagePanel.tsx');
const adminSecurityTest=read('tests/admin-access-capabilities.spec.ts');

const checks=[
 ['signup redirects to check-email',signin.includes('/auth/check-email?email=')],
 ['check-email route exists',Boolean(checkEmail)],
 ['check-email masks destination email',checkEmail.includes('maskEmail')],
 ['verification email app action exists',checkEmail.includes('Open email app')&&checkEmail.includes("window.location.href='mailto:'")],
 ['verification resend is wired',checkEmail.includes("supabase.auth.resend")],
 ['verification resend cooldown exists',checkEmail.includes('setCooldown(60)')],
 ['wrong-email recovery exists',checkEmail.includes('Wrong email? Change it')],
 ['verification support recovery exists',checkEmail.includes('/contact')],
 ['verification callback exchanges code',callback.includes('exchangeCodeForSession')],
 ['signup verification reaches verified page',callback.includes("flow==='signup'")&&callback.includes('/auth/verified')],
 ['email signup continues into onboarding',signin.includes('function onboardingDestination()')&&signin.includes('flow=signup&next=${encodeURIComponent(onboarding)}')&&signin.includes('/auth/verified?next=${encodeURIComponent(onboarding)}')],
 ['OAuth account creation uses distinct social signup flow',signin.includes("const flow=socialSignup?'social-signup':'oauth'")&&callback.includes("flow==='social-signup'")],
 ['OAuth account creation requires password completion',Boolean(socialComplete)&&callback.includes('/auth/social-complete')&&socialComplete.includes('updateUser({password})')&&socialComplete.includes('Confirm password')],
 ['OAuth account creation continues into onboarding',socialComplete.includes("return '/onboarding'")&&socialComplete.includes('/auth/verified?next=')],
 ['OAuth cancellation and failure are recoverable',callback.includes('oauth-cancelled')&&callback.includes('oauth-failed')&&signin.includes('Social sign-in was cancelled')],
 ['unverified sign-in routes to verification recovery',signin.includes("code==='email_not_confirmed'")&&signin.includes('/auth/check-email?email=')],
 ['authenticated users do not remain on sign-in',signin.includes('supabase.auth.getSession()')&&signin.includes('window.location.replace(safeNext())')],
 ['auth callbacks use configurable live production origin',signin.includes('NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN')&&signin.includes("'https://mettelo-platform.vercel.app'")&&signin.includes('${authOrigin()}/auth/callback')&&!signin.includes('configured||window.location.origin')],
 ['duplicate signup gets secure recovery actions',signin.includes('data.user.identities.length===0')&&signin.includes('This email may already have a Mettelo account')&&signin.includes('Sign in instead')&&signin.includes('Reset password')],
 ['verified page has explicit success state',verified.includes('Your email is verified.')],
 ['verified page names onboarding next action',verified.includes('Continue profile setup')],
 ['safe next path rejects protocol-relative redirects',signin.includes("!value.startsWith('//')")&&callback.includes("!value.startsWith('//')")],
 ['reset request redirects to reset-sent',signin.includes('/auth/reset-sent?email=')],
 ['reset-sent route exists',Boolean(resetSent)],
 ['reset-sent avoids account-existence disclosure',resetSent.includes('does not confirm whether an account exists')],
 ['recovery callback targets password update',signin.includes("flow=recovery")&&signin.includes('/auth/update-password')],
 ['password update checks recovery session',updatePassword.includes('getSession()')],
 ['password show/hide controls exist',updatePassword.includes('showPassword')&&updatePassword.includes('showConfirm')],
 ['password mismatch is validated',updatePassword.includes('The passwords do not match.')],
 ['password completion redirects to dedicated state',updatePassword.includes('/auth/password-changed')],
 ['password-changed route exists',Boolean(passwordChanged)],
 ['onboarding route requires authentication',onboardingPage.includes("const onboardingPath=next==='/member'?'/onboarding':")&&onboardingPage.includes('if(!user)redirect(`/signin?next=${encodeURIComponent(onboardingPath)}`)')],
 ['onboarding has five named steps',onboarding.includes("const steps=['About you','Skills & interests','Project goals','Availability','Review profile']")],
 ['onboarding exposes progress',onboarding.includes('Step {step+1} of {steps.length}')&&onboarding.includes('% complete')],
 ['onboarding can save and continue later',onboarding.includes('Save and continue later')&&onboarding.includes('saveForLater')&&onboarding.includes("window.location.assign('/member')")],
 ['onboarding progress is persisted',Boolean(onboardingMigration)&&onboardingMigration.includes('onboarding_step')&&profileApi.includes("hasOwnProperty.call(body,'onboarding_step')")&&profileApi.includes('onboarding_step:persistedStep')&&profileApi.includes("rpc('save_member_profile'")&&atomicProfileMigration.includes("p_profile->>'onboarding_step'")],
 ['normal profile edits preserve onboarding progress',profileApi.includes("const hasOnboardingStep=Object.prototype.hasOwnProperty.call(body,'onboarding_step')")&&profileApi.includes("Number(currentProfile.data?.onboarding_step||0)")&&profileApi.includes('onboarding_step:persistedStep')],
 ['returning onboarding users resume saved step',onboardingPage.includes('initialStep={Math.max(0,Math.min(4,Number(profile.onboarding_step||0)))}')&&onboarding.includes('useState(initialStep)')],
 ['completed members bypass first-time onboarding',onboardingMigration.includes('onboarding_completed_at')&&onboardingPage.includes('if(profile.onboarding_completed_at)redirect(next)')&&onboardingPage.includes("!item.startsWith('//')")],
 ['onboarding has explicit completion state',Boolean(onboardingComplete)&&onboarding.includes('window.location.assign(`/onboarding/complete?next=${encodeURIComponent(returnTo)}`)')&&onboardingComplete.includes('Your professional profile is ready to use.')],
 ['onboarding completion is persisted',profileApi.includes('const completionAt=currentProfile.data?.onboarding_completed_at||(onboardingComplete?new Date().toISOString():null)')&&profileApi.includes('onboarding_completed_at:completionAt')&&onboarding.includes('save(4,true)')&&atomicProfileMigration.includes('coalesce(public.profiles.onboarding_completed_at,excluded.onboarding_completed_at)')],
 ['onboarding reuses canonical profile API',(profileApi.includes("supabase.from('profiles').update")||(profileApi.includes("supabase.from('profiles').upsert")&&profileApi.includes('id:user.id')&&!profileApi.includes('id:body.id'))||(profileApi.includes("rpc('save_member_profile'")&&atomicProfileMigration.includes('security invoker')&&atomicProfileMigration.includes('on conflict(id) do update')))],
 ['onboarding has required-field gating',onboarding.includes('canContinue')],
 ['onboarding supports back navigation',onboarding.includes('← Back')],
 ['auth status messages expose aria-live',signin.includes('aria-live="polite"')&&checkEmail.includes('aria-live="polite"')&&updatePassword.includes('aria-live="polite"')&&socialComplete.includes('aria-live="polite"')&&onboarding.includes('aria-live="polite"')],
 ['responsive typography uses clamp',signin.includes('clamp(')&&checkEmail.includes('clamp(')&&onboarding.includes('clamp(')],
 ['responsive controls can wrap',checkEmail.includes("flexWrap:'wrap'")&&onboarding.includes("flexWrap:'wrap'")],
 ['multi-device responsive gate exists',Boolean(responsiveGate)&&Boolean(onboardingPreview)],
 ['responsive gate covers required widths',forWidths(responsiveGate,[320,390,430,768,1024,1280,1440,1920])&&responsiveGate.includes("label:'Phone landscape'")],
 ['real-browser responsive gate exists separately from CI',Boolean(browserGate)&&browserGate.includes('width:320')&&browserGate.includes('width:1920')&&browserGate.includes('200 percent zoom')],
 ['GitHub CI preserves deterministic release-train checks and full main release validation',workflow.includes('npm run audit:phase1')&&workflow.includes('npm run audit:mettelo-lab')&&workflow.includes('npm run build')&&workflow.includes('Blocking public browser regression suite')&&workflow.includes('npm run test:regression')&&workflow.includes('release-train-pr-fast')&&workflow.includes('target_branch')&&workflow.includes('release/*')&&workflow.includes('requires_staging=true')&&workflow.includes('classification=runtime-or-backend-impact')&&workflow.includes('needs: [scope, verify, staging-e2e]')],
 ['Phase 0 audit still exists',Boolean(phase0)],
 ['auth UUID remains the profile primary identity',identityMigration.includes('alter table public.profiles')&&!identityMigration.includes('drop column id')&&!identityMigration.includes('alter column id')],
 ['immutable generated Member ID exists',identityMigration.includes('assign_member_id')&&identityMigration.includes("'MTL-'")&&identityMigration.includes('member_id is immutable')],
 ['username is case-insensitively unique',identityMigration.includes('profiles_username_ci_unique')&&identityMigration.includes('lower(username)')],
 ['username database format is normalized ASCII safe',identityMigration.includes("username = lower(username)")&&identityMigration.includes("^[a-z][a-z0-9_]{2,29}$")],
 ['reserved usernames are enforced in shared code and database',identityRules.includes('RESERVED_USERNAMES')&&identityMigration.includes('profiles_username_reserved')&&identityMigration.includes("'admin'")&&identityMigration.includes("'mettelo'")],
 ['identity owner cannot bypass canonical claim fields',identityMigration.includes('protect_member_identity_fields')&&identityMigration.includes("app.member_identity_claim")&&identityMigration.includes('before insert or update')],
 ['username claim is authenticated row locked and race safe',identityMigration.includes('auth.uid() is null')&&identityMigration.includes('for update')&&identityMigration.includes('unique_violation')&&identityMigration.includes("'UNAVAILABLE'")],
 ['username claim has rapid retry protection',identityMigration.includes("interval '2 seconds'")&&identityMigration.includes("'RATE_LIMITED'")],
 ['email signup collects and persists username without replacing Supabase Auth',signin.includes('name="username"')&&signin.includes('validateUsername')&&signin.includes('full_name:fullName,username:usernameResult.username')&&signin.includes('supabase.auth.signUp')],
 ['OAuth signup requires username before onboarding',socialComplete.includes('name="username"')&&socialComplete.includes("fetch('/api/member-identity'")&&socialComplete.includes('validateUsername')],
 ['legacy users have a non-blocking claim route',Boolean(identityPage)&&Boolean(identityClaim)&&identityApi.includes('ensureIdentityProfile')&&identityApi.includes("from('profiles').insert")],
 ['identity API is authenticated and uses canonical RPC',identityApi.includes('Authentication required.')&&identityApi.includes("rpc('claim_member_username'")],
 ['claim form has accessible working error and success states',identityClaim.includes("'success'")&&identityClaim.includes('aria-busy')&&identityClaim.includes('aria-live="polite"')&&identityClaim.includes('Check your connection and try again.')],
 ['member profile displays handle and Member ID',profilePage.includes('@${profile.username}')&&profilePage.includes('Member ID')&&profilePage.includes('profile.member_id')],
 ['Admin can resolve username and Member ID inside existing access boundary',adminAccessApi.includes('username')&&adminAccessApi.includes('member_id')&&adminAccessApi.includes("replace(/^@/,'')")&&adminIdentity.includes('Member identity')&&adminIdentity.includes('@username')],
 ['authorised team overview carries username without exposing Member ID',teamOverview.includes('username:string|null')&&teamOverview.includes('full_name,username,headline,avatar_url')&&!teamOverview.includes('member_id')],
 ['Lab, team roster and Chat consume username identity without a second member directory',teamRoster.includes('@{member.username}')&&lab.includes('@{member.username}')&&messagePanel.includes('/api/project-team-overview?')&&messagePanel.includes('mentionToken(member)')&&messagePanel.includes('@${member.username}')],
 ['public username availability enumeration endpoint was not introduced',!fs.existsSync('app/api/member-identity/availability/route.ts')&&!fs.existsSync('app/api/username-availability/route.ts')],
 ['identity security behaviour is covered by authenticated Supabase E2E',adminSecurityTest.includes("claim_member_username")&&adminSecurityTest.includes('PHASE1_MEMBER')&&adminSecurityTest.includes("member_id:'MTL-999999'")&&adminSecurityTest.includes("getByLabel('Member identity')")]
];

function forWidths(source,widths){return widths.every(width=>source.includes(`width:${width}`));}

let passed=0;
checks.forEach(([label,ok],index)=>{const prefix=String(index+1).padStart(2,'0');console.log(`${ok?'PASS':'FAIL'} ${prefix}/${checks.length} ${label}`);if(ok)passed+=1;});
console.log(`\nPhase 1 deterministic identity audit: ${passed}/${checks.length} checks passed.`);
if(passed!==checks.length)process.exit(1);
