import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const layout=read('app/member/projects/[id]/layout.tsx');
const shellCss=read('app/member/projects/[id]/phase4-workspace.module.css');
const shellStabilisation=read('app/member/projects/[id]/phase3-shell-stabilisation.module.css');
const mobileFixes=read('app/member/projects/[id]/phase4-mobile-fixes.module.css');
const messagesCss=read('app/messages.css');
const navigation=read('components/MetteloLabNavigation.tsx');
const surface=read('components/MetteloLabViewSurface.tsx');
const home=read('components/MetteloLabPanel.tsx');
const homeCss=read('components/MetteloLabPanel.module.css');
const chat=read('components/ProjectMessagePanel.tsx');
const events=read('components/ProjectEventsPanel.tsx');
const eventApi=read('app/api/project-events/route.ts');
const memberShell=read('components/MemberAppShell.tsx');
const projectPage=read('app/member/projects/[id]/page.tsx');
const visualTest=read('tests/mettelo-lab-visual.spec.ts');
const failures=[];
const requireText=(name,text,needle)=>{if(!text.includes(needle))failures.push(`${name}: missing ${JSON.stringify(needle)}`)};
const forbidText=(name,text,needle)=>{if(text.includes(needle))failures.push(`${name}: stale or unsafe text ${JSON.stringify(needle)}`)};

if(fs.existsSync('components/MetteloLabClient.tsx'))failures.push('architecture: duplicate MetteloLabClient.tsx must not exist');
requireText('single Home implementation',projectPage,"import MetteloLabPanel from '@/components/MetteloLabPanel'");
requireText('single Home implementation',projectPage,'<MetteloLabPanel');
requireText('single Home styles',home,"import styles from './MetteloLabPanel.module.css'");
requireText('single Home styles',homeCss,'.metteloLab');

for(const token of ['--lab-ink:','--lab-muted:','--lab-border:','--lab-surface:','--lab-bronze:','--lab-focus:','--lab-radius-sm:','--lab-radius-lg:','--lab-space-2:','--lab-space-4:','--lab-target:'])requireText('Lab design tokens',homeCss,token);
for(const usage of ['var(--lab-border)','var(--lab-surface)','var(--lab-muted)','var(--lab-bronze)','var(--lab-focus)','var(--lab-radius-lg)','var(--lab-space-4)','var(--lab-target)'])requireText('Lab token consumption',homeCss,usage);
requireText('Lab target contract',homeCss,'--lab-target:44px');
forbidText('Lab focus contract',homeCss,'outline:none');

for(const token of ['--lab-shell-ink:','--lab-shell-surface:','--lab-shell-border:','--lab-shell-mobile-nav:70px'])requireText('Lab shell tokens',shellStabilisation,token);
for(const contract of ['overflow-x:clip','max-width:100%','Mettelo Lab workspace','Mettelo Lab project context','Mettelo Lab mobile navigation','orientation:landscape','safe-area-inset-bottom'])requireText('Lab shell containment',shellStabilisation,contract);
requireText('Lab shell attachment',mobileFixes,"composes:workspace from './phase3-shell-stabilisation.module.css'");

for(const contract of ['grid-template-rows:auto auto minmax(0,1fr) auto','position:relative!important','100dvh','overscroll-behavior:contain','max-height:min(22dvh,132px)','orientation:landscape'])requireText('Lab Chat layout architecture',mobileFixes,contract);
for(const stale of ['top:72px!important','bottom:calc(70px + env(safe-area-inset-bottom))!important','position:fixed!important'])forbidText('Lab Chat fixed viewport workaround',mobileFixes,stale);
requireText('Lab Chat feed owner',mobileFixes,'.messageFeed');
requireText('Lab Chat composer owner',mobileFixes,'.messageComposer');
for(const contract of ['grid-template-columns:minmax(0,1fr) 36px!important','grid-column:1!important','grid-column:2!important','writing-mode:horizontal-tb!important'])requireText('Lab Chat mobile message columns',mobileFixes,contract);

for(const contract of ['.messageMenu>summary{','width:34px;height:34px','position:absolute;right:0;bottom:calc(100% + 7px)','visibility:hidden','.messageMenu[open] .messageActions','word-break:normal','overflow-wrap:break-word','writing-mode:horizontal-tb','.messageBubble{width:min(72%,680px)','.messageFeed{display:flex;flex-direction:column;gap:12px'])requireText('Lab Chat refined message design',messagesCss,contract);
for(const contract of ['.messageMenu>summary{width:44px;height:44px','position:fixed;left:12px;right:12px','font-size:16px;resize:none'])requireText('Lab Chat mobile interaction design',messagesCss,contract);
forbidText('Lab Chat menu regression',messagesCss,'.messageActions{display:flex');

for(const label of ['Home','Plan','Tasks','Chat','Data','Proof','Resources','Events','Team'])requireText('desktop navigation',navigation,`label:'${label}'`);
for(const label of ['Home','Tasks','Chat','Data'])requireText('mobile navigation',navigation,`label:'${label}'`);
requireText('mobile navigation',navigation,"hrefFor('more')");
requireText('workspace identity',layout,'METTELO ECOSYSTEM');
requireText('workspace identity',layout,'Mettelo Lab');
forbidText('workspace identity',layout,'Project workspace');
requireText('routed screen surface',layout,'MetteloLabViewSurface');
requireText('routed screen surface',surface,'data-lab-view');
requireText('routed screen surface',shellCss,'data-lab-view="home"');
requireText('routed screen surface',shellCss,'data-lab-view="events"');
requireText('routed screen surface',shellCss,'data-lab-view="team"');
requireText('desktop prototype composition',shellCss,'grid-template-columns:238px minmax(0,1fr) 286px');
requireText('desktop prototype composition',shellCss,'.rightRail');
for(const width of ['1180','1024','480','390','375'])requireText('responsive shell',shellCss,`max-width:${width}px`);
requireText('responsive shell',shellCss,'.mobileNav');
requireText('responsive shell',shellCss,'safe-area-inset-bottom');
requireText('single Lab navigation',memberShell,'isProjectLab');
requireText('single Lab navigation',memberShell,"!isProjectLab&&<nav className={styles.bottomNav}");
requireText('Home',home,'METTELO LAB / HOME');
requireText('Home',home,'UP NEXT');
requireText('Home',home,'data-lab-home-section');
requireText('Team privacy',home,'YOUR TEAM');
requireText('Team privacy',home,'data-lab-team-section');
for(const stale of ['lockedCohort','cohortSwitcher','Not a member','People working on this project'])forbidText('Team privacy',home,stale);
requireText('Chat',chat,'Project Chat');
requireText('Chat',chat,'messageMenu');
requireText('Chat',chat,'Write a message…');
for(const stale of ['Project conversation','Start the project conversation.'])forbidText('Chat terminology',chat,stale);
requireText('Events',events,'METTELO LAB / EVENTS');
requireText('Events',events,'NEXT EVENT');
requireText('Events',events,'Mettelo Video');
requireText('Events',events,'External Meeting');
requireText('Events',events,'5 · Review & schedule');
requireText('Events API',eventApi,"meetingMode==='external'");
requireText('Events API',eventApi,"parsed.protocol!=='https:'");
requireText('Events API',eventApi,"provider=meetingMode==='external'?'external':'livekit'");
for(const width of ['320','360','375','390','412','414','430','768','1024','1440'])requireText('Chromium viewport coverage',visualTest,`width:${width}`);
for(const screen of ['home','plan','tasks','chat','data','proof','resources','events','team'])requireText('Chromium screen coverage',visualTest,`'${screen}'`);
requireText('Chromium zoom coverage',visualTest,"fontSize='200%'");

if(failures.length){console.error('Mettelo Lab workspace audit failed:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1)}
console.log('Mettelo Lab workspace audit passed.');