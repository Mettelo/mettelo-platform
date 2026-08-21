import fs from 'node:fs';

const read=path=>fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const nav=read('components/MetteloLabNavigation.tsx');
const view=read('components/MetteloLabViewSurface.tsx');
const collaboration=read('components/ProjectCollaborationPanel.tsx');
const chat=read('components/ProjectMessagePanel.tsx');
const css=read('app/member/projects/[id]/phase18-interaction-polish.module.css');
const regressions=read('app/member/projects/[id]/phase18-reported-regressions.module.css');
const composition=read('app/member/projects/[id]/phase4-mobile-fixes.module.css');
const layout=read('app/member/projects/[id]/layout.tsx');
const qa=read('tests/mettelo-lab-device-qa.spec.ts');

const checks=[
 ['instant Lab navigation uses local History API instead of a required router round trip',nav.includes('window.history.pushState')&&nav.includes('mettelo-lab-view-change')&&view.includes('mettelo-lab-view-change')],
 ['Chat mounts on first visit and preserves local state across Lab view switches',collaboration.includes('mettelo-lab-view-change')&&collaboration.includes('chatActivated&&<ProjectMessagePanel')&&collaboration.includes("if(next==='chat')setChatActivated(true)")],
 ['navigation preserves real hrefs for modified-click and deep-link behaviour',nav.includes('<Link href={hrefFor(item.view)}')&&nav.includes('isPlainClick(event)')],
 ['navigation exposes visible and accessible pending feedback',nav.includes('data-pending')&&nav.includes('role="status"')&&css.includes('[data-pending="true"]::after')],
 ['mobile More is a controlled drop-up rather than view=more navigation',nav.includes('labMoreTrigger')&&nav.includes('labMoreDropupPanel')&&nav.includes('aria-expanded={moreOpen}')&&nav.includes("if(placement==='more')return null")],
 ['legacy More URLs normalize to a visible Home surface',nav.includes("if(raw==='more')return'home'")&&view.includes("if(raw==='more')return'home'")],
 ['mobile More closes on outside pointer and Escape',nav.includes("document.addEventListener('pointerdown',pointer)")&&nav.includes("event.key==='Escape'")&&nav.includes('setMoreOpen(false)')],
 ['Chat actions use controlled open state',chat.includes('openMenuId')&&chat.includes('messageMenuTrigger')&&chat.includes('aria-expanded={menuOpen}')],
 ['Chat actions close on outside pointer and Escape',chat.includes("target?.closest('.messageMenu')")&&chat.includes("event.key==='Escape'")&&chat.includes('setOpenMenuId(null)')],
 ['Chat mutations and linking APIs remain preserved',chat.includes('async function post(action:string')&&chat.includes("mutate(item,'discussion_pin'")&&chat.includes("mutate(item,'discussion_classify'")&&chat.includes("mutate(item,'discussion_delete'")&&chat.includes("fetch('/api/project-message-links'")],
 ['validated mobile Chat viewport ownership remains in Phase 4',composition.includes('--lab-chat-member-header:62px')&&composition.includes('var(--lab-shell-mobile-nav)')&&composition.includes('grid-template-rows:auto auto minmax(0,1fr) auto')&&composition.includes('position:relative!important')],
 ['Chat feed owns scrolling while composer remains in flow',composition.includes('.messageFeed')&&composition.includes('overflow-y:auto!important')&&composition.includes('.messageComposer')&&composition.includes('position:relative!important')],
 ['message action popover remains compact while preserving 44px targets',css.includes('width:min(244px')&&css.includes('min-height:44px')],
 ['Data generated heading content is disabled',css.includes('data-lab-view="data"')&&css.includes('content:none!important')&&css.includes('display:none!important')],
 ['Lab Back action always returns to My Mettelo projects',view.includes('data-lab-back')&&view.includes('href="/member#projects"')&&regressions.includes('[data-lab-view]>.actions>a:first-child')],
 ['Proof generated heading content is disabled',regressions.includes('data-lab-view="proof"')&&regressions.includes('.eyebrow)::before')&&regressions.includes('content:none!important')],
 ['Event journey legends remain semantic and move inside card flow',regressions.includes('.journeyCard>legend')&&regressions.includes('float:left')&&regressions.includes('.journeyCard>legend+*')&&regressions.includes('clear:both')],
 ['interaction polish layers attach at the Lab workspace root without replacing Phase 4 geometry',layout.includes("import interactionPolish from './phase18-interaction-polish.module.css'")&&layout.includes("import reportedRegressions from './phase18-reported-regressions.module.css'")&&layout.includes('${interactionPolish.interactionPolish}')&&layout.includes('${reportedRegressions.reportedRegressions}')],
 ['device QA enforces local view timing',qa.includes('toBeLessThan(750)')&&qa.includes('local Lab view switch should not wait for a server reload')],
 ['device QA checks drop-up, composer visibility and compact actions',qa.includes('Mettelo Lab More is an anchored drop-up')&&qa.includes('toBeInViewport()')&&qa.includes('Message actions remains compact')],
 ['device QA covers Back Proof and permission-aware Events regressions',qa.includes('Reported Back and Proof regressions stay fixed on mobile')&&qa.includes('Events legends stay in card flow for a lead-capable user')&&qa.includes('Back to My Mettelo')&&qa.includes('CONTRIBUTION LEDGER · PROOF')&&qa.includes('.journeyCard>legend')],
 ['interaction polish uses authoritative typography tokens',css.includes('var(--font-space)')&&css.includes('var(--font-mono)')&&!css.includes('--font-space-grotesk')&&!css.includes('--font-plex-mono')],
 ['interaction polish introduces no hard-coded hex colours',!/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/.test(css)],
 ['no interaction polish fixed-position composer regression',!/messageComposer[\s\S]{0,180}position:fixed!important/.test(css)]
];

let passed=0;
for(const [index,[label,ok]] of checks.entries()){console.log(`${ok?'PASS':'FAIL'} ${String(index+1).padStart(2,'0')}/${checks.length} ${label}`);if(ok)passed+=1}
console.log(`\nMettelo Lab interaction polish audit: ${passed}/${checks.length} checks passed.`);
if(passed!==checks.length)process.exit(1);
