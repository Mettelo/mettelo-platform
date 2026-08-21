import fs from 'node:fs';

const nav=fs.readFileSync('components/MetteloLabNavigation.tsx','utf8');
const css=fs.readFileSync('app/member/projects/[id]/phase15-mobile-more-ia.module.css','utf8');
const composed=fs.readFileSync('app/member/projects/[id]/phase4-mobile-fixes.module.css','utf8');

const checks=[
 ['mobile direct destinations remain Home Tasks Chat Data',/const mobile:Item\[\]=\[\{view:'home'.*\{view:'tasks'.*\{view:'chat'.*\{view:'data'/s.test(nav)],
 ['More contains Plan Proof Resources Events Team',/const more:Item\[\]=\[\{view:'plan'.*\{view:'proof'.*\.\.\.tools/s.test(nav)&&/const tools:Item\[\]=\[\{view:'resources'.*\{view:'events'.*\{view:'team'/s.test(nav)],
 ['secondary views keep More active',/const moreActive=active==='more'\|\|moreViews\.has\(active\)/.test(nav)],
 ['More communicates selected secondary destination',/aria-label=\{activeMoreItem\?`More, \$\{activeMoreItem\.label\} selected`:'More'\}/.test(nav)],
 ['More destinations preserve existing view routing',/href=\{hrefFor\(item\.view\)\}/.test(nav)&&/next\.set\('view',view\)/.test(nav)],
 ['More surface remains route-owned',/if\(active!=='more'\)return null/.test(nav)],
 ['More cards expose semantic destination hooks',/data-more-destination=\{item\.view\}/.test(nav)],
 ['Phase 15 layer is composed into Lab shell',/phase15-mobile-more-ia\.module\.css/.test(composed)],
 ['mobile navigation targets remain at least 58px',/min-height:58px/.test(css)],
 ['More cards stay bounded and naturally wrap',/max-width:100%/.test(css)&&/overflow-wrap:break-word/.test(css)],
 ['More becomes one column at narrow mobile widths',/@media\(max-width:360px\)[\s\S]*grid-template-columns:1fr/.test(css)],
 ['focus visibility is explicit',/focus-visible[\s\S]*outline:3px solid var\(--lab-shell-focus\)/.test(css)],
 ['shared shell tokens are used',/var\(--lab-shell-(?:surface|sand|ink|muted|border|focus)/.test(css)],
 ['Phase 15 introduces no hard-coded hex colours',!/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/.test(css)],
 ['Phase 15 introduces no fixed positioning',!/position:\s*fixed/.test(css)],
];

let failed=0;
for(const [label,pass] of checks){console.log(`${pass?'PASS':'FAIL'} Phase 15 mobile More: ${label}`);if(!pass)failed++;}
if(failed){console.error(`Phase 15 mobile More audit failed: ${failed} check(s).`);process.exit(1)}
console.log(`Phase 15 mobile More audit passed: ${checks.length}/${checks.length}.`);
