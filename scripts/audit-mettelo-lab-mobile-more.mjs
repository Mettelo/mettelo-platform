import fs from 'node:fs';

const nav=fs.readFileSync('components/MetteloLabNavigation.tsx','utf8');
const css=fs.readFileSync('app/member/projects/[id]/phase15-mobile-more-ia.module.css','utf8');
const polish=fs.readFileSync('app/member/projects/[id]/phase18-interaction-polish.module.css','utf8');
const composed=fs.readFileSync('app/member/projects/[id]/phase4-mobile-fixes.module.css','utf8');

const checks=[
 ['mobile direct destinations remain Home Tasks Chat Data',/const mobile:Item\[\]=\[\{view:'home'.*\{view:'tasks'.*\{view:'chat'.*\{view:'data'/s.test(nav)],
 ['More contains Plan Proof Resources Events Team',/const more:Item\[\]=\[\{view:'plan'.*\{view:'proof'.*\.\.\.tools/s.test(nav)&&/const tools:Item\[\]=\[\{view:'resources'.*\{view:'events'.*\{view:'team'/s.test(nav)],
 ['secondary views keep More active',/const moreActive=moreViews\.has\(active\)/.test(nav)],
 ['More communicates selected secondary destination',/aria-label=\{activeMoreItem\?`More, \$\{activeMoreItem\.label\} selected`:'More'\}/.test(nav)],
 ['More destinations preserve existing view URLs',/href=\{hrefFor\(item\.view\)\}/.test(nav)&&/url\.searchParams\.set\('view',view\)/.test(nav)],
 ['More is a controlled drop-up instead of a replacement route',nav.includes('labMoreTrigger')&&nav.includes('labMoreDropupPanel')&&nav.includes('aria-expanded={moreOpen}')&&nav.includes("if(placement==='more')return null")],
 ['More destinations expose semantic destination hooks',/data-more-destination=\{item\.view\}/.test(nav)],
 ['Phase 15 IA layer remains composed into Lab shell',/phase15-mobile-more-ia\.module\.css/.test(composed)],
 ['interaction polish layer owns the anchored drop-up',/phase18-interaction-polish\.module\.css/.test(composed)&&/\.labMoreDropupPanel/.test(polish)&&/position:fixed/.test(polish)],
 ['mobile navigation targets remain at least 58px',/min-height:58px/.test(css)&&/labMoreTrigger[\s\S]*min-height:58px/.test(polish)],
 ['drop-up links remain bounded and naturally wrap',/labMoreDropupPanel a[\s\S]*min-height:54px/.test(polish)&&/overflow-wrap:break-word/.test(polish)],
 ['focus visibility is explicit',/labMoreTrigger:focus-visible[\s\S]*outline:3px solid var\(--lab-shell-focus\)/.test(polish)],
 ['shared shell tokens are used',/var\(--lab-shell-(?:surface|ink|border|focus|bronze)/.test(polish)],
 ['Phase 15 base layer still introduces no hard-coded hex colours',!/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/.test(css)],
];

let failed=0;
for(const [label,pass] of checks){console.log(`${pass?'PASS':'FAIL'} Phase 15 mobile More: ${label}`);if(!pass)failed++;}
if(failed){console.error(`Phase 15 mobile More audit failed: ${failed} check(s).`);process.exit(1)}
console.log(`Phase 15 mobile More audit passed: ${checks.length}/${checks.length}.`);
