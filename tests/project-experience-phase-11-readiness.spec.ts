import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const read=(path:string)=>fs.readFileSync(path,'utf8');

const migration=read('supabase/migrations/20260906020000_project_experience_phase_11_start_readiness.sql');
const startService=read('lib/project-start-service.ts');
const adminFlow=read('app/api/admin/project-flow/route.ts');

test.describe('Project Experience Phase 11 start readiness contract',()=>{
  test('composes project team and system readiness without a second lifecycle',()=>{
    expect(migration).toContain('phase11_project_start_readiness');
    expect(migration).toContain("'project',jsonb_build_object");
    expect(migration).toContain("'team',jsonb_build_object");
    expect(migration).toContain("'system',jsonb_build_object");
    expect(migration).toContain("project_ready and team_ready and system_ready");
    expect(migration).not.toContain('create table public.project_runs_v2');
    expect(migration).not.toContain('create table public.project_members_v2');
  });

  test('preserves Phase 10 lead and normalized responsibility authority',()=>{
    expect(migration).toContain("team_role='project_lead'");
    expect(migration).toContain('public.project_member_responsibilities');
    expect(migration).toContain("r.assignment_status='active'");
    expect(migration).toContain('if required_members>1 then');
  });

  test('uses existing project and Lab readiness as project and system truth',()=>{
    expect(migration).toContain('public.project_experience_readiness');
    expect(migration).toContain('publication_ready');
    expect(migration).toContain('lab_ready');
    expect(migration).toContain("system_blockers:=array_append(system_blockers,'lab_readiness')");
  });

  test('keeps one canonical start entry point and final atomic authority',()=>{
    expect(startService).toContain("rpc('phase11_project_start_readiness'");
    expect(startService).toContain("rpc('phase9_activate_project_run'");
    expect(startService.indexOf("rpc('phase11_project_start_readiness'")).toBeLessThan(startService.indexOf("rpc('phase9_activate_project_run'"));
  });

  test('Admin start no longer directly mutates activation state',()=>{
    expect(adminFlow).toContain("startProjectRun({db,projectId,runId,source:'manual',actorUserId:user.id})");
    const forceStart=adminFlow.slice(adminFlow.indexOf("if(action==='force_start')"),adminFlow.indexOf("if(action==='cancel')"));
    expect(forceStart).not.toContain("from('project_runs').update({status:'active'");
    expect(forceStart).not.toContain("from('project_members').update({membership_status:'active'");
    expect(forceStart).not.toContain("from('project_applications').update({status:'team_complete'");
  });

  test('Phase 11 readiness is service-only',()=>{
    expect(migration).toContain('security definer');
    expect(migration).toContain('revoke all on function public.phase11_project_start_readiness(uuid,uuid) from public,anon,authenticated');
    expect(migration).toContain('grant execute on function public.phase11_project_start_readiness(uuid,uuid) to service_role');
  });
});
