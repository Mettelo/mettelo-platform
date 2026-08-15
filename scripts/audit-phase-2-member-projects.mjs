import fs from 'node:fs';

const checks=[
  ['app/member/profile/page.tsx',['ProfileReturnAfterSave','MemberProfileSection']],
  ['components/MemberProfileSection.tsx',['Profile completeness','improve project matching','Project availability','Preview public profile']],
  ['components/ProfileReturnAfterSave.tsx',['mettelo:profile-updated','window.location.assign(next)']],
  ['app/projects/[id]/page.tsx',['What this project is solving','Know what you are committing to','AVAILABLE ROLES','EXPECTED PROOF','Application deadline','ProjectApplicationForm']],
  ['components/ProjectApplicationForm.tsx',['localStorage','Draft saved automatically','Complete these','REVIEW APPLICATION','Confirm & submit']],
  ['app/member/applications/page.tsx',['project_application_events','project_run_id','forming_deadline','MemberApplicationTracker']],
  ['components/MemberApplicationTracker.tsx',['WHAT THIS MEANS','WHAT HAPPENS NEXT','DO I NEED TO DO SOMETHING?','Application timeline','formationTrack']],
  ['app/api/project-applications/route.ts',['application_deadline','team_place_released','waiting_for_team']],
  ['supabase/migrations/20260816001500_phase2_project_application_events.sql',['project_application_events','record_project_application_event','members read own project application events']]
];
let failed=false;
for(const [file,needles] of checks){
  if(!fs.existsSync(file)){console.error(`Missing ${file}`);failed=true;continue;}
  const text=fs.readFileSync(file,'utf8');
  for(const needle of needles){if(!text.includes(needle)){console.error(`${file}: missing ${needle}`);failed=true;}}
}
if(failed)process.exit(1);
console.log('Phase 2 member/project deterministic audit passed.');
