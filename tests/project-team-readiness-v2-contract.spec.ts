import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 team formation contract',()=>{
  test('application explicitly captures leadership willingness',()=>{
    const form=read('components/MemberProjectApplicationFlow.tsx');
    const route=read('app/api/project-applications/route.ts');
    const migration=read('supabase/migrations/20260902122300_project_team_readiness_v2.sql');
    expect(form).toContain('I would be willing to lead this project team if selected.');
    expect(form).toContain('leadership_interest:leadershipInterest');
    expect(route).toContain('const leadershipInterest=body.leadership_interest===true');
    expect(route).toContain('leadership_interest:isInterest?false:leadershipInterest');
    expect(migration).toContain('leadership_interest boolean not null default false');
  });

  test('automatic lead selection is deterministic, transparent, opt-in and open to new members',()=>{
    const readiness=read('lib/project-team-readiness.ts');
    expect(readiness).toContain('leadershipInterest?60:0');
    expect(readiness).toContain('completedProjects*10');
    expect(readiness).toContain('activeLeadProjects*25');
    expect(readiness).toContain('const volunteers=candidates.filter(candidate=>candidate.leadershipInterest)');
    expect(readiness).toContain('recommendation=volunteers[0]||null');
    expect(readiness).toContain("selection_policy:'volunteer_interest_then_mettelo_delivery_history_then_current_lead_load_then_submission_order'");
    expect(readiness).not.toContain('volunteers.length?volunteers:candidates');
    expect(readiness).not.toContain('experience_level');
    expect(readiness).not.toContain('current_job_title');
  });

  test('open cohorts start on readiness rather than headcount alone',()=>{
    const route=read('app/api/admin/applications/route.ts');
    expect(route).toContain('assessProjectTeamReadiness');
    expect(route).toContain("assignLead:project.project_type==='open'");
    expect(route).toContain("if(readiness.ready&&project.project_type==='open'&&!run.has_started)");
    expect(route).toContain('responsibility_coverage_ready:readiness.responsibilityCoverageReady');
    expect(route).toContain('lab_ready:readiness.labReady');
    expect(route).not.toContain("if(full&&project.project_type==='open'&&!run.has_started)");
  });

  test('readiness requires one lead, confirmed responsibilities and Lab readiness',()=>{
    const readiness=read('lib/project-team-readiness.ts');
    expect(readiness).toContain("members.every(member=>Boolean(member.project_role_id))");
    expect(readiness).toContain(".from('project_experience_readiness')");
    expect(readiness).toContain(".select('lab_ready')");
    expect(readiness).toContain("if(leads.length===0)blockers.push('project_lead')");
    expect(readiness).toContain("if(leads.length>1)blockers.push('multiple_project_leads')");
    expect(readiness).toContain("if(full&&!responsibilityCoverageReady)blockers.push('responsibility_coverage')");
  });

  test('admin override is formation-only and cannot bypass readiness',()=>{
    const admin=read('app/api/admin/project-flow/route.ts');
    expect(admin).toContain("if(run.status!=='forming'||run.has_started)return NextResponse.json({error:'Project Lead can only be changed while the team is still forming.'}");
    expect(admin).toContain('assignLead:false');
    expect(admin).toContain('if(!readiness.ready)return NextResponse.json');
    expect(admin).toContain("event_type:'project_lead_admin_assigned'");
    expect(admin).toContain("event_type:'cohort_admin_started'");
  });
});
