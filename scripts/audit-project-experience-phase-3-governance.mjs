import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const checks=[];
function expect(name,condition){checks.push({name,ok:Boolean(condition)});}

const schema=read('supabase/migrations/20260905123000_project_experience_phase_3_canonical_project_governance.sql');
const atomic=read('supabase/migrations/20260905123500_project_experience_phase_3_atomic_participation_revision.sql');
const helper=read('lib/project-participation.ts');
const draftRoute=read('app/api/architect-projects/[id]/route.ts');
const revisionRoute=read('app/api/architect-projects/[id]/revision/route.ts');
const adminRoute=read('app/api/admin/project-governance/route.ts');
const formationRoute=read('app/api/cron/project-formation/route.ts');

for(const column of ['participation_mode','min_team_size','target_team_size','max_team_size']){
  expect(`schema adds ${column}`,schema.includes(`add column if not exists ${column}`));
}
expect('participation mode database constraint',schema.includes("participation_mode in ('solo','team','flexible')"));
expect('capacity ordering database constraint',schema.includes('min_team_size <= target_team_size')&&schema.includes('target_team_size <= max_team_size'));
expect('solo invariant',schema.includes("participation_mode = 'solo'")&&schema.includes('min_team_size = 1'));
expect('team minimum invariant',schema.includes("participation_mode = 'team' and min_team_size >= 2"));
expect('flexible minimum invariant',schema.includes("participation_mode = 'flexible' and min_team_size = 1"));
expect('legacy threshold backfill preserved',schema.includes('coalesce(team_size_threshold, 5)'));
expect('compatibility trigger exists',schema.includes('sync_project_participation_contract'));
expect('readiness blocks participation capacity',schema.includes("then 'participation_capacity' end"));
expect('readiness blocks threshold divergence',schema.includes("then 'formation_threshold_alignment' end"));
expect('readiness remains security invoker',schema.includes('with (security_invoker=true)'));

expect('atomic revision signature preserved',atomic.includes('apply_project_experience_draft_revision('));
expect('atomic revision remains security definer',atomic.includes('security definer')&&atomic.includes('set search_path=public'));
expect('atomic revision updates canonical project row',atomic.includes('participation_mode=participation_value')&&atomic.includes('team_size_threshold=min_value'));
expect('atomic audit records participation',atomic.includes("'participation_mode',participation_value")&&atomic.includes("'max_team_size',max_value"));
expect('atomic RPC remains private',atomic.includes('revoke all on function public.apply_project_experience_draft_revision')&&atomic.includes('to service_role,postgres'));

expect('shared parser supports all modes',['solo','team','flexible'].every(mode=>helper.includes(`'${mode}'`)));
expect('shared parser keeps threshold equal to minimum',helper.includes('team_size_threshold:min'));
expect('shared validation enforces team minimum',helper.includes("participation_mode==='team'&&value.min_team_size<2"));
expect('shared validation enforces flexible minimum',helper.includes("participation_mode==='flexible'&&value.min_team_size!==1"));

expect('draft GET exposes canonical participation',draftRoute.includes('participation_mode,min_team_size,target_team_size,max_team_size'));
expect('revision PATCH uses shared participation validation',revisionRoute.includes('parseProjectParticipation')&&revisionRoute.includes('validateProjectParticipation'));
expect('legacy edit clients preserve canonical values',revisionRoute.includes('participationSource=body.participation_mode?body:'));
expect('revision payload persists canonical participation',revisionRoute.includes('...participation'));
expect('Admin queue API exposes participation',adminRoute.includes('participation_mode,min_team_size,target_team_size,max_team_size'));
expect('Admin approval still gates on publication readiness',adminRoute.includes("select('publication_ready,missing_requirements,publication_blockers,resource_governance_ready')"));

expect('formation runtime still uses legacy threshold contract',formationRoute.includes('team-size threshold')||formationRoute.includes('team_size_threshold'));
expect('Phase 3 does not introduce a second project table',!schema.includes('create table public.projects_v2'));

const failed=checks.filter(check=>!check.ok);
for(const check of checks)console.log(`${check.ok?'PASS':'FAIL'} ${check.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Phase 3 governance checks passed.`);
if(failed.length)process.exit(1);
