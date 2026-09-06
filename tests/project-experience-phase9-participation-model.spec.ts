import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const runtime=()=>read('supabase/migrations/20260906001000_project_experience_phase_9_participation_runtime.sql');
const hardening=()=>read('supabase/migrations/20260906002000_project_experience_phase_9_participation_hardening.sql');

test.describe('Project Experience Phase 9 participation-model contract',()=>{
  test('canonical project participation model remains one Team/Solo/Flexible contract',()=>{
    const participation=read('lib/project-participation.ts');
    const phase3=read('supabase/migrations/20260905123000_project_experience_phase_3_canonical_project_governance.sql');
    expect(participation).toContain("['solo','team','flexible']");
    expect(phase3).toContain("participation_mode in ('solo','team','flexible')");
    expect(hardening()).toContain("or participation_mode='flexible'");
    expect(hardening()).toContain('min_team_size <= target_team_size');
    expect(hardening()).toContain('target_team_size <= max_team_size');
  });

  test('explicit malformed participation mode is rejected rather than guessed',()=>{
    const participation=read('lib/project-participation.ts');
    expect(participation).toContain("throw new Error('INVALID_PARTICIPATION_MODE')");
    expect(participation).toContain('hasExplicitMode');
    expect(participation).toContain("legacy===1?'solo':'team'");
  });

  test('Flexible keeps collaborative minimum while Solo/Either resolve to one at runtime',()=>{
    const admission=read('lib/project-admission.ts');
    const participation=read('lib/project-participation.ts');
    expect(admission).toContain("input.participationMode==='flexible'&&(input.preference==='solo'||input.preference==='either')");
    expect(participation).not.toContain("value.participation_mode==='flexible'&&value.min_team_size!==1");
    expect(hardening()).toContain('phase9_effective_participation_threshold');
    expect(hardening()).toContain("p_mode='flexible' and p_preference in ('solo','either') then 1");
  });

  test('forming Flexible Team run preserves configured minimum without rewriting started history',()=>{
    const migration=hardening();
    expect(runtime()).toContain('Started runs retain their historical threshold');
    expect(migration).toContain("p.participation_mode='flexible'");
    expect(migration).toContain("a.participation_preference='team'");
    expect(migration).toContain("project_row.participation_mode='flexible'");
    expect(migration).toContain("coalesce(new.required_team_size,new.team_size_threshold,1)>1");
    expect(migration).toContain("where project_id=new.id and coalesce(has_started,false)=false");
  });

  test('target is planning capacity and never the start threshold',()=>{
    const migration=hardening();
    expect(runtime()).toContain('Target is deliberately NOT a start threshold');
    expect(migration).toContain("'target_reached',occupied>=target_members");
    expect(migration).toContain("'ready',occupied>=minimum_members");
    expect(migration).toContain('target never blocks');
  });

  test('maximum capacity combines membership and live Offer reservations without double counting',()=>{
    const migration=hardening();
    expect(migration).toContain('phase9_validate_membership_capacity');
    expect(migration).toContain('phase9_guard_offer_capacity');
    expect(migration).toContain("o.status in ('pending','accepted')");
    expect(migration).toContain('o.capacity_consumed_at is null');
    expect(migration).toContain('consumes_offer');
    expect(migration).toContain('reserved:=greatest(reserved-1,0)');
    expect(migration).toContain('occupied+reserved>=maximum_members');
  });

  test('one Phase 9 capacity lock protects capacity-changing paths without lock inversion',()=>{
    const migration=hardening();
    const consume=read('supabase/migrations/20260906002400_project_experience_phase_9_lock_order_hardening.sql');
    const offerGuard=read('supabase/migrations/20260906002500_project_experience_phase_9_offer_lock_order_guard.sql');
    expect(migration).toContain('phase9_lock_project_capacity');
    expect(migration).toContain("hashtextextended(p_project_id::text,9)");
    expect((migration.match(/perform public\.phase9_lock_project_capacity/g)||[]).length).toBeGreaterThanOrEqual(4);
    expect(consume).toContain('phase8_consume_offer_reservation_on_membership');
    expect(consume).toContain('perform public.phase9_lock_project_capacity(new.project_id)');
    expect(consume).not.toContain("hashtextextended(new.project_id::text,7)");
    expect(offerGuard).toContain("old_live and old.project_id is not distinct from new.project_id");
    expect(offerGuard).toContain('return new;');
    expect(offerGuard).toContain('Only transitions that can ADD or MOVE live reserved capacity');
  });

  test('AUTO readiness uses an exact six-hour window and ordinary additions do not reset it',()=>{
    const admission=read('lib/project-admission.ts');
    const migration=hardening();
    const guard=read('supabase/migrations/20260906002200_project_experience_phase_9_auto_window_guard.sql');
    expect(admission).toContain('DEFAULT_AUTO_START_DELAY_MINUTES=360');
    expect(migration).toContain('auto_start_delay_minutes=360');
    expect(migration).toContain("due_at:=coalesce(run_row.start_ready_at,now_at)+interval '6 hours'");
    expect(migration).toContain('run_row.scheduled_start_at is null');
    expect(migration).toContain('Do not reset an existing valid schedule');
    expect(guard).toContain('new.auto_start_delay_minutes:=360');
  });

  test('minimum loss invalidates schedule and restored readiness can create a fresh window',()=>{
    const migration=hardening();
    expect(migration).toContain("'participation_readiness_invalidated'");
    expect(migration).toContain('set start_ready_at=null,scheduled_start_at=null,start_scheduled_at=null');
    expect(migration).toContain("'participation_minimum_reached'");
    expect(migration).toContain("'project_start_scheduled'");
  });

  test('REVIEW_REQUIRED participation readiness never creates AUTO scheduling',()=>{
    const migration=hardening();
    expect(migration).toContain("if effective_admission<>'auto' then");
    expect(migration).toContain("'state','participation_ready'");
  });

  test('late joining reuses Phase 6 policy and canonical project_members path',()=>{
    const phase6=read('supabase/migrations/20260905177000_project_experience_phase_6_late_joining_recruitment.sql');
    expect(phase6).toContain('late_joining_enabled');
    expect(phase6).toContain('late_joining_cutoff_at');
    expect(phase6).toContain('recruitment_open');
    expect(phase6).toContain('insert into public.project_members');
    expect(runtime()).toContain('project_runs_active_recruitment_idx');
    expect(runtime()).not.toContain('create table public.project_members');
  });

  test('capacity snapshot exposes occupied reserved available target and late-join state',()=>{
    const migration=hardening();
    expect(migration).toContain('phase9_project_run_capacity');
    expect(migration).toContain("'occupied',occupied,'reserved',reserved,'used_capacity',used_capacity");
    expect(migration).toContain("'available',greatest(maximum_members-used_capacity,0)");
    expect(migration).toContain("'target_reached',occupied>=target_members");
    expect(migration).toContain("'late_join_allowed',late_join_allowed");
  });

  test('start readiness is driven by participation/run threshold, not AUTO admission history',()=>{
    const start=read('lib/project-start-service.ts');
    expect(start).toContain("canonicalParticipationMode(project.participation_mode)");
    expect(start).toContain('Number(run.required_team_size||canonicalMinimum)');
    expect(start).not.toContain("filter(row=>row.admission_decision==='auto_qualified')");
    expect(start).toContain('participation_mode:participationMode');
  });

  test('public and member project surfaces explain participation and readiness separately and Solo is independent work',()=>{
    const publicDetail=read('components/project-experience/ProjectPublicDetailV2.tsx');
    const memberDetail=read('components/project-experience/MemberProjectDetailV2.tsx');
    const admin=read('components/ArchitectProjectParticipationPanel.tsx');
    expect(publicDetail).toContain('<dt>Participation</dt>');
    expect(publicDetail).toContain('<dt>Capacity</dt>');
    expect(memberDetail).toContain('<dt>Minimum to start</dt>');
    expect(memberDetail).toContain('<dt>Target team</dt>');
    expect(memberDetail).toContain('<dt>Maximum team</dt>');
    expect(memberDetail).toContain("const isSolo=project.participationMode==='solo'");
    expect(memberDetail).toContain("'Working independently'");
    expect(memberDetail).toContain('aria-label="Solo participation capacity"');
    expect(admin).toContain("value.participation_mode==='flexible'?'Team minimum':'Minimum to start'");
    expect(admin).toContain('Target is desirable planning capacity');
  });

  test('accepted Offer history remains compatible with later canonical membership',()=>{
    const phase8=read('supabase/migrations/20260905232700_project_experience_phase_8_reservation_consumption.sql');
    const lockOrder=read('supabase/migrations/20260906002400_project_experience_phase_9_lock_order_hardening.sql');
    expect(phase8).toContain('capacity_consumed_at');
    expect(phase8).toContain('project_member_phase8_offer_consumption');
    expect(phase8).toContain("status='accepted'");
    expect(phase8).not.toContain('delete from public.project_offers');
    expect(lockOrder).toContain("set capacity_consumed_at=now()");
  });
});
