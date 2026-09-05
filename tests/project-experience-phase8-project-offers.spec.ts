import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 8 source contract',()=>{
  test('uses one canonical durable project offer entity',()=>{
    const migration=read('supabase/migrations/20260905232000_project_experience_phase_8_project_offers.sql');
    expect(migration).toContain('create table if not exists public.project_offers');
    expect(migration).toContain('application_id uuid not null references public.project_applications(id)');
    expect(migration).toContain('project_id uuid not null references public.projects(id)');
    expect(migration).toContain('user_id uuid not null references auth.users(id)');
    expect(migration).toContain('project_run_id uuid references public.project_runs(id)');
    expect(migration).toContain('capacity_reserved_at timestamptz not null');
    expect(migration).toContain('capacity_released_at timestamptz');
    expect(migration).not.toContain('project_members_v2');
  });

  test('Offer creation reserves capacity without creating membership',()=>{
    const migration=read('supabase/migrations/20260905232000_project_experience_phase_8_project_offers.sql');
    expect(migration).toContain('phase8_validate_offer_capacity');
    expect(migration).toContain("status in ('pending','accepted')");
    expect(migration).toContain("perform pg_advisory_xact_lock(hashtextextended(project.id::text,7))");
    expect(migration).toContain('phase8_create_offer_from_application');
    expect(migration).toContain("now()+interval '72 hours'");
    expect(migration).not.toContain("insert into public.project_members");
  });

  test('member response is owner scoped, explicit and idempotent',()=>{
    const migration=read('supabase/migrations/20260905232100_project_experience_phase_8_offer_response_hardening.sql');
    const route=read('app/api/project-offers/route.ts');
    expect(migration).toContain('where id=p_offer_id and user_id=actor');
    expect(migration).toContain("p_action not in ('accept','decline')");
    expect(migration).toContain("offer_row.status='accepted'");
    expect(migration).toContain("offer_row.status='declined'");
    expect(migration).toContain("'already_in_state',true");
    expect(route).toContain("auth.rpc('phase8_respond_to_project_offer'");
    expect(route).toContain('participation:{creates_membership:false');
  });

  test('decline and expiry release reservation while acceptance keeps it reserved',()=>{
    const migration=read('supabase/migrations/20260905232100_project_experience_phase_8_offer_response_hardening.sql');
    expect(migration).toContain("set status='accepted',accepted_at=now_at,updated_at=now_at");
    expect(migration).toContain("set status='declined',declined_at=now_at,capacity_released_at=now_at,updated_at=now_at");
    expect(migration).toContain("set status='expired',expired_at=now_at,capacity_released_at=now_at,updated_at=now_at");
    expect(migration).toContain("'creates_membership',false");
  });

  test('expired response persists instead of rolling back behind an exception',()=>{
    const migration=read('supabase/migrations/20260905232100_project_experience_phase_8_offer_response_hardening.sql');
    expect(migration).toContain("'status','expired'");
    expect(migration).toContain("'expired',true");
    expect(migration).not.toContain("message='OFFER_EXPIRED'");
  });

  test('member Offer UI shows required commitment context and explicit actions',()=>{
    const component=read('components/MemberProjectOffers.tsx');
    const page=read('app/member/applications/page.tsx');
    expect(component).toContain('Project offers');
    expect(component).toContain('Commitment');
    expect(component).toContain('Team state');
    expect(component).toContain('Expected start');
    expect(component).toContain('Offer expiry');
    expect(component).toContain('Participation expectation');
    expect(component).toContain('Accept place');
    expect(component).toContain('Decline');
    expect(component).toContain('does not start the project or unlock the private workspace yet');
    expect(page).toContain('<MemberProjectOffers/>');
  });

  test('scheduled processing reuses project formation cron with bounded reminder dedupe',()=>{
    const migration=read('supabase/migrations/20260905232000_project_experience_phase_8_project_offers.sql');
    const cron=read('app/api/cron/project-formation/route.ts');
    expect(migration).toContain('phase8_claim_offer_reminders');
    expect(migration).toContain('reminder_sent_at is null');
    expect(migration).toContain("expires_at<=now()+interval '24 hours'");
    expect(cron).toContain("db.rpc('phase8_claim_offer_reminders'");
    expect(cron).toContain("db.rpc('phase8_expire_project_offers'");
    expect(cron).toContain('dedupeKey:`project-offer:${reminder.offer_id}:expiring`');
    expect(cron).toContain('dedupeKey:`project-offer:${expired.offer_id}:expired`');
  });

  test('RLS exposes only member-owned offers while writes remain RPC controlled',()=>{
    const migration=read('supabase/migrations/20260905232000_project_experience_phase_8_project_offers.sql');
    expect(migration).toContain('alter table public.project_offers enable row level security');
    expect(migration).toContain('using (user_id=auth.uid())');
    expect(migration).toContain("coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'");
    expect(migration).toContain('revoke insert,update,delete on public.project_offers from anon,authenticated');
  });
});
