import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const source=(path:string)=>fs.readFileSync(path,'utf8');

test.describe('Workstream 3 Submit Interest admission and operations recovery',()=>{
  test('actual routed member journey preserves project mode and restores Role and Contribution',()=>{
    const page=source('app/member/discover/[id]/apply/page.tsx');
    const flow=source('components/MemberProjectInterestFlowV3.tsx');
    const admission=source('lib/project-admission.ts');
    expect(page).toContain("MemberProjectInterestFlowV3");
    expect(page).toContain("project_roles(id,title,description,openings,role_status)");
    expect(flow).toContain("'Role & Contribution'");
    expect(flow).toContain("const isSolo=participation==='solo'");
    expect(flow).toContain("project_role_id:isSolo?null:primaryRoleId||null");
    expect(flow).toContain("secondary_project_role_id:isSolo?null:secondaryRoleId||null");
    expect(flow).toContain("role_fit_statement:isSolo?null:roleFit.trim()||null");
    expect(flow).toContain("if(value===1&&participation==='team'&&!primaryRoleId)");
    expect(flow).toContain('You own the complete project outcome, so no team role is required.');
    expect(admission).toContain("if(mode==='solo')return['solo']");
    expect(admission).toContain("if(mode==='team')return['team','flexible']");
    expect(admission).toContain("return['solo','team','flexible']");
  });

  test('latest interest RPC retains Workstream 2 readiness/capacity while persisting validated roles',()=>{
    const migration=source('supabase/migrations/20260913140500_workstream3_submit_interest_role_recovery.sql');
    for(const marker of ['workstream2_member_application_readiness','PROJECT_CLOSED','DEADLINE_PASSED','PROFILE_INCOMPLETE','DUPLICATE_APPLICATION','PARTICIPATION_NOT_SUPPORTED','COMMITMENT_REQUIRED','MOTIVATION_REQUIRED','CONTRIBUTION_REQUIRED','ALREADY_PARTICIPATING','PROJECT_FULL'])expect(migration).toContain(marker);
    expect(migration).toContain("p_participation_preference='solo'");
    expect(migration).toContain('SOLO_ROLE_NOT_ALLOWED');
    expect(migration).toContain('INVALID_PRIMARY_ROLE');
    expect(migration).toContain('PRIMARY_ROLE_FULL');
    expect(migration).toContain("case when p_participation_preference='solo' then null else p_primary_project_role_id end");
    expect(migration).toContain("case when p_participation_preference='solo' then null else p_secondary_project_role_id end");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(p_project_id::text||':'||v_user_id::text,0))");
  });

  test('AUTO admission remains one database-owned engine behind the post-insert bridge',()=>{
    const recovery=source('supabase/migrations/20260913140000_workstream3_interest_admission_recovery.sql');
    const api=source('app/api/project-applications/route.ts');
    expect(recovery).toContain('project_interest_resolve_admission_after_insert');
    expect(recovery).toContain('perform public.phase6_auto_admit_interest');
    expect(recovery).toContain("project_row.project_type='partner'");
    expect(recovery).toContain("admission_decision='review_required'");
    expect(api).toContain("rpc('submit_project_interest'");
    const interestBranch=api.slice(api.indexOf('if(isInterest){'),api.indexOf('const roleIds=ids(body.project_role_ids)'));
    expect(interestBranch).not.toContain('phase6_auto_admit_interest');
    expect(interestBranch).not.toContain("from('project_members').insert");
  });

  test('six hours is eligibility and the Hobby-compatible daily formation processor remains the start owner',()=>{
    const recovery=source('supabase/migrations/20260913140000_workstream3_interest_admission_recovery.sql');
    const phase9=source('supabase/migrations/20260906002000_project_experience_phase_9_participation_hardening.sql');
    const cron=source('app/api/cron/project-formation/route.ts');
    const vercel=source('vercel.json');
    expect(recovery).toContain('auto_start_delay_minutes=360');
    expect(phase9).toContain("interval '6 hours'");
    expect(phase9).toContain('start_ready_at=null');
    expect(phase9).toContain('scheduled_start_at=null');
    expect(cron).toContain("not('scheduled_start_at','is',null).lte('scheduled_start_at',now)");
    expect(cron).toContain('(count||0)<required');
    expect(cron).toContain('scheduled_start_at:null,start_scheduled_at:null,start_ready_at:null');
    expect(vercel).toContain('0 6 * * *');
  });

  test('Offer response is actor scoped and canonical capacity locking remains transactional',()=>{
    const offerApi=source('app/api/project-offers/route.ts');
    const responseLock=source('supabase/migrations/20260906002600_project_experience_phase_9_offer_response_lock_order.sql');
    const capacity=source('supabase/migrations/20260906002500_project_experience_phase_9_offer_lock_order_guard.sql');
    expect(offerApi).toContain("rpc('phase8_respond_to_project_offer'");
    expect(responseLock).toContain('where id=p_offer_id and user_id=actor');
    expect(responseLock).toContain('perform public.phase9_lock_project_capacity(project.id)');
    expect(responseLock).toContain("OFFER_RESERVATION_INVALID");
    expect(capacity).toContain('occupied+reserved>=maximum_members');
  });

  test('member tracker, notifications and Admin operations remain canonical consumers',()=>{
    const tracker=source('app/member/applications/page.tsx');
    const offerApi=source('app/api/project-offers/route.ts');
    const start=source('lib/project-start-service.ts');
    const admin=source('app/api/admin/project-admission/route.ts');
    expect(tracker).toContain('MemberApplicationTracker');
    expect(tracker).toContain('MemberProjectOffers');
    expect(tracker).toContain('scheduled_start_at');
    expect(offerApi).toContain('notifyUser');
    expect(start).toContain("type:'project_kickoff'");
    expect(admin).toContain("['pause_run','resume_run','block_run','unblock_run','retry_run','start_run'].includes(action)");
  });

  test('run operational diagnostics remain column-private to service role',()=>{
    const recovery=source('supabase/migrations/20260913140000_workstream3_interest_admission_recovery.sql');
    expect(recovery).toContain('revoke select on table public.project_runs from anon,authenticated');
    expect(recovery).toContain('grant select on table public.project_runs to service_role');
    expect(recovery).not.toContain('auto_start_failure,auto_start_pause_reason');
  });
});
