import fs from 'node:fs';

const read=path=>fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const home=read('app/member/page.tsx');
const css=read('app/member/member-home-v3.module.css');
const explore=read('app/member/member-home-explore.module.css');
const shell=read('components/MemberAppShell.tsx');
const nav=read('lib/member-navigation.ts');
const visual=read('tests/member-home-v3-visual.spec.ts');

const checks=[
  ['Home remains server-authenticated',home.includes('createServerSupabaseClient')&&home.includes("redirect('/signin?next=/member')")],
  ['authoritative live member queries remain present',['profiles','project_applications','project_members','contributions','saved_opportunities','saved_projects','project_tasks','spotlights'].every(table=>home.includes(`from('${table}')`))],
  ['Up Next still derives from member state',home.includes('const upNext=nextTask?')&&home.includes('pendingSpotlight')&&home.includes('profileReady')&&home.includes('recommendationCount')],
  ['Up Next exposes one production CTA',home.includes('id="up-next-heading"')&&!home.includes('buttonGhostDark')],
  ['duplicate Personal Queue presentation removed',!home.includes('WHAT NEEDS YOU NOW')&&!home.includes('PERSONAL QUEUE')&&!home.includes('Actions & meaningful updates')],
  ['Important Updates replaces duplicate task queue',home.includes('IMPORTANT UPDATES')&&home.includes('What changed')&&home.includes('const updates:HomeUpdate[]=[]')],
  ['profile completion is not added to Important Updates',!home.includes("updates.push({kind:'ACTION'")],
  ['overview contains only four agreed metrics',home.includes("label:'Active project'")&&home.includes("label:'Application'")&&home.includes("label:'Verified Proof'")&&home.includes("label:'Saved'")&&!/const overview=[\s\S]*label:'Recommendation'/.test(home)],
  ['project fallback describes actual review work',home.includes('Review the current delivery plan and confirm your next assigned action.')],
  ['application home copy remains truthful and forward-looking',home.includes("'Not progressed'")&&home.includes('explore similar work when you are ready')&&home.includes('Explore similar')],
  ['Proof leads with reusable evidence value',home.indexOf('Evidence that travels with you')<home.indexOf('styles.proofValue')&&home.includes('Your active project can become verified Proof')],
  ['no prototype member or project names are hardcoded',!home.includes('Johnson')&&!home.includes('Open Data Quality Monitor')&&!home.includes('GA4 analysis for marketing automation')],
  ['member navigation contract is unchanged',['Home','Projects','Applications','Proof','Profile','Discover','Recommended','Opportunities','Saved','Events','Spotlight'].every(label=>nav.includes(`label:'${label}'`))],
  ['Member shell remains authoritative',shell.includes("from '@/lib/member-navigation'")],
  ['approved Projects-aligned content width is present',css.includes('width:min(100%,1240px)')&&!css.includes('margin:0 auto')],
  ['approved page title scale is present',css.includes('clamp(30px,3vw,34px)/1.08')&&css.includes('font-size:21px')],
  ['authoritative typography tokens are used',css.includes('var(--font-space)')&&css.includes('var(--font-mono)')&&!css.includes('--font-space-grotesk')&&!css.includes('--font-plex-mono')],
  ['approved section title scale is present',css.includes('22px/1.15')&&css.includes('font-size:17px')],
  ['approved body and supporting text floors are present',css.includes('font-size:14px')&&css.includes('font-size:13px')&&css.includes('font-size:12px')&&css.includes('font-size:11px')],
  ['approved compact Up Next hierarchy is present',css.includes('border-radius:18px')&&css.includes('font:780 21px/1.18')&&css.includes('border-radius:20px')],
  ['four-column metrics collapse responsively',css.includes('grid-template-columns:repeat(4,minmax(0,1fr))')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')],
  ['desktop content uses approved approximate 65/35 split',css.includes('grid-template-columns:minmax(0,1.65fr) minmax(320px,.85fr)')],
  ['buttons preserve practical target and visual hierarchy',css.includes('min-height:46px')&&css.includes('border-radius:10px')&&css.includes('.buttonDark{background:var(--home-ink)')],
  ['shared visual palette uses Ink bronze sand and warm page',css.includes('--home-ink:#10131d')&&css.includes('--home-bronze:#8b641f')&&css.includes('--home-sand:#f5efe3')&&css.includes('--home-page:#f5f6f3')],
  ['focus and reduced motion contracts are present',css.includes('outline:3px solid var(--home-focus)')&&css.includes('prefers-reduced-motion:reduce')],
  ['Explore retains one primary and three secondary destinations',home.includes('Explore projects')&&home.includes('Recommended')&&home.includes('Opportunities')&&home.includes('Saved')&&explore.includes('.primary')&&explore.includes('.secondary')],
  ['visual matrix includes all acceptance widths',['phone-320','phone-360','phone-375','phone-390','phone-412','phone-430','tablet-768','tablet-1024','desktop-1280','desktop-1440','desktop-1920'].every(name=>visual.includes(name))],
  ['visual test retains 200 percent zoom and overflow protection',visual.includes("document.documentElement.style.fontSize='200%'")&&visual.includes('assertNoHorizontalOverflow')],
  ['visual test checks V4 hierarchy and Projects alignment',visual.includes('IMPORTANT UPDATES')&&visual.includes('Member overview')&&visual.includes('toHaveCount(4)')&&visual.includes('Projects content alignment')]
];

const failed=checks.filter(([,ok])=>!ok);
checks.forEach(([label,ok],index)=>console.log(`${ok?'PASS':'FAIL'} ${String(index+1).padStart(2,'0')}/${checks.length} ${label}`));
console.log(`\nMy Mettelo Member Home V4 audit: ${checks.length-failed.length}/${checks.length} checks passed.`);
if(failed.length)process.exit(1);
