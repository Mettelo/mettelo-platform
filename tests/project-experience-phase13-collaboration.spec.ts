import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const chat=read('components/ProjectMessagePanel.tsx');
const collaboration=read('app/api/project-collaboration/route.ts');
const collaborationPanel=read('components/ProjectCollaborationPanel.tsx');
const eventsPanel=read('components/ProjectEventsPanel.tsx');
const eventsApi=read('app/api/project-events/route.ts');
const delivery=read('app/api/project-delivery/route.ts');
const notifications=read('lib/notifications.ts');
const packageJson=read('package.json');

const cases:[string,boolean][]=[
 ['Phase 13 reuses the existing project Chat surface',chat.includes('Project Chat')&&collaboration.includes("from('project_discussions')")],
 ['Chat composer supports Update Question Blocker and Decision as first-class message types',chat.includes("type ChatMessageType='update'|'question'|'blocker'|'decision'")&&chat.includes('id="project-message-type"')&&chat.includes('message_type:type')],
 ['Chat keeps canonical @username mention identity',chat.includes('member.username?`@${member.username}`')&&chat.includes('Type @ to mention')],
 ['mentions are restricted to active members of the exact project run',collaboration.includes(".eq('project_id',projectId).eq('project_run_id',runId).eq('membership_status','active').in('user_id',mentions)")],
 ['mentions use the dedicated canonical communication preference key',collaboration.includes("type:'project_mention',eventKey:'project_mention'")&&collaboration.includes('email:await emailFor(db,mentioned)')],
 ['ordinary Chat messages do not notify or email the whole team',!collaboration.includes("eventKey:'project_mention',title:'New project message'")],
 ['completed project Chat remains readable but collaboration writes require active membership',collaboration.includes("const canReadHistory=ctx.membership?.membership_status==='active'||ctx.membership?.membership_status==='completed'")&&collaboration.includes("const activeMember=ctx.membership?.membership_status==='active'")],
 ['completed Lab collaboration controls are read only in the frontend',collaborationPanel.includes("const collaborationWritable=['active','review'].includes(props.projectStatus)")&&collaborationPanel.includes('This project run is complete. Collaboration history remains available')],
 ['editing a message only notifies newly added mentions',collaboration.includes('newlyMentioned=mentions.filter')&&collaboration.includes("action==='discussion_edit'&&newlyMentioned.length")],
 ['existing project Events surface is reused',eventsPanel.includes("fetch('/api/project-events'")&&eventsApi.includes("from('project_meetings')")],
 ['existing Events support schedule edit cancel and join',eventsPanel.includes("send('update'")&&eventsPanel.includes("send('cancel'")&&eventsPanel.includes('Join event')&&eventsApi.includes("action==='create'")&&eventsApi.includes("action==='update'")&&eventsApi.includes("action==='cancel'")],
 ['Events retain purpose time platform and governed participation fields',eventsPanel.includes('Purpose')&&eventsPanel.includes('Starts')&&eventsPanel.includes('Timezone')&&eventsPanel.includes('meetingMode')&&eventsApi.includes('project_event_participants')],
 ['ordinary Event mutations require an open delivery run and active member',eventsApi.includes("const deliveryOpen=ctx.runStatus==='active'||ctx.runStatus==='review'")&&eventsApi.includes("const activeMember=ctx.membership?.membership_status==='active'")&&eventsApi.includes('Completed project events are read-only.')],
 ['Event participants are validated as active members of the exact project run',eventsApi.includes(".eq('project_id',projectId).eq('project_run_id',runId).eq('membership_status','active').in('user_id',requested)")],
 ['Event schedule and changes use canonical preference-aware communication',eventsApi.includes('notifyActiveTeam')&&eventsApi.includes("type:'event_changed',eventKey:'event_changed'")&&eventsApi.includes('email:await emailFor(db,member.user_id)')&&eventsApi.includes("title:'Project event updated'")&&eventsApi.includes("title:'Project event cancelled'")],
 ['existing task delivery system is reused rather than duplicated',delivery.includes("from('project_tasks')")&&delivery.includes('assignee_user_id')&&delivery.includes('milestone_id')&&delivery.includes('evidence_url')&&delivery.includes("status==='blocked'")],
 ['canonical notification preferences independently govern in-app and email delivery',notifications.includes("from('notification_preferences')")&&notifications.includes("event_key',eventKey")&&notifications.includes('preference.inApp')&&notifications.includes('preference.email')],
 ['Phase 13 collaboration contract is part of the blocking regression suite',packageJson.includes('tests/project-experience-phase13-collaboration.spec.ts')]
];

for(const [label,ok] of cases){test(label,()=>expect(ok).toBeTruthy())}
