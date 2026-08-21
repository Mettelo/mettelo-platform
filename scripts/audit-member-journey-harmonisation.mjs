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
  ['application lifecycle states still route to Applications',journey.includes("return{label:'View application',href:'/member/applications'}")],
  ['Save Project uses canonical saved-project API',save.includes("fetch('/api/projects/saved'")],
  ['Save Project exposes visible status feedback',save.includes('role="status"')&&save.includes('Saved to My Mettelo')&&!save.includes('mdSrOnly')],
  ['Save Project uses optimistic state with rollback on failure',save.includes('setSaved(next)')&&save.includes('setSaved(previous)')],
  ['Discover retains exact member project CTA rendering',catalogue.includes('href={item.action.href}')],
  ['shared header mobile title remains controlled',sharedHeaderCss.includes('@media(max-width:480px)')&&sharedHeaderCss.includes('font-size:32px')],
  ['shared header maintains 44px action targets',sharedHeaderCss.includes('min-height:44px')],
  ['Profile save safely upserts the authenticated owner row',profileApi.includes("upsert({id:user.id,...updatePayload},{onConflict:'id'})")],
  ['Profile save keeps owner identity server-derived',profileApi.includes('id:user.id')&&!profileApi.includes('id:body.id')],
  ['Profile save surfaces schema mismatch without exposing database detail',profileApi.includes("schemaMismatch=error.code==='42703'||error.code==='PGRST204'")],
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
