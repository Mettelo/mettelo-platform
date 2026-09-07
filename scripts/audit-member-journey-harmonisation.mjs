import fs from 'node:fs';

const read=path=>fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const projects=read('app/member/projects/page.tsx');
const projectsCss=read('app/member/projects/member-projects.module.css');
const applications=read('app/member/applications/page.tsx');
const proof=read('app/member/proof/page.tsx');
const discover=read('app/member/discover/page.tsx');
const catalogue=read('components/MemberDiscoverCatalogue.tsx');
const save=read('components/SaveProjectButton.tsx');
const journey=read('lib/member-project-journey.ts');
const sharedHeader=read('components/MemberPageHeader.tsx');
const sharedHeaderCss=read('components/MemberPageHeader.module.css');
const profileApi=read('app/api/profile/route.ts');
const atomicProfileMigration=read('supabase/migrations/20260905110000_project_experience_phase_2_atomic_profile_save.sql');
const menuRestore=read('app/public-mobile-menu-restore.css');
const rootLayout=read('app/layout.tsx');

const checks=[
  ['shared Member page header exists',sharedHeader.includes('MemberPageHeader')&&sharedHeaderCss.includes('clamp(40px,4.4vw,50px)')],
  ['Applications uses shared header',applications.includes("import MemberPageHeader")&&applications.includes('<MemberPageHeader')],
  ['Proof uses shared header',proof.includes("import MemberPageHeader")&&proof.includes('<MemberPageHeader')],
  ['Discover uses shared header',discover.includes("import MemberPageHeader")&&discover.includes('<MemberPageHeader')],
  ['Projects duplicate breadcrumb is removed from the rendered page',!projects.includes('className={styles.crumb}')],
  ['Projects content aligns to the Member Panel grid',projectsCss.includes('width:min(100%,1240px)')&&projectsCss.includes('margin:0;padding:0 0 88px')],
  ['Projects discovery CTAs stay inside My Mettelo',projects.includes('href="/member/discover"')&&!projects.includes('href="/projects"')],
  ['Applications Discover CTA stays inside My Mettelo',applications.includes('href="/member/discover"')&&!applications.includes('href="/projects"')],
  ['Proof project discovery CTA stays inside My Mettelo',proof.includes('href="/member/discover"')&&!proof.includes('href="/projects"')],
  ['Discover catalogue routes exact project states to member detail',journey.includes("return{label:'View project',href:`/member/discover/${projectId}`}")],
  ['active interest lifecycle states route to Applications',journey.includes("['application_submitted','application_action_required','application_in_review','team_forming'].includes(state)")&&journey.includes("return{label:'View interest',href:'/member/applications'}")],
  ['Save Project uses canonical saved-project API',save.includes("fetch('/api/projects/saved'")],
  ['Save Project exposes visible status feedback',save.includes('role="status"')&&save.includes('Saved to My Mettelo')&&!save.includes('mdSrOnly')],
  ['Save Project uses optimistic state with rollback on failure',save.includes('setSaved(next)')&&save.includes('setSaved(previous)')],
  ['Discover retains exact member project CTA rendering',catalogue.includes('href={item.action.href}')],
  ['shared header mobile title remains controlled',sharedHeaderCss.includes('@media(max-width:480px)')&&sharedHeaderCss.includes('font-size:32px')],
  ['shared header maintains 44px action targets',sharedHeaderCss.includes('min-height:44px')],
  ['Profile save safely upserts the authenticated owner row',profileApi.includes("rpc('save_member_profile'")&&atomicProfileMigration.includes('insert into public.profiles(')&&atomicProfileMigration.includes('on conflict(id) do update set')],
  ['Profile save keeps owner identity server-derived',!profileApi.includes('id:body.id')&&atomicProfileMigration.includes('v_user_id uuid:=auth.uid()')&&atomicProfileMigration.includes('v_user_id,')],
  ['Profile save surfaces schema mismatch without exposing database detail',profileApi.includes("schemaMismatch=error.code==='42883'||error.code==='PGRST202'")&&profileApi.includes('Profile saving is temporarily unavailable while the profile schema is updated.')],
  ['Contained public mobile menu restore is loaded last',rootLayout.includes("import './public-mobile-menu-restore.css';")],
  ['Restored mobile menu is contained rather than viewport-height',menuRestore.includes('width:min(86vw,340px)')&&menuRestore.includes('height:auto!important')&&menuRestore.includes('top:68px!important')],
  ['Restored mobile menu retains a backdrop and bounded scrolling',menuRestore.includes('.mobileMenuBackdrop')&&menuRestore.includes('max-height:calc(100dvh - 80px)')]
];

let passed=0;
for(const [index,[label,ok]] of checks.entries()){
  console.log(`${ok?'PASS':'FAIL'} ${String(index+1).padStart(2,'0')}/${checks.length} ${label}`);
  if(ok)passed+=1;
}
console.log(`\nMember Journey harmonisation audit: ${passed}/${checks.length} checks passed.`);
if(passed!==checks.length)process.exit(1);
