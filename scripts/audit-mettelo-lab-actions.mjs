import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const failures=[];
const requireText=(name,text,needle)=>{if(!text.includes(needle))failures.push(`${name}: missing ${JSON.stringify(needle)}`)};
const requireFile=(file)=>{if(!fs.existsSync(file))failures.push(`Missing server route: ${file}`)};

const delivery=read('components/ProjectDeliveryControls.tsx');
const taskStatus=read('components/TaskStatusControl.tsx');
const data=read('components/DataNativeWorkspace.tsx');
const collaboration=read('components/ProjectCollaborationPanel.tsx');
const chat=read('components/ProjectMessagePanel.tsx');
const proof=read('components/ContributionForm.tsx');
const events=read('components/ProjectEventsPanel.tsx');
const eventApi=read('app/api/project-events/route.ts');
const eventMigration=read('supabase/migrations/20260821213000_lab_event_visibility_and_publication.sql');

for(const file of [
  'app/api/project-delivery/route.ts',
  'app/api/project-task-history/route.ts',
  'app/api/project-data-workspace/route.ts',
  'app/api/project-collaboration/route.ts',
  'app/api/project-message-links/route.ts',
  'app/api/contributions/route.ts',
  'app/api/project-events/route.ts',
  'app/api/project-events/[id]/token/route.ts'
])requireFile(file);

for(const token of ["fetch('/api/project-delivery'","method:'POST'",'response.ok'])requireText('Delivery create contract',delivery,token);
for(const token of ["fetch('/api/project-delivery'","method:'PATCH'",'/api/project-task-history?task_id=','response.ok'])requireText('Task mutation/history contract',taskStatus,token);
for(const token of ["fetch('/api/project-data-workspace'","action==='data_source'","action==='workstream'","action==='deliverable'",'deliverable_status','data_source_status','workstream_update','response.ok'])requireText('Data workspace contract',data,token);
for(const token of ["fetch('/api/project-collaboration'","send('resource'","send('book_presentation'","send('presentation_status'",'response.ok'])requireText('Resource/presentation contract',collaboration,token);
for(const token of ["fetch('/api/project-collaboration'",'/api/project-message-links','discussion_edit','discussion_pin','discussion_classify','discussion_delete','response.ok'])requireText('Chat mutation contract',chat,token);
for(const token of ["fetch('/api/contributions'","method:'POST'",'response.ok'])requireText('Proof submission contract',proof,token);
for(const token of ["fetch('/api/project-events'","send('create'","send('update'","send('cancel'","send('restrict'","send('review'",'/member/events/${','response.ok'])requireText('Lab event UI contract',events,token);

for(const token of [
  'grant select on table public.project_meetings to authenticated',
  'source_project_meeting_id',
  "new.visibility not in ('community_learning','approval_required')",
  "new.event_type not in ('learning_session','final_presentation')",
  "delete from public.events where source_project_meeting_id = new.id",
  "'project_learning'",
  "'project_showcase'",
  "'/member/events?event='",
  "status in ('published','registration_closed','completed','cancelled')"
])requireText('Event visibility/RLS contract',eventMigration,token);

const publicInsert=eventMigration.slice(eventMigration.indexOf('insert into public.events'),eventMigration.indexOf('on conflict (id)'));
for(const privateField of ['join_url','provider_room_name','project_run_id','organiser_user_id'])if(publicInsert.includes(privateField))failures.push(`Public event projection leaks private field ${privateField}`);

for(const token of [
  'eligibilityError',
  'createError',
  'participantError',
  'updateError',
  'cancelError',
  'restrictError',
  'registrationError',
  'cancelRegistrationError',
  'offerError',
  'acceptError',
  'decisionError',
  'eventError'
])requireText('Event persistence error handling',eventApi,token);

if(eventApi.indexOf('const participantRows')>eventApi.indexOf("from('project_meetings').insert"))failures.push('Event creation validates participants only after inserting the event');
if(!eventApi.includes("if(participantError){await ctx.db.from('project_meetings').delete().eq('id',eventId);throw participantError;}"))failures.push('Event participant failure lacks compensating event rollback');

if(failures.length){console.error('Mettelo Lab action audit failed:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1)}
console.log('Mettelo Lab action audit passed: critical buttons/forms retain server mutations, persistence checks and governed event visibility.');
