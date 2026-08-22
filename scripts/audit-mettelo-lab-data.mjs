import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const mobile=read('app/member/projects/[id]/phase4-mobile-fixes.module.css');
const dataCss=read('app/member/projects/[id]/phase11-data-harmonisation.module.css');
const polish=read('app/member/projects/[id]/phase18-interaction-polish.module.css');
const workspace=read('components/DataNativeWorkspace.tsx');
const failures=[];
const requireText=(name,text,needle)=>{if(!text.includes(needle))failures.push(`${name}: missing ${JSON.stringify(needle)}`)};
const forbidText=(name,text,needle)=>{if(text.includes(needle))failures.push(`${name}: unsafe ${JSON.stringify(needle)}`)};

requireText('Phase 11 attachment',mobile,"composes:dataExperience from './phase11-data-harmonisation.module.css'");
for(const contract of [
  '[data-lab-view="data"] #data-sources',
  'font-size:clamp(1.85rem,3.6vw,3rem)',
  'grid-template-columns:minmax(0,1fr) minmax(210px,280px)',
  '.dataRecordHead',
  '.recordFacts',
  '.workspaceComposer>summary',
  'min-height:48px',
  'min-height:44px',
  'outline:3px solid var(--lab-shell-focus)',
  'overflow-wrap:break-word',
  'font-size:16px',
  '@media(max-width:800px)',
  '@media(max-width:480px)'
])requireText('Phase 11 Data UX',dataCss,contract);
for(const token of ['var(--lab-shell-border)','var(--lab-shell-border-strong)','var(--lab-shell-surface)','var(--lab-shell-surface-muted)','var(--lab-shell-ink)','var(--lab-shell-focus)','var(--lab-shell-bronze)'])requireText('Phase 11 token usage',dataCss,token);
if(/#[0-9a-f]{3,8}\b/i.test(dataCss))failures.push('Phase 11 token usage: hard-coded hex colours are not allowed');
forbidText('Phase 11 viewport safety',dataCss,'position:fixed');
forbidText('Phase 11 wrapping',dataCss,'overflow-wrap:anywhere');
requireText('Data heading hardening',polish,'[data-lab-view="data"] #data-sources>.sectionHead .eyebrow');
requireText('Data heading hardening',polish,'content:none!important');
requireText('Data heading hardening',polish,'display:none!important');

for(const contract of [
  "fetch('/api/project-data-workspace'",
  "action==='data_source'",
  "updateDataSource(item,'access_status','granted')",
  "updateDataSource(item,'quality_status','approved')",
  'Links only. Never add passwords, API keys or private credentials.',
  'No data source registered yet.',
  'Add a linked data source',
  'External HTTPS URL *',
  'Known limitations',
  '<div className="eyebrow">DATA SOURCES</div>'
])requireText('Data behaviour preservation',workspace,contract);

if(failures.length){console.error('Mettelo Lab Data audit failed:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1)}
console.log('Mettelo Lab Data audit passed.');
