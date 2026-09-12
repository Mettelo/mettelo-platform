import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const migration=read('supabase/migrations/20260912170500_workstream2_canonical_project_contract.sql');
const hardening=read('supabase/migrations/20260912171500_workstream2_interest_eligibility_hardening.sql');
const publicLoader=read('lib/public-project-catalogue-loader.ts');
const memberLoader=read('lib/member-discover-project-loader.ts');
const interestFlow=read('components/MemberProjectInterestFlow.tsx');
const applyPage=read('app/member/discover/[id]/apply/page.tsx');
const publicDetail=read('app/projects/[id]/page.tsx');
const phase9=read('supabase/migrations/20260906001000_project_experience_phase_9_participation_runtime.sql');
const readiness=read('lib/member-readiness.ts');

const checks=[
 [migration,'workstream2_project_reconciliation','historical reconciliation report exists'],
 [migration,'workstream2_publication_blockers','publication blockers are database-authoritative'],
 [migration,'workstream2_guard_project_publication','direct publication bypass is guarded'],
 [migration,"participation_mode='team' and coalesce(p.min_team_size,0)<2",'Team minimum is validated'],
 [migration,'TARGET_BELOW_MINIMUM','target/minimum invariant is guarded'],
 [migration,'MAXIMUM_BELOW_TARGET','maximum/target invariant is guarded'],
 [migration,'get_public_project_capacity','public capacity is an aggregate safe projection'],
 [migration,'project_acceptance_criteria','acceptance criteria are canonical structured data'],
 [migration,'project_dependencies','dependencies are canonical structured data'],
 [hardening,'workstream2_member_application_readiness','profile readiness is enforced at the database interest boundary'],
 [hardening,"message='PROFILE_INCOMPLETE:'||readiness_missing::text",'direct RPC cannot bypass profile readiness'],
 [hardening,'project_run_id=v_run_id','open project capacity is current-run scoped'],
 [hardening,'p_project_id,null,null,v_user_id','initial interest stores no formal role'],
 [hardening,"message='PROJECT_FULL'",'interest capacity is server-authoritative'],
 [hardening,"message='DEADLINE_PASSED'",'interest deadline is server-authoritative'],
 [hardening,"message='DUPLICATE_APPLICATION'",'duplicate interest is server protected'],
 [publicLoader,'refusing stale fallback projection','public catalogue fails closed instead of using legacy definition'],
 [memberLoader,'refusing stale fallback projection','member catalogue fails closed instead of using legacy definition'],
 [interestFlow,'No formal role is selected at this stage.','member interest journey explicitly remains role-neutral'],
 [interestFlow,'project_role_id:null','member interest payload is role-neutral'],
 [interestFlow,'secondary_project_role_id:null','member interest payload cannot silently allocate a secondary role'],
 [applyPage,'MemberProjectInterestFlow','member apply surface uses recovered role-neutral flow'],
 [publicDetail,'generateMetadata','public project metadata is canonical'],
 [publicDetail,"robots:{index:false,follow:false}",'non-public/missing project metadata is non-indexable'],
 [phase9,'Target is deliberately NOT a start threshold.','target remains preferred rather than activation minimum'],
 [phase9,'max_team_size','Phase 9 remains bound to canonical maximum'],
 [readiness,"requirement('weekly_capacity'",'database readiness must stay aligned with Workstream 1 application readiness']
];

const failures=[];
for(const [source,needle,reason] of checks)if(!source.includes(needle))failures.push(`${reason}: ${needle}`);
for(const [path,source] of [['public catalogue loader',publicLoader],['member discover loader',memberLoader]])if(source.includes('LEGACY_')||source.includes('retrying legacy')||source.includes('CORE_FACET_SELECT')||source.includes('MINIMAL_SELECT'))failures.push(`${path} still contains a stale/legacy projection fallback`);
if(interestFlow.includes('PRIMARY_ROLE_REQUIRED')||interestFlow.includes('Choose a primary role'))failures.push('role-neutral interest UI still requires a formal role');
if(hardening.includes('p_project_id,p_primary_project_role_id'))failures.push('initial interest still binds canonical request identity to a formal role');
if(failures.length){for(const failure of failures)console.error(`FAIL: ${failure}`);process.exit(1)}
console.log(`Workstream 2 canonical project static contract verified (${checks.length} assertions).`);
