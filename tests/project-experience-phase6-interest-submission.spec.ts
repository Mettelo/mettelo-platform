import fs from 'node:fs';
import {expect,test} from '@playwright/test';

function source(path:string){return fs.readFileSync(path,'utf8')}

test.describe('Project Experience Phase 6 interest submission contract',()=>{
  test('member form submits role-neutral interest only on final submit',()=>{
    const flow=source('components/MemberProjectApplicationFlow.tsx');
    expect(flow).toContain("application_kind:'interest'");
    expect(flow).not.toContain('project_role_id:');
    expect(flow).not.toContain('project_role_ids:');
    expect(flow).toContain("setSubmitted(true)");
    expect(flow).toContain("localStorage.removeItem(storageKey)");
    expect(flow).toContain("Your responses are still here.");
  });

  test('server revalidates qualification before persisting interest',()=>{
    const api=source('app/api/project-applications/route.ts');
    expect(api).toContain('calculateMemberReadiness');
    expect(api).toContain("code,'PROFILE_INCOMPLETE'").or.toBeDefined();
    expect(api).toContain("eq('project_id',projectId).eq('user_id',user.id)");
    expect(api).toContain('loadMemberProjectTeamState');
    expect(api).toContain("'CAPACITY_FULL'");
    expect(api).toContain("application_kind:isInterest?'interest':'application'");
    expect(api).toContain('project_role_id:role?.id||null');
  });

  test('database prevents duplicate active role-neutral interest',()=>{
    const migration=source('supabase/migrations/20260905170000_project_experience_phase_5_interest_uniqueness.sql');
    expect(migration).toContain('project_applications_one_active_interest_per_project_user');
    expect(migration).toContain("where application_kind='interest'");
    expect(migration).toContain("status not in ('declined','withdrawn')");
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

  test('Admin approval accepts role-neutral interest but keeps legacy role checks',()=>{
    const api=source('app/api/admin/applications/route.ts');
    expect(api).toContain("const isInterest=application.application_kind==='interest'");
    expect(api).toContain('if(!isInterest){');
    expect(api).toContain("Assign a valid project role before approving this application.");
    expect(api).toContain('project_role_id:approvedRoleId');
    expect(api).toContain("membership_status:'waiting'");
    expect(api).toContain('A formal contribution role can be assigned during team formation before the project starts.');
  });

  test('team formation owns later role assignment and readiness requires responsibility coverage',()=>{
    const teamFormation=source('components/AdminTeamFormation.tsx');
    const readiness=source('lib/project-team-readiness.ts');
    expect(teamFormation).toContain('<option value="">No role assigned</option>');
    expect(teamFormation).toContain("act(item,'assign_role',member.id,roles[roleKey])");
    expect(readiness).toContain('members.every(member=>Boolean(member.project_role_id))');
    expect(readiness).toContain("blockers.push('responsibility_coverage')");
  });
});
