import fs from 'node:fs';
const migration=fs.readFileSync('supabase/migrations/20260812210000_phase_6_governed_project_events.sql','utf8');
const api=fs.readFileSync('app/api/project-events/route.ts','utf8');
const token=fs.readFileSync('app/api/project-events/[id]/token/route.ts','utf8');
const panel=fs.readFileSync('components/ProjectEventsPanel.tsx','utf8');
const checks={
 projectRunScope:/project_run_id uuid not null/.test(migration),
 eventTypes:['team_working_session','project_review','final_presentation','learning_session'].every(value=>migration.includes(value)&&api.includes(value)),
 eventOnlyRegistration:migration.includes('must never be treated as project membership')&&!api.includes("from('project_members').insert"),
 waitlist:['waitlisted','offered','accept_offer','offered_until'].every(value=>api.includes(value)||migration.includes(value)),
 immutableReview:migration.includes('unique(event_id)')&&api.includes('already has a formal outcome'),
 noSelfReview:migration.includes('A presenter cannot review their own project event'),
 shortToken:token.includes("ttl:'10m'"),
 joinWindow:token.includes('15*60*1000')&&token.includes('30*60*1000'),
 noRecording:panel.includes('Formal independent review')&&fs.readFileSync('components/ProjectVideoRoom.tsx','utf8').includes('Recording and transcription are disabled'),
 mobileTargets:/min-height:\s*44px/.test(panel)
};
const failed=Object.entries(checks).filter(([,ok])=>!ok);console.log(JSON.stringify(checks,null,2));if(failed.length){console.error(`Phase 6 audit failed: ${failed.map(([name])=>name).join(', ')}`);process.exit(1)}console.log('Phase 6 governed-event audit passed.');
