import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const mobile=read('app/member/projects/[id]/phase4-mobile-fixes.module.css');
const tasksCss=read('app/member/projects/[id]/phase10-tasks-harmonisation.module.css');
const statusControl=read('components/TaskStatusControl.tsx');
const deliveryControls=read('components/ProjectDeliveryControls.tsx');
const failures=[];
const requireText=(name,text,needle)=>{if(!text.includes(needle))failures.push(`${name}: missing ${JSON.stringify(needle)}`)};
const forbidText=(name,text,needle)=>{if(text.includes(needle))failures.push(`${name}: unsafe ${JSON.stringify(needle)}`)};

requireText('Phase 10 attachment',mobile,"composes:tasksExperience from './phase10-tasks-harmonisation.module.css'");
for(const contract of [
  '[data-lab-view="tasks"] #workstreams',
  '[data-lab-view="tasks"] #deliverables',
  '[data-lab-view="tasks"] #delivery',
  'grid-template-columns:minmax(0,1fr) minmax(180px,230px)',
  '.taskStatusControl',
  'min-height:44px',
  'outline:3px solid var(--lab-shell-focus)',
  'overflow-wrap:break-word',
  'font-size:16px',
  '@media(max-width:800px)',
  '@media(max-width:480px)',
  'prefers-reduced-motion:reduce'
])requireText('Phase 10 Tasks UX',tasksCss,contract);
for(const token of ['var(--lab-shell-border)','var(--lab-shell-surface)','var(--lab-shell-surface-muted)','var(--lab-shell-ink)','var(--lab-shell-focus)','var(--lab-shell-bronze)'])requireText('Phase 10 token usage',tasksCss,token);
forbidText('Phase 10 viewport safety',tasksCss,'position:fixed');
forbidText('Phase 10 wrapping',tasksCss,'overflow-wrap:anywhere');

for(const contract of [
  "fetch('/api/project-delivery'",
  "fetch(`/api/project-task-history?task_id=",
  "todo:['todo','in_progress','blocked']",
  "in_progress:['in_progress','blocked','ready_for_review']",
  "ready_for_review:['ready_for_review','in_progress','done']",
  'Why is this task blocked?',
  'What needs to change?',
  'View activity'
])requireText('Task behaviour preservation',statusControl,contract);
for(const contract of ["fetch('/api/project-delivery'","resource==='task'?'todo'",'Assigned owner','Acceptance criteria','Due date'])requireText('Task creation preservation',deliveryControls,contract);

if(failures.length){console.error('Mettelo Lab Tasks audit failed:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1)}
console.log('Mettelo Lab Tasks audit passed.');
