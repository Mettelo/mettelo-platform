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
    expect(migration).toContain('offered_by_user_id uuid references auth.users(id)');
    expect(migration).toContain('capacity_reserved_at timestamptz not null');
    expect(migration).toContain('capacity_released_at timestamptz');
    expect(migration).toContain("status in ('pending','accepted','declined','expired')");
    expect(migration).not.toContain('project_members_v2');
  });

  test('Offer boundary independently excludes AUTO and reserves capacity without membership',()=>{
    const integrity=read('supabase/migrations/20260905232500_project_experience_phase_8_offer_integrity.sql');
    expect(integrity).toContain('phase8_validate_offer_eligibility_and_capacity');
    expect(integrity).toContain("effective_project_admission_mode(project.project_type,project.admission_mode)<>'review_required'");
    expect(integrity).toContain("message='OFFER_REQUIRES_REVIEW_REQUIRED'");
    expect(integrity).toContain("message='AUTO_OFFER_FORBIDDEN'");
    expect(integrity).toContain("status in ('pending','accepted')");
    expect(integrity).toContain("perform pg_advisory_xact_lock(hashtextextended(project.id::text,7))");
    expect(integrity).toContain('phase8_create_offer_from_application');
    expect(integrity).toContain("now()+interval '72 hours'");
    expect(integrity).not.toContain('insert into public.project_members');
  });

  test('member response is owner scoped, explicit, idempotent and conflict-safe',()=>{
    const integrity=read('supabase/migrations/20260905232500_project_experience_phase_8_offer_integrity.sql');
    const route=read('app/api/project-offers/route.ts');
    expect(integrity).toContain('where id=p_offer_id and user_id=actor');
    expect(integrity).toContain("p_action not in ('accept','decline')");
    expect(integrity).toContain("offer_row.status='accepted'");
    expect(integrity).toContain("offer_row.status='declined'");
    expect(integrity).toContain("'already_in_state',true");
    expect(integrity).toContain("message='ALREADY_PARTICIPATING'");
    expect(integrity).toContain("message='OFFER_RESERVATION_INVALID'");
    expect(route).toContain("auth.rpc('phase8_respond_to_project_offer'");
    expect(route).toContain('participation:{creates_membership:false');
  });

  test('decline and expiry release reservation while acceptance keeps it reserved',()=>{
    const integrity=read('supabase/migrations/20260905232500_project_experience_phase_8_offer_integrity.sql');
    expect(integrity).toContain("set status='accepted',accepted_at=now_at,updated_at=now_at");
    expect(integrity).toContain("set status='declined',declined_at=now_at,capacity_released_at=now_at,updated_at=now_at");
    expect(integrity).toContain("set status='expired',expired_at=now_at,capacity_released_at=now_at,updated_at=now_at");
    expect(integrity).toContain("'creates_membership',false");
  });

  test('expired response persists instead of rolling back behind an exception',()=>{
    const integrity=read('supabase/migrations/20260905232500_project_experience_phase_8_offer_integrity.sql');
    expect(integrity).toContain("'status','expired'");
    expect(integrity).toContain("'expired',true");
    expect(integrity).toContain('because a raised PostgreSQL exception would roll the expiry transaction back');
    expect(integrity).not.toContain("message='OFFER_EXPIRED'");
  });

  test('member Offer UI shows the complete commitment and Partner context',()=>{
    const component=read('components/MemberProjectOffers.tsx');
    const page=read('app/member/applications/page.tsx');
    const mine=read('app/api/project-offers/mine/route.ts');
    expect(component).toContain('PROJECT PLACE OFFERS');
    expect(component).toContain('Commitment');
    expect(component).toContain('Duration');
    expect(component).toContain('Participation mode');
    expect(component).toContain('Team state');
    expect(component).toContain('Expected start');
    expect(component).toContain('ACCEPT BY');
    expect(component).toContain('Participation expectations');
    expect(component).toContain("partner?'Partner Project':'Mettelo Open Project'");
    expect(component).toContain('Partner organisation:');
    expect(component).toContain('Accept place');
    expect(component).toContain('Decline');
    expect(component).toContain('does not start the project or unlock the private workspace yet');
    expect(component).toContain('Discover projects');
    expect(mine).toContain('project_type,partner_name,weekly_commitment,duration_weeks');
    expect(mine).toContain('team_state:');
    expect(page).toContain('<MemberProjectOffers/>');
  });

  test('confirmation dialog and success state have explicit focus management',()=>{
    const component=read('components/MemberProjectOffers.tsx');
    expect(component).toContain('openerRef');
    expect(component).toContain('statusRef');
    expect(component).toContain('aria-describedby="mpo-dialog-description"');
    expect(component).toContain('tabIndex={-1}');
    expect(component).toContain('statusRef.current?.focus()');
    expect(component).toContain('openerRef.current?.isConnected&&openerRef.current.focus()');
  });

  test('scheduled processing reuses project formation cron with bounded reminder dedupe',()=>{
    const migration=read('supabase/migrations/20260905232000_project_experience_phase_8_project_offers.sql');
    const expiry=read('supabase/migrations/20260905232600_project_experience_phase_8_expiry_delivery_contract.sql');
    const cron=read('app/api/cron/project-formation/route.ts');
    expect(migration).toContain('phase8_claim_offer_reminders');
    expect(migration).toContain('reminder_sent_at is null');
    expect(migration).toContain("expires_at<=now()+interval '24 hours'");
    expect(expiry).toContain("return jsonb_build_object('expired',expired_count,'offers',expired_rows)");
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

  test('Offer analytics are canonical and do not include private review content',()=>{
    const integrity=read('supabase/migrations/20260905232500_project_experience_phase_8_offer_integrity.sql');
    expect(integrity).toContain("'offer_created'");
    expect(integrity).toContain("'offer_accepted'");
    expect(integrity).toContain("'offer_declined'");
    expect(integrity).toContain("'offer_expired'");
    expect(integrity).toContain("'decision_seconds'");
    expect(integrity).not.toContain('reviewer_notes');
    expect(integrity).not.toContain('contribution_statement');
    expect(integrity).not.toContain('portfolio_url');
  });
});
