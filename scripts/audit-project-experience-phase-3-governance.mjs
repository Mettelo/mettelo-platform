import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const checks=[];
function expect(name,condition){checks.push({name,ok:Boolean(condition)});}

const schema=read('supabase/migrations/20260905123000_project_experience_phase_3_canonical_project_governance.sql');
const atomic=read('supabase/migrations/20260905123500_project_experience_phase_3_atomic_participation_revision.sql');
const focusedAtomic=read('supabase/migrations/20260905124500_project_participation_atomic_revision.sql');
const phase9Hardening=read('supabase/migrations/20260906002000_project_experience_phase_9_participation_hardening.sql');
const helper=read('lib/project-participation.ts');
const createRoute=read('app/api/architect-projects/route.ts');
const draftRoute=read('app/api/architect-projects/[id]/route.ts');
const revisionRoute=read('app/api/architect-projects/[id]/revision/route.ts');
const participationRoute=read('app/api/architect-projects/[id]/participation/route.ts');
const adminRoute=read('app/api/admin/project-governance/route.ts');
const creator=read('components/ArchitectProjectForm.tsx');
const editorPanel=read('components/ArchitectProjectParticipationPanel.tsx');
const editorPage=read('app/member/architect-projects/[id]/edit/page.tsx');
const adminSummary=read('components/AdminProjectParticipationSummary.tsx');
const adminPage=read('app/admin/project-governance/page.tsx');
const formationRoute=read('app/api/cron/project-formation/route.ts');

for(const column of ['participation_mode','min_team_size','target_team_size','max_team_size'])expect(`schema adds ${column}`,schema.includes(`add column if not exists ${column}`));
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

expect('full atomic revision signature preserved',atomic.includes('apply_project_experience_draft_revision('));
expect('full atomic revision remains security definer',atomic.includes('security definer')&&atomic.includes('set search_path=public'));
expect('full atomic revision updates canonical project row',atomic.includes('participation_mode=participation_value')&&atomic.includes('team_size_threshold=min_value'));
expect('full atomic audit records participation',atomic.includes("'participation_mode',participation_value")&&atomic.includes("'max_team_size',max_value"));
expect('full atomic RPC remains private',atomic.includes('revoke all on function public.apply_project_experience_draft_revision')&&atomic.includes('to service_role,postgres'));

expect('focused participation revision is atomic',focusedAtomic.includes('apply_project_participation_revision(')&&focusedAtomic.includes('for update')&&focusedAtomic.includes("'project_participation_updated'"));
expect('focused participation revision preserves editable governance states',focusedAtomic.includes("current_status not in ('draft','changes_requested')"));
expect('focused participation revision keeps legacy threshold aligned',focusedAtomic.includes('team_size_threshold=target_min_team_size'));
expect('focused participation RPC is private',focusedAtomic.includes('revoke all on function public.apply_project_participation_revision')&&focusedAtomic.includes('to service_role,postgres'));

expect('shared parser supports all modes',['solo','team','flexible'].every(mode=>helper.includes(`'${mode}'`)));
expect('shared parser keeps threshold equal to minimum',helper.includes('team_size_threshold:min'));
expect('shared validation enforces team minimum',helper.includes("participation_mode==='team'&&value.min_team_size<2"));
expect('shared validation preserves Phase 9 flexible collaborative minimum',
  helper.includes('Flexible keeps a real collaborative minimum')
  && !helper.includes("participation_mode==='flexible'&&value.min_team_size!==1")
  && phase9Hardening.includes("or participation_mode='flexible'")
  && phase9Hardening.includes("when p_mode='flexible' and p_preference in ('solo','either') then 1")
);

expect('creator visibly supports Solo Team Flexible',creator.includes('Participation mode')&&creator.includes('<option value="solo">Solo</option>')&&creator.includes('<option value="team">Team</option>')&&creator.includes('<option value="flexible">Flexible</option>'));
expect('creator captures min target max',creator.includes('Minimum participants')&&creator.includes('Target participants')&&creator.includes('Maximum participants'));
expect('creator sends canonical participation payload',creator.includes('participation_mode:participationMode')&&creator.includes('min_team_size:minTeamSize')&&creator.includes('target_team_size:targetTeamSize')&&creator.includes('max_team_size:maxTeamSize'));
expect('creation API validates shared participation contract',createRoute.includes('parseProjectParticipation')&&createRoute.includes('validateProjectParticipation'));
expect('creation API persists canonical participation on same project row',createRoute.includes('...participation')&&createRoute.includes("db.from('projects').insert"));
expect('creation governance event records participation',createRoute.includes('participation_mode:participation.participation_mode')&&createRoute.includes('max_team_size:participation.max_team_size'));

expect('draft GET exposes canonical participation',draftRoute.includes('participation_mode,min_team_size,target_team_size,max_team_size'));
expect('revision PATCH uses shared participation validation',revisionRoute.includes('parseProjectParticipation')&&revisionRoute.includes('validateProjectParticipation'));
expect('legacy edit clients preserve canonical values',revisionRoute.includes('participationSource=body.participation_mode?body:'));
expect('revision payload persists canonical participation',revisionRoute.includes('...participation'));
expect('focused participation endpoint is role protected',participationRoute.includes('assignedRole')&&participationRoute.includes("roles.includes('creating_architect')"));
expect('focused participation endpoint uses atomic RPC',participationRoute.includes("rpc('apply_project_participation_revision'"));
expect('edit page shows canonical participation panel',editorPage.includes('ArchitectProjectParticipationPanel')&&editorPanel.includes('Define how this project can form.'));
expect('edit panel is state and accessibility aware',editorPanel.includes('aria-labelledby="project-participation-heading"')&&editorPanel.includes('aria-live="polite"')&&editorPanel.includes("['draft','changes_requested']" )===false);

expect('Admin queue API exposes participation',adminRoute.includes('participation_mode,min_team_size,target_team_size,max_team_size'));
expect('Admin approval still gates on publication readiness',adminRoute.includes("select('publication_ready,missing_requirements,publication_blockers,resource_governance_ready')"));
expect('Admin governance page shows participation summary',adminPage.includes('AdminProjectParticipationSummary')&&adminSummary.includes('CANONICAL PARTICIPATION'));
expect('Admin summary detects threshold divergence',adminSummary.includes('team_size_threshold!==item.min_team_size'));

expect('formation runtime still uses legacy threshold contract',formationRoute.includes('team-size threshold')||formationRoute.includes('team_size_threshold'));
expect('Phase 3 does not introduce a second project table',!schema.includes('create table public.projects_v2'));

const failed=checks.filter(check=>!check.ok);
for(const check of checks)console.log(`${check.ok?'PASS':'FAIL'} ${check.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Phase 3 governance checks passed.`);
if(failed.length)process.exit(1);
