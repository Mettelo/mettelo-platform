import fs from 'node:fs';
const read=path=>fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const onboarding=read('components/OnboardingFlow.tsx');
const profile=read('components/ProfileEditor.tsx');
const profileApi=read('app/api/profile/route.ts');
const account=read('components/MemberAccountSettings.tsx');
const accountApi=read('app/api/account-preferences/route.ts');
const accountPage=read('app/member/account/page.tsx');
const accountPolicy=read('lib/account-preferences.ts');
const nav=read('lib/member-navigation.ts');
const privacyMigration=read('supabase/migrations/20260905103000_project_experience_phase_2_member_preferences.sql');
const atomicMigration=read('supabase/migrations/20260905110000_project_experience_phase_2_atomic_profile_save.sql');
const people=read('app/people/page.tsx');
const person=read('app/people/[id]/page.tsx');
const readiness=read('lib/member-readiness.ts');
const completion=read('app/onboarding/complete/page.tsx');
const continuation=read('app/auth/continue-after-onboarding/route.ts');
const roleCatalogue=read('app/api/project-role-catalogue/route.ts');
const checks=[
 ['onboarding remains authenticated and profile-based',read('app/onboarding/page.tsx').includes("from('profiles').select('*')")],
 ['onboarding resume persists server step',onboarding.includes('onboarding_step:persistedStep')&&onboarding.includes('initialStep')],
 ['onboarding stale saves are protected',onboarding.includes('expected_updated_at:profile.updated_at')&&profileApi.includes('PROFILE_STALE')],
 ['onboarding captures broader professional context',onboarding.includes('current_job_title')&&onboarding.includes('organisation')&&onboarding.includes('experience_level')&&onboarding.includes('employment_status')&&onboarding.includes('languages')&&onboarding.includes('Professional bio')],
 ['onboarding availability uses canonical capacity ranges',onboarding.includes('1–3 hours/week')&&onboarding.includes('16+ hours/week')],
 ['onboarding privacy is separated from profile data collection',!onboarding.includes('Show my professional profile')&&onboarding.includes('Privacy and communication choices are managed separately in Account')],
 ['safe onboarding continuation is preserved',completion.includes('/auth/continue-after-onboarding')&&continuation.includes('mettelo_return_to')&&continuation.includes("!returnTo.startsWith('//')")),
 ['Profile and Account are separate destinations',nav.includes("href:'/member/profile'")&&nav.includes("href:'/member/account'")],
 ['Profile editor does not edit privacy',!profile.includes('name="is_public"')&&profile.includes('managed separately in Account')],
 ['profile URLs normalize missing scheme and server requires https',profile.includes('normaliseProfileUrl')&&profileApi.includes("protocol!=='https:'")],
 ['profile strings dedupe case insensitively',profileApi.includes("toLocaleLowerCase('en-GB')")],
 ['preferred roles validate against canonical project role catalogue',Boolean(roleCatalogue)&&profileApi.includes("from('project_role_catalogue')")&&onboarding.includes("fetch('/api/project-role-catalogue')")],
 ['profile readiness remains independent of account preferences',!readiness.includes('notification_preferences')&&!readiness.includes('allow_project_invitations')&&!readiness.includes('allow_member_messages')],
 ['profile and taxonomy preferences save atomically',atomicMigration.includes('save_member_profile')&&atomicMigration.includes('profile_domain_preferences')&&atomicMigration.includes('profile_tool_preferences')&&profileApi.includes("rpc('save_member_profile'")],
 ['onboarding completion is monotonic',atomicMigration.includes('coalesce(public.profiles.onboarding_completed_at,excluded.onboarding_completed_at)')],
 ['Account shows username email password and Member ID distinctly',account.includes('Username & Member ID')&&account.includes('Email & password')&&account.includes('Member ID is a read-only')],
 ['username change reuses Phase 1 API',account.includes("fetch('/api/member-identity'")&&account.includes("method:'PATCH'")],
 ['email change uses Supabase Auth server path',accountApi.includes('supabase.auth.updateUser({email})')],
 ['password recovery reuses Supabase Auth',account.includes('resetPasswordForEmail')&&account.includes('/auth/update-password')],
 ['privacy preference table is additive owner-scoped RLS',privacyMigration.includes('member_privacy_preferences')&&privacyMigration.includes('enable row level security')&&privacyMigration.includes('auth.uid())=user_id')],
 ['discoverability keeps profiles.is_public as canonical owner',accountApi.includes('profile_discoverable:Boolean(profileResult.data?.is_public)')&&accountApi.includes("from('profiles').update({is_public")],
 ['public People is server filtered by discoverability',people.includes("eq('is_public',true)")&&person.includes("eq('is_public',true)")],
 ['notification preferences reuse canonical tables',accountApi.includes("from('notification_event_catalogue')")&&accountApi.includes("from('notification_preferences')")],
 ['critical communications are protected in UI and API',accountPolicy.includes("urgency==='critical'")&&account.includes('disabled={item.required}')&&accountApi.includes('Required account or security communications cannot be disabled.')],
 ['Account status is announced accessibly',account.includes('aria-live="polite"')&&account.includes('aria-atomic="true"')],
 ['profile status is announced accessibly',profile.includes('aria-live="polite"')&&profile.includes('aria-atomic="true"')],
 ['profile remains distinct from Proof',onboarding.includes('not verified Proof')||onboarding.includes('not verified evidence')),
 ['account page never exposes auth UUID',!account.includes('auth UUID')||account.includes('internal Auth UUID is not shown here')),
 ['Phase 2 authenticated browser/RLS test exists',fs.existsSync('tests/project-experience-phase2-account.spec.ts')]
];
let passed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(ok)passed++;}console.log(`\nProject Experience Phase 2 audit: ${passed}/${checks.length} passed.`);if(passed!==checks.length)process.exit(1);
