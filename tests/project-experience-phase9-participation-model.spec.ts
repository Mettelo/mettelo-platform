import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 9 participation-model contract',()=>{
  test('canonical project participation model remains one Team/Solo/Flexible contract',()=>{
    const participation=read('lib/project-participation.ts');
    const phase3=read('supabase/migrations/20260905123000_project_experience_phase_3_canonical_project_governance.sql');
    expect(participation).toContain("['solo','team','flexible']");
    expect(phase3).toContain("participation_mode in ('solo','team','flexible')");
    expect(phase3).toContain('min_team_size <= target_team_size');
    expect(phase3).toContain('target_team_size <= max_team_size');
    expect(phase3).toContain("participation_mode = 'solo' and min_team_size = 1");
    expect(phase3).toContain("participation_mode = 'team' and min_team_size >= 2");
    expect(phase3).toContain("participation_mode = 'flexible' and min_team_size = 1");
  });

  test('target is planning capacity and never the start threshold',()=>{
    const migration=read('supabase/migrations/20260906001000_project_experience_phase_9_participation_runtime.sql');
    expect(migration).toContain('Target is');
    expect(migration).toContain('NOT a start threshold');
    expect(migration).toContain("when p.participation_mode in ('solo','flexible') then 1");
    expect(migration).toContain('coalesce(p.min_team_size,p.team_size_threshold,1)');
    expect(migration).toContain("comment on column public.projects.target_team_size");
  });

  test('start readiness is driven by participation mode, not AUTO admission history',()=>{
    const start=read('lib/project-start-service.ts');
    expect(start).toContain("canonicalParticipationMode(project.participation_mode)");
    expect(start).toContain("participationMode==='solo'||participationMode==='flexible'");
    expect(start).toContain('oneMemberParticipation');
    expect(start).not.toContain("filter(row=>row.admission_decision==='auto_qualified')");
    expect(start).toContain('participation_mode:participationMode');
  });

  test('forming run threshold is synchronized without rewriting started-run history',()=>{
    const migration=read('supabase/migrations/20260906001000_project_experience_phase_9_participation_runtime.sql');
    expect(migration).toContain('phase9_sync_run_participation_contract');
    expect(migration).toContain("coalesce(new.has_started,false)=false");
    expect(migration).toContain('Started runs retain their historical threshold');
    expect(migration).toContain('required_team_size:=canonical_required');
  });

  test('late joining reuses Phase 6 policy and canonical project_members path',()=>{
    const phase6=read('supabase/migrations/20260905177000_project_experience_phase_6_late_joining_recruitment.sql');
    const phase9=read('supabase/migrations/20260906001000_project_experience_phase_9_participation_runtime.sql');
    expect(phase6).toContain('late_joining_enabled');
    expect(phase6).toContain('late_joining_cutoff_at');
    expect(phase6).toContain('recruitment_open');
    expect(phase6).toContain('insert into public.project_members');
    expect(phase9).toContain('project_runs_active_recruitment_idx');
    expect(phase9).not.toContain('create table public.project_members');
    expect(phase9).not.toContain('project_members_v2');
  });

  test('capacity snapshot separates minimum target maximum and late-join readiness',()=>{
    const migration=read('supabase/migrations/20260906001000_project_experience_phase_9_participation_runtime.sql');
    expect(migration).toContain('phase9_project_run_capacity');
    expect(migration).toContain("'minimum',minimum_members");
    expect(migration).toContain("'target',target_members");
    expect(migration).toContain("'maximum',maximum_members");
    expect(migration).toContain("'ready',occupied>=minimum_members");
    expect(migration).toContain("'target_reached',occupied>=target_members");
    expect(migration).toContain("'late_join_allowed',late_join_allowed");
  });

  test('public and member project surfaces explain participation and readiness separately',()=>{
    const publicDetail=read('components/project-experience/ProjectPublicDetailV2.tsx');
    const memberDetail=read('components/project-experience/MemberProjectDetailV2.tsx');
    expect(publicDetail).toContain('<dt>Participation</dt>');
    expect(publicDetail).toContain('<dt>Capacity</dt>');
    expect(publicDetail).toContain('target');
    expect(memberDetail).toContain('<dt>Minimum to start</dt>');
    expect(memberDetail).toContain('<dt>Target team</dt>');
    expect(memberDetail).toContain('<dt>Maximum team</dt>');
    expect(memberDetail).toContain('reserved/offered');
  });

  test('accepted Offer history remains compatible with later canonical membership',()=>{
    const phase8=read('supabase/migrations/20260905232700_project_experience_phase_8_reservation_consumption.sql');
    expect(phase8).toContain('capacity_consumed_at');
    expect(phase8).toContain('project_member_phase8_offer_consumption');
    expect(phase8).toContain("status='accepted'");
    expect(phase8).not.toContain("delete from public.project_offers");
  });
});
