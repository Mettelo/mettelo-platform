import fs from 'node:fs';
import {expect,test} from '@playwright/test';

function source(path:string){return fs.readFileSync(path,'utf8')}

test.describe('Project Experience Phase 6 interest submission contract',()=>{
  test('member form submits role-neutral interest only on final submit',()=>{
    const flow=source('components/MemberProjectApplicationFlow.tsx');
    expect(flow).toContain("application_kind:'interest'");
    expect(flow).not.toContain('project_role_id:');
    expect(flow).not.toContain('project_role_ids:');
    expect(flow).toContain('setSubmitted(true)');
    expect(flow).toContain('localStorage.removeItem(storageKey)');
    expect(flow).toContain('Your responses are still here.');
  });

  test('flexible participation preference is explicit while fixed modes remain authoritative',()=>{
    const flow=source('components/MemberProjectApplicationFlow.tsx');
    const admission=source('lib/project-admission.ts');
    const applyPage=source('app/member/discover/[id]/apply/page.tsx');
    expect(applyPage).toContain('participation_mode');
    expect(flow).toContain("project.participationMode==='flexible'");
    expect(flow).toContain("(['solo','either','team'] as ParticipationPreference[])");
    expect(flow).toContain('participation_preference:participationPreference');
    expect(admission).toContain("if(mode==='solo')return{ok:true,preference:'solo'}");
    expect(admission).toContain("if(mode==='team')return{ok:true,preference:'team'}");
  });

  test('server revalidates qualification before persisting interest',()=>{
    const api=source('app/api/project-applications/route.ts');
    expect(api).toContain('calculateMemberReadiness');
    expect(api).toContain("'PROFILE_INCOMPLETE'");
    expect(api).toContain("eq('project_id',projectId).eq('user_id',user.id)");
    expect(api).toContain('loadMemberProjectTeamState');
    expect(api).toContain("'CAPACITY_FULL'");
    expect(api).toContain("application_kind:isInterest?'interest':'application'");
    expect(api).toContain('project_role_id:role?.id||null');
    expect(api).toContain('Promise.allSettled');
    expect(api).toContain("category:index===0?'member_notification':'admin_notification'");
  });

  test('canonical project admission policy supports AUTO and REVIEW_REQUIRED without project-type inference',()=>{
    const migration=source('supabase/migrations/20260905175000_project_experience_phase_6_auto_admission.sql');
    const policy=source('lib/project-admission.ts');
    const adminApi=source('app/api/admin/project-admission/route.ts');
    const adminUi=source('components/AdminProjectAdmissionPolicy.tsx');
    expect(migration).toContain("admission_mode text not null default 'review_required'");
    expect(migration).toContain("check (admission_mode in ('auto','review_required'))");
    expect(policy).toContain("DEFAULT_PROJECT_ADMISSION_MODE:ProjectAdmissionMode='review_required'");
    expect(adminApi).toContain('user.app_metadata?.role');
    expect(adminApi).toContain('admission_mode:admissionMode');
    expect(adminUi).toContain('Automatic qualification');
    expect(adminUi).toContain('Review required');
  });

  test('AUTO decision is server-side, service-only and recorded on canonical interest',()=>{
    const api=source('app/api/project-applications/route.ts');
    const migration=source('supabase/migrations/20260905175000_project_experience_phase_6_auto_admission.sql');
    expect(api).toContain("canonicalAdmissionMode(project.admission_mode)");
    expect(api).toContain("termsDb.rpc('phase6_auto_admit_interest'");
    expect(migration).toContain('security definer');
    expect(migration).toContain('revoke all on function public.phase6_auto_admit_interest(uuid,text) from public,anon,authenticated');
    expect(migration).toContain("admission_decision='auto_qualified'");
    expect(migration).toContain("admission_decision='review_required'");
    expect(migration).toContain('admission_mode_snapshot');
    expect(migration).toContain('auto_qualified_at');
  });

  test('AUTO run selection is concurrency-safe and schedules on minimum rather than target',()=>{
    const migration=source('supabase/migrations/20260905175000_project_experience_phase_6_auto_admission.sql');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain("project.participation_mode='flexible' and preference in ('solo','either') then 1");
    expect(migration).toContain('coalesce(project.min_team_size,project.team_size_threshold,1)');
    expect(migration).toContain('coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,required_members)');
    expect(migration).toContain('occupied>=required_members');
    expect(migration).toContain('scheduled_start_at=due_at');
  });

  test('start schedule is durable, configurable and processed by existing project formation worker',()=>{
    const migration=source('supabase/migrations/20260905175000_project_experience_phase_6_auto_admission.sql');
    const cron=source('app/api/cron/project-formation/route.ts');
    const vercel=source('vercel.json');
    expect(migration).toContain('auto_start_delay_minutes integer not null default 120');
    expect(migration).toContain('scheduled_start_at timestamptz');
    expect(cron).toContain("not('scheduled_start_at','is',null).lte('scheduled_start_at',now)");
    expect(cron).toContain("startProjectRun({db,projectId:run.project_id,runId:run.id,source:'auto_scheduler'})");
    expect(vercel).toContain('*/15 * * * *');
    expect(cron).not.toContain('setTimeout(');
  });

  test('start-time minimum is revalidated and withdrawal below minimum cancels schedule',()=>{
    const cron=source('app/api/cron/project-formation/route.ts');
    const api=source('app/api/project-applications/route.ts');
    expect(cron).toContain('(count||0)<required');
    expect(cron).toContain('project_start_schedule_cancelled');
    expect(api).toContain("event_type:'project_start_schedule_cancelled'");
    expect(api).toContain("reason:'membership_withdrawal_below_minimum'");
    expect(api).toContain('scheduled_start_at:null');
  });

  test('manual and automatic starts reuse one canonical readiness-aware start service',()=>{
    const service=source('lib/project-start-service.ts');
    const manual=source('app/api/project-team-lifecycle/route.ts');
    const cron=source('app/api/cron/project-formation/route.ts');
    expect(manual).toContain("startProjectRun({db,projectId,runId,source:'manual'");
    expect(cron).toContain("source:'auto_scheduler'");
    expect(service).toContain('assessProjectTeamReadiness');
    expect(service).toContain("eq('status','forming').eq('has_started',false)");
    expect(service).toContain("membership_status:'active'");
    expect(service).toContain("type:'project_kickoff'");
    expect(service).toContain("event_type:source==='auto_scheduler'?'project_auto_started':'project_manual_started'");
  });

  test('database prevents duplicate active role-neutral interest and permits Phase 6 lifecycle states',()=>{
    const uniqueness=source('supabase/migrations/20260905170000_project_experience_phase_5_interest_uniqueness.sql');
    expect(uniqueness).toContain('project_applications_one_active_interest_per_project_user');
    expect(uniqueness).toContain("where application_kind='interest'");
    expect(uniqueness).toContain("status not in ('declined','withdrawn')");
    const lifecycle=source('supabase/migrations/20260905173000_project_experience_phase_6_application_status_contract.sql');
    expect(lifecycle).toContain('drop constraint if exists project_applications_status_check');
    expect(lifecycle).toContain("'approved'");
    expect(lifecycle).toContain("'accepted'");
    expect(lifecycle).toContain("'waiting_for_team'");
    expect(lifecycle).toContain("'team_complete'");
  });

  test('request lifecycle mutations are server-authoritative rather than owner-writable through RLS',()=>{
    const boundary=source('supabase/migrations/20260905174000_project_experience_phase_6_request_mutation_boundary.sql');
    const api=source('app/api/project-applications/route.ts');
    expect(boundary).toContain('drop policy if exists "users withdraw own applications"');
    expect(boundary).toContain('Members may create/read their own requests');
    expect(api).toContain("action!=='withdraw'");
    expect(api).toContain('const db=serviceDb()');
    expect(api).toContain("update({status:'withdrawn'");
  });

  test('member tracker and Admin preserve request kind instead of pretending every row is an application',()=>{
    const trackerPage=source('app/member/applications/page.tsx');
    const tracker=source('components/MemberApplicationTracker.tsx');
    const adminPage=source('app/admin/project-operations/applications/page.tsx');
    const adminQueue=source('components/AdminApplicationQueue.tsx');
    expect(trackerPage).toContain('project interests submitted through the new project journey');
    expect(tracker).toContain("function isInterest(item:Application){return item.application_kind==='interest'}");
    expect(tracker).toContain("isInterest(item)?'View interest':'View application'");
    expect(adminPage).toContain("application_kind:row.application_kind==='interest'?'interest':'application'");
    expect(adminQueue).toContain("function isInterest(item:Item){return item.application_kind==='interest'}");
    expect(adminQueue).toContain("isInterest(item)?'Project interest':'Project application'");
  });

  test('Admin approval accepts role-neutral review-required interest but keeps legacy role checks',()=>{
    const api=source('app/api/admin/applications/route.ts');
    expect(api).toContain("const isInterest=application.application_kind==='interest'");
    expect(api).toContain('if(!isInterest){');
    expect(api).toContain('Assign a valid project role before approving this application.');
    expect(api).toContain('project_role_id:approvedRoleId');
    expect(api).toContain("membership_status:'waiting'");
    expect(api).toContain('A formal contribution role can be assigned during team formation before the project starts.');
  });

  test('team readiness keeps governance but permits solo AUTO policy to waive team-only requirements',()=>{
    const readiness=source('lib/project-team-readiness.ts');
    const service=source('lib/project-start-service.ts');
    expect(readiness).toContain('requireResponsibilityCoverage=true');
    expect(readiness).toContain('requireLead=true');
    expect(readiness).toContain("blockers.push('responsibility_coverage')");
    expect(service).toContain('const soloLike=required===1');
    expect(service).toContain('requireResponsibilityCoverage:!soloLike');
    expect(service).toContain('requireLead:!soloLike');
  });
});
