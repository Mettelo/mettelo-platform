import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const migration=read('supabase/migrations/20260912170500_workstream2_canonical_project_contract.sql');
const publicLoader=read('lib/public-project-catalogue-loader.ts');
const memberLoader=read('lib/member-discover-project-loader.ts');
const interestFlow=read('components/MemberProjectInterestFlow.tsx');
const applyPage=read('app/member/discover/[id]/apply/page.tsx');
const publicDetail=read('app/projects/[id]/page.tsx');
const phase9=read('supabase/migrations/20260906001000_project_experience_phase_9_participation_runtime.sql');
const phase19=read('supabase/migrations/20260908090000_project_experience_phase_19_completion_boundary.sql');

const checks=[
 [migration,'workstream2_project_reconciliation','historical reconciliation report exists'],
 [migration,'workstream2_publication_blockers','publication blockers are database-authoritative'],
 [migration,'workstream2_guard_project_publication','direct publication bypass is guarded'],
 [migration,"participation_mode='team' and coalesce(p.min_team_size,0)<2",'Team minimum is validated'],
 [migration,'TARGET_BELOW_MINIMUM','target/minimum invariant is guarded'],
 [migration,'MAXIMUM_BELOW_TARGET','maximum/target invariant is guarded'],
 [migration,'get_public_project_capacity','public capacity is an aggregate safe projection'],
 [migration,"project_role_id,project_role_id",'__INTENTIONALLY_MISSING__'],
 [migration,'p_project_id,null,null,v_user_id','initial interest stores no formal role'],
 [migration,"raise exception 'PROJECT_FULL'",'interest capacity is server-authoritative'],
 [migration,"raise exception 'DEADLINE_PASSED'",'interest deadline is server-authoritative'],
 [migration,"raise exception 'DUPLICATE_APPLICATION'",'duplicate interest is server protected'],
 [migration,'project_acceptance_criteria','acceptance criteria are canonical structured data'],
 [migration,'project_dependencies','dependencies are canonical structured data'],
 [publicLoader,'refusing stale fallback projection','public catalogue fails closed instead of using legacy definition'],
 [memberLoader,'refusing stale fallback projection','member catalogue fails closed instead of using legacy definition'],
 [interestFlow,'You do not choose a formal team role','member interest journey is role-neutral'],
 [interestFlow,'project_role_id:null','member interest payload is role-neutral'],
 [applyPage,"import MemberProjectInterestFlow",'member apply surface uses recovered role-neutral flow'],
 [publicDetail,'generateMetadata','public project metadata is canonical'],
 [publicDetail,"robots:{index:false,follow:false}",'non-public/missing project metadata is non-indexable'],
 [phase9,'Target team size never controls readiness','target remains preferred rather than activation minimum'],
 [phase9,'max_team_size','Phase 9 remains bound to canonical maximum'],
 [phase19,'project_runs','Phase 19 continues to consume run history rather than a competing project definition']
];

const failures=[];
for(const [source,needle,reason] of checks){
 if(reason==='__INTENTIONALLY_MISSING__'){if(source.includes(needle))failures.push('initial interest unexpectedly preserves a formal role pair')} else if(!source.includes(needle))failures.push(`${reason}: ${needle}`);
}
for(const [path,source] of [['public catalogue loader',publicLoader],['member discover loader',memberLoader]]){
 if(source.includes('LEGACY_')||source.includes('retrying legacy'))failures.push(`${path} still contains legacy projection fallback`);
}
if(interestFlow.includes('PRIMARY_ROLE_REQUIRED')||interestFlow.includes('Choose a primary role'))failures.push('role-neutral interest UI still requires a formal role');
if(failures.length){for(const failure of failures)console.error(`FAIL: ${failure}`);process.exit(1)}
console.log(`Workstream 2 canonical project static contract verified (${checks.length} assertions).`);
