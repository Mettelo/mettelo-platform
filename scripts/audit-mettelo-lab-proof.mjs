import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const mobile=read('app/member/projects/[id]/phase4-mobile-fixes.module.css');
const proofCss=read('app/member/projects/[id]/phase12-proof-harmonisation.module.css');
const submit=read('components/ContributionForm.tsx');
const review=read('components/ProjectContributionReview.tsx');
const failures=[];
const requireText=(name,text,needle)=>{if(!text.includes(needle))failures.push(`${name}: missing ${JSON.stringify(needle)}`)};
const forbidText=(name,text,needle)=>{if(text.includes(needle))failures.push(`${name}: unsafe ${JSON.stringify(needle)}`)};

requireText('Phase 12 attachment',mobile,"composes:proofExperience from './phase12-proof-harmonisation.module.css'");
for(const contract of [
  '[data-lab-view="proof"] #proof',
  '.evidenceLedger',
  '.ledgerOption',
  '.applicationQueue',
  '.applicationReview',
  '.reviewLedger',
  '.reviewActions',
  'min-height:44px',
  'outline:3px solid var(--lab-shell-focus)',
  'overflow-wrap:break-word',
  'font-size:16px',
  '@media(max-width:800px)',
  '@media(max-width:480px)',
  'prefers-reduced-motion:reduce'
])requireText('Phase 12 Proof UX',proofCss,contract);
for(const token of ['var(--lab-shell-border)','var(--lab-shell-surface)','var(--lab-shell-surface-muted)','var(--lab-shell-ink)','var(--lab-shell-focus)','var(--lab-shell-bronze)'])requireText('Phase 12 token usage',proofCss,token);
if(/#[0-9a-f]{3,8}\b/i.test(proofCss))failures.push('Phase 12 token usage: hard-coded hex colours are not allowed');
forbidText('Phase 12 viewport safety',proofCss,'position:fixed');
forbidText('Phase 12 wrapping',proofCss,'overflow-wrap:anywhere');

for(const contract of ["fetch('/api/contributions'",'evidence_links','Submit for verification','is_public'])requireText('Proof submission preservation',submit,contract);
for(const contract of ["fetch('/api/project-contributions'",'needs_changes','verified','rejected','Reviewer notes','Linked workspace evidence'])requireText('Proof review preservation',review,contract);

if(failures.length){console.error('Mettelo Lab Proof audit failed:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1)}
console.log('Mettelo Lab Proof audit passed.');
