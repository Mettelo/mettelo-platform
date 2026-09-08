import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

 test.describe('Project Experience Phase 18B collaboration marketplace contract',()=>{
  test('collaboration needs remain canonical project/run recruitment intent rather than a duplicate project system',()=>{
   const migration=read('supabase/migrations/20260908101000_project_experience_phase_18_collaboration_needs.sql');
   for(const text of ['references public.projects(id)','references public.project_runs(id)','references public.project_roles(id)','references public.project_role_catalogue(id)','references public.domains(id)','references public.capabilities(id)','COLLABORATION_NEED_RUN_PROJECT_MISMATCH','COLLABORATION_NEED_RESPONSIBILITY_NOT_CANONICAL'])expect(migration).toContain(text);
   for(const duplicate of ['create table public.projects','create table public.project_runs','create table public.project_members','create table public.project_applications','create table public.project_offers'])expect(migration).not.toContain(duplicate);
  });

  test('Find a Team derives live project/run availability and supports the governed Phase 18B filters',()=>{
   const page=read('app/member/find-a-team/page.tsx');
   for(const text of ['project_collaboration_needs','phase9_project_run_capacity','recruitment_open','late_joining_enabled','late_joining_cutoff_at','capacity_available','collaboration_need=','name="q"','name="role"','name="capability"','name="domain"','name="commitment"'])expect(page).toContain(text);
   expect(page).toContain('action="/member/find-a-team"');
  });

  test('I’m Interested preserves the exact collaboration need through detail, apply, client submit and canonical application API',()=>{
   const detail=read('app/member/discover/[id]/page.tsx');const apply=read('app/member/discover/[id]/apply/page.tsx');const flow=read('components/MemberProjectApplicationFlow.tsx');const api=read('app/api/project-applications/route.ts');const migration=read('supabase/migrations/20260908102000_project_experience_phase_18_same_run_interest.sql');
   for(const text of ['collaboration_need','encodeURIComponent(collaborationNeedId)','/signin?next='])expect(detail).toContain(text);
   for(const text of ['collaboration_need','collaborationNeedId','MemberProjectApplicationFlow','re-check that exact project run'])expect(apply).toContain(text);
   for(const text of ['collaborationNeedId','collaboration_need_id:collaborationNeedId||null','exact run will be revalidated'])expect(flow).toContain(text);
   for(const text of ['collaboration_need_id','project_collaboration_needs','project_run_id','phase6_auto_admit_interest'])expect(api).toContain(text);
   for(const text of ['collaboration_need_id','phase18_target_run_id','phase18_target_collaboration_need_id','project_run_id'])expect(migration).toContain(text);
  });

  test('same-run admission extends the canonical Phase 6/9 machinery and does not directly bypass membership policy',()=>{
   const migration=read('supabase/migrations/20260908102000_project_experience_phase_18_same_run_interest.sql');const api=read('app/api/project-applications/route.ts');
   for(const text of ['phase6_auto_admit_interest','phase9_project_run_capacity','project_collaboration_needs','recruitment_open','late_joining_enabled','late_joining_cutoff_at'])expect(migration).toContain(text);
   expect(api).toContain("canonicalAdmissionMode(project.admission_mode)");
   expect(api).toContain("admissionMode==='auto'");
   expect(api).toContain("admission_mode_snapshot:'review_required'");
   expect(api).not.toContain("from('project_members').insert");
  });

  test('public collaboration projection is privacy-safe and only exposes live public opportunities',()=>{
   const route=read('app/api/public/collaboration-opportunities/route.ts');
   for(const text of ["p.visibility!=='public'",'phase9_project_run_capacity','capacity_available','recruitment_open','late_joining_enabled','late_joining_cutoff_at','closed_reason','interest_target'])expect(route).toContain(text);
   for(const privateField of ['created_by','invitee_email','actor_user_id','support','internal_notes','handover','project_member_id'])expect(route).not.toContain(privateField);
  });

  test('public sharing uses safe canonical URLs and includes LinkedIn, X, WhatsApp and Copy Link',()=>{
   const share=read('components/CollaborationShareActions.tsx');const publicPage=read('app/collaborate/[id]/page.tsx');
   for(const text of ['linkedin.com','twitter.com','wa.me','navigator.clipboard','Copy'])expect(share).toContain(text);
   expect(publicPage).toContain('https://mettelo.com/collaborate/');
   expect(publicPage).toContain('Private project workspace information is never included.');
   expect(publicPage).not.toContain('created_by');expect(publicPage).not.toContain('project_member_id');expect(publicPage).not.toContain('invitee_email');
  });

  test('closed or full public opportunities remain safe landing pages and are not indexed as live recruitment',()=>{
   const page=read('app/collaborate/[id]/page.tsx');
   for(const text of ['robots:{index:item.accepting','This project is no longer accepting collaborators.','capacity_available','recruitment_open','late_joining_cutoff_at'])expect(page).toContain(text);
  });

  test('signup, verification and onboarding preserve exact opportunity or invite continuation through safe relative next',()=>{
   const signin=read('app/signin/AuthAccountClient.tsx');const callback=read('app/auth/callback/route.ts');const onboarding=read('app/onboarding/page.tsx');const publicPage=read('app/collaborate/[id]/page.tsx');
   for(const text of ["value.startsWith('/')&&!value.startsWith('//')","/onboarding?next=${encodeURIComponent(next)}",'emailRedirectTo:redirect'])expect(signin).toContain(text);
   for(const text of ["value.startsWith('/')&&!value.startsWith('//')",'target.searchParams.set(\'next\',next)','mettelo_identity_next:next'])expect(callback).toContain(text);
   for(const text of ["item.startsWith('/')&&!item.startsWith('//')",'returnTo={next}','if(profile.onboarding_completed_at)redirect(next)'])expect(onboarding).toContain(text);
   for(const text of ['inviteLanding','/signin?next=${encodeURIComponent(inviteToken?inviteLanding:interestTarget)}'])expect(publicPage).toContain(text);
  });

  test('external invitations store only hashed one-time tokens and are scoped, expiring, revocable and rate-limited',()=>{
   const migration=read('supabase/migrations/20260908103000_project_experience_phase_18_external_collaboration_invites.sql');const route=read('app/api/external-collaboration-invitations/route.ts');
   for(const text of ['token_hash text not null unique','invitee_email_hash','expires_at timestamptz not null','status in (\'pending\',\'accepted\',\'declined\',\'expired\',\'revoked\',\'invalidated\')','enable row level security','revoke all on table public.project_external_collaboration_invites from public,anon,authenticated','grant all on table public.project_external_collaboration_invites to service_role','EXTERNAL_INVITE_RATE_LIMITED'])expect(migration).toContain(text);
   expect(migration).not.toContain('raw_token');expect(migration).not.toContain(' token text');
   for(const text of ['randomBytes(32)','createHash(\'sha256\')','7*24*60*60*1000','phase18_consume_external_invite_rate_limit','status:\'revoked\''])expect(route).toContain(text);
  });

  test('external invite redemption prevents replay and IDOR and converges on canonical interest rather than membership',()=>{
   const route=read('app/api/external-collaboration-invitations/route.ts');
   for(const text of ["invite.status!=='pending'","user.email.trim().toLowerCase()!==invite.invitee_email","status:'expired'","status:'accepted'","accepted_by:user.id","INVITE_REPLAYED",'interest_target:`/member/discover/${invite.project_id}?collaboration_need='])expect(route).toContain(text);
   expect(route).not.toContain("from('project_members').insert");
  });

  test('external invitation delivery reuses the existing notification outbox instead of inventing another mail system',()=>{
   const route=read('app/api/external-collaboration-invitations/route.ts');const flow=read('lib/project-flow.ts');
   for(const text of ['enqueueEmail','deliverOutboxItem','project_external_collaboration_invite'])expect(route).toContain(text);
   expect(flow).toContain("export {notifyUser,notifyAdmins,processEmailQueue,deliverOutboxItem,enqueueEmail} from '@/lib/notifications'");
  });

  test('Phase 16 replacement state projects into the same collaboration marketplace and same run',()=>{
   const bridge=read('supabase/migrations/20260908104000_project_experience_phase_18_phase16_marketplace_bridge.sql');const phase16=read('supabase/migrations/20260907193200_project_experience_phase_16_structured_handover_recovery.sql');
   for(const text of ['replacement_needed','replacement_source_membership_id','project_member_responsibilities','project_collaboration_needs','project_run_id=new.id',"source='phase16_replacement'",'phase16_replacement_filled'])expect(bridge).toContain(text);
   for(const text of ['replacement_needed boolean','replacement_source_membership_id','recruitment_open=true'])expect(phase16).toContain(text);
   for(const duplicate of ['create table public.project_runs','create table public.project_members','create table public.project_applications','create table public.project_offers'])expect(bridge).not.toContain(duplicate);
  });

  test('Member Home shows a small curated live set rather than an endless collaboration feed',()=>{
   const home=read('app/member/page.tsx');const component=read('components/MemberHomeCollaborationOpportunities.tsx');
   expect(home).toContain('<MemberHomeCollaborationOpportunities/>');
   for(const text of [".limit(24)",".slice(0,3)",'phase9_project_run_capacity','capacity_available','late_joining_cutoff_at','excluded.has(need.project_id)','domainIds.has','rolePrefs.some','skillSet.has','/member/find-a-team'])expect(component).toContain(text);
  });

  test('Phase 18B remains explicitly scoped in the acceptance authority and cannot imply final Phase 18 approval',()=>{
   const readiness=read('docs/PHASE_18_READINESS.md');const matrix=read('docs/PHASE_18_ACCEPTANCE_MATRIX.md');
   for(const text of ['US 75–129','US 140–153','US 230–233','Tests 40–88'])expect(readiness).toContain(text);
   expect(matrix).toContain('273 / 273 assigned');expect(matrix).toContain('137 / 137 assigned');expect(matrix).toContain('112 / 112 required');
   expect(matrix).toContain('Phase 18C');expect(matrix).toContain('NOT STARTED');
  });
 });
