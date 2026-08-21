import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const mobile=read('app/member/projects/[id]/phase4-mobile-fixes.module.css');
const eventsCss=read('app/member/projects/[id]/phase14-events-harmonisation.module.css');
const events=read('components/ProjectEventsPanel.tsx');
const failures=[];
const requireText=(name,text,needle)=>{if(!text.includes(needle))failures.push(`${name}: missing ${JSON.stringify(needle)}`)};
const forbidText=(name,text,needle)=>{if(text.includes(needle))failures.push(`${name}: unsafe ${JSON.stringify(needle)}`)};

requireText('Phase 14 attachment',mobile,"composes:eventsExperience from './phase14-events-harmonisation.module.css'");
for(const contract of [
  '[data-lab-view="events"] #meetings',
  '.nextEventCard',
  '.projectEventCard',
  '.projectEventActions',
  '.eventJourneyForm',
  '.journeyCard',
  'min-height:44px',
  'outline:3px solid var(--lab-shell-focus)',
  'overflow-wrap:break-word',
  'font-size:16px',
  '@media(max-width:800px)',
  '@media(max-width:480px)',
  'prefers-reduced-motion:reduce'
])requireText('Phase 14 Events UX',eventsCss,contract);
for(const token of ['var(--lab-shell-border)','var(--lab-shell-surface)','var(--lab-shell-surface-muted)','var(--lab-shell-ink)','var(--lab-shell-focus)','var(--lab-shell-bronze)'])requireText('Phase 14 token usage',eventsCss,token);
if(/#[0-9a-f]{3,8}\b/i.test(eventsCss))failures.push('Phase 14 token usage: hard-coded hex colours are not allowed');
forbidText('Phase 14 viewport safety',eventsCss,'position:fixed');
forbidText('Phase 14 wrapping',eventsCss,'overflow-wrap:anywhere');

for(const contract of [
  "fetch('/api/project-events'",
  "send('create'",
  "send('restrict'",
  "send('cancel'",
  "send('update'",
  "send('review'",
  '/member/events/${',
  'linked_milestone_id',
  'linked_deliverable_id',
  'presenter_ids',
  'required_attendee_ids',
  "meetingMode==='mettelo_video'"
])requireText('Event behaviour preservation',events,contract);

if(failures.length){console.error('Mettelo Lab Events audit failed:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1)}
console.log('Mettelo Lab Events audit passed.');
