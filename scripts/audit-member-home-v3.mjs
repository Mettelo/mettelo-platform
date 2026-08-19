import fs from 'node:fs';

const read=path=>fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const shell=read('components/MemberAppShell.tsx');
const nav=read('lib/member-navigation.ts');
const home=read('app/member/page.tsx');
const css=read('components/MemberAppShell.module.css');

const checks=[
  ['single member navigation source exists',Boolean(nav)&&shell.includes("from '@/lib/member-navigation'")],
  ['desktop My Work group preserves Home Projects Applications Proof Profile',nav.includes("label:'My Work'")&&['Home','Projects','Applications','Proof','Profile'].every(label=>nav.includes(`label:'${label}'`))],
  ['desktop Explore group preserves Discover Recommended Opportunities Saved Events',nav.includes("label:'Explore'")&&['Discover','Recommended','Opportunities','Saved','Events'].every(label=>nav.includes(`label:'${label}'`))],
  ['Spotlight remains a separate Reputation destination',nav.includes("label:'Reputation'")&&nav.includes("label:'Spotlight',href:'/member/spotlight'")],
  ['mobile persistent navigation is exactly Home Projects Discover Proof More',/mobilePersistentNav[\s\S]*label:'Home'[\s\S]*label:'Projects'[\s\S]*label:'Discover'[\s\S]*label:'Proof'[\s\S]*label:'More'/.test(nav)],
  ['mobile More preserves secondary member journey', ['Applications','Recommended','Opportunities','Saved','Events','Spotlight','Profile'].every(label=>nav.includes(`label:'${label}'`))],
  ['role tools are conditional on real lead or architect state',shell.includes("account?.hasLead")&&shell.includes("account?.accountType==='project_architect'")&&shell.includes("team_role','project_lead")],
  ['Home is server-authenticated',home.includes('createServerSupabaseClient')&&home.includes("redirect('/signin?next=/member')")],
  ['Home Up Next derives from real member state',home.includes('const upNext=nextTask?')&&home.includes('pendingSpotlight')&&home.includes('profileReady')&&home.includes('recommendationCount')],
  ['active work routes to Mettelo Lab',home.includes('Open Mettelo Lab')&&home.includes('labHref(')],
  ['Spotlight is conditional and consent-aware',home.includes("consent_status==='pending'")&&home.includes('{pendingSpotlight&&<section')&&home.includes('Declining does not affect your account')],
  ['Proof remains distinct professional evidence',home.includes('Evidence that travels with you')&&home.includes("href=\"/member/proof\"")],
  ['Home does not hardcode prototype member or project names',!home.includes('Johnson')&&!home.includes('Open Data Quality Monitor')&&!home.includes('Customer Insight Sprint')],
  ['profile progress exposes accessible semantics',home.includes('role="progressbar"')&&home.includes('aria-valuenow={profilePercent}')],
  ['mobile shell uses safe area and five columns',css.includes('grid-template-columns:repeat(5,minmax(0,1fr))')&&css.includes('env(safe-area-inset-bottom)')],
  ['required responsive ranges are explicit',css.includes('min-width:481px')&&css.includes('max-width:1024px')&&css.includes('max-width:480px')],
  ['reduced motion is respected',css.includes('prefers-reduced-motion:reduce')],
  ['member shell keeps visible focus contract',shell.includes('focus-visible')&&shell.includes('outline:3px solid #173f8f')]
];

let passed=0;
checks.forEach(([label,ok],index)=>{const prefix=String(index+1).padStart(2,'0');console.log(`${ok?'PASS':'FAIL'} ${prefix}/${checks.length} ${label}`);if(ok)passed+=1});
console.log(`\nMy Mettelo Member Home v3 audit: ${passed}/${checks.length} checks passed.`);
if(passed!==checks.length)process.exit(1);
