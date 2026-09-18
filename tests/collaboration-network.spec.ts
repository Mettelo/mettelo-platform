import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const read=(path:string)=>fs.readFileSync(path,'utf8');

test.describe('Canonical Collaboration Network',()=>{
 test('member navigation exposes one collaboration destination',()=>{
  const nav=read('lib/member-navigation.ts');
  expect(nav).toContain("label:'Collaboration Network',href:'/member/collaboration'");
  expect(nav).not.toContain("label:'Find a Team'");
  expect(nav).not.toContain("label:'Find Collaborators'");
 });
 test('legacy collaboration routes converge on the canonical page',()=>{
  const team=read('app/member/find-a-team/page.tsx');
  const people=read('app/member/find-collaborators/page.tsx');
  expect(team).toContain("redirect('/member/collaboration?view=teams')");
  expect(people).toContain("new URLSearchParams({view:'people'})");
  expect(people).toContain('/member/collaboration?');
 });
 test('People and Teams & Projects share one canonical member surface',()=>{
  const page=read('app/member/collaboration/page.tsx');
  for(const text of ['Collaboration Network','People','Teams & Projects','YOUR CURRENT PROJECT CONTEXT','Teams looking for collaborators','MemberCollaboratorDiscovery'])expect(page).toContain(text);
  expect(page).toContain("requestedView=one(params.view)==='teams'?'teams':'people'");
 });
 test('Lab context is server verified before team request controls are enabled',()=>{
  const page=read('app/member/collaboration/page.tsx');
  for(const text of [".eq('project_id',requestedProjectId)",".eq('project_run_id',requestedRunId)",".eq('user_id',user.id)",".eq('membership_status','active')",'phase9_project_run_capacity'])expect(page).toContain(text);
  expect(page).toContain('Team request controls remain unavailable');
 });
 test('People view leads with recommendations and keeps search bounded',()=>{
  const discovery=read('components/MemberCollaboratorDiscovery.tsx');
  const api=read('app/api/member-discovery/route.ts');
  for(const text of ['RECOMMENDED COLLABORATORS','Recommended collaborators','SEARCH THE NETWORK','Search by name, @username, role, capability or domain'])expect(discovery).toContain(text);
  for(const text of ["url.searchParams.get('role')","url.searchParams.get('capability')","url.searchParams.get('domain')","url.searchParams.get('availability')","url.searchParams.get('commitment')"])expect(api).toContain(text);
  expect(api).toContain('Math.min(Math.max(Math.trunc(requestedLimit),1),20)');
 });
 test('collaborator profiles remain projected through privacy-preserving discovery',()=>{
  const profile=read('app/member/collaboration/people/[username]/page.tsx');
  const migration=read('supabase/migrations/20260908100000_project_experience_phase_18_member_discovery.sql');
  expect(profile).toContain("rpc('phase18_search_discoverable_members'");
  expect(profile).not.toContain(".from('profiles')");
  for(const text of ['p.is_public is true','allow_project_invitations'])expect(migration).toContain(text);
 });
 test('team requests reuse canonical pending invitations and never create membership directly',()=>{
  const discovery=read('components/MemberCollaboratorDiscovery.tsx');
  const invitations=read('app/api/member-collaboration-invitations/route.ts');
  expect(discovery).toContain('/api/member-collaboration-invitations');
  expect(discovery).toContain('Membership has not been created');
  expect(invitations).toContain("status:'pending'");
  expect(invitations).not.toContain(".from('project_members').insert");
  for(const text of ['phase9_project_run_capacity','blocked(db,user.id,invitee.id)','phase18_consume_member_invite_rate_limit'])expect(invitations).toContain(text);
 });
 test('Teams & Projects consumes canonical collaboration needs and live capacity',()=>{
  const page=read('app/member/collaboration/page.tsx');
  for(const text of ['project_collaboration_needs','phase9_project_run_capacity',"neq('source','direct_invite')",'capacity_available','View collaboration need'])expect(page).toContain(text);
  expect(page).not.toContain('create table');
 });
 test('member-facing Grow Team no longer renders raw run identifiers',()=>{
  const actions=read('components/ProjectGrowTeamActions.tsx');
  expect(actions).toContain('/member/collaboration?view=people&project_id=');
  expect(actions).not.toContain('<dt>Run</dt>');
  expect(actions).not.toContain('<span>Project / run</span>');
  expect(actions).not.toContain('projectTitle} ·');
 });
 test('responsive controls preserve touch and reflow',()=>{
  const page=read('app/member/collaboration/page.tsx');
  const discovery=read('components/MemberCollaboratorDiscovery.tsx');
  expect(page).toContain('@media(max-width:700px)');
  expect(page).toContain('@media(max-width:390px)');
  expect(discovery).toContain('@media(max-width:640px)');
  expect(discovery).toContain('@media(max-width:360px)');
  expect(discovery).toContain('<details className="mcdFilterPanel">');
  expect(discovery).toContain('min-height:44px');
 });
});
