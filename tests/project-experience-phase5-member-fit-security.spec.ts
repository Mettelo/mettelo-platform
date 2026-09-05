import {createClient} from '@supabase/supabase-js';
import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import {PROJECT_PARTICIPATION_TERMS_VERSION} from '../lib/project-participation-terms';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function localUrl(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 5 member-fit security test refuses non-local Supabase hosts.');return url}
function serviceDb(){return createClient(localUrl(),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
function memberDb(){return createClient(localUrl(),required('E2E_SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}

async function findUserIds(){const db=serviceDb();const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const member=data.users.find(user=>user.email===required('E2E_MEMBER_EMAIL'));const other=data.users.find(user=>user.email===required('E2E_ARCHITECT_EMAIL'));if(!member||!other)throw new Error('Phase 5 RLS test requires disposable member and architect identities.');return{memberId:member.id,otherId:other.id}}

test.describe('Project Experience Phase 5 member-fit RLS',()=>{
 test('member can read own profile and preferences but not another user profile/preferences',async()=>{
  const admin=serviceDb();const {memberId,otherId}=await findUserIds();const [{data:domain,error:domainError},{data:tool,error:toolError}]=await Promise.all([admin.from('domains').select('id').eq('is_active',true).limit(1).single(),admin.from('tools').select('id').eq('is_active',true).limit(1).single()]);if(domainError)throw domainError;if(toolError)throw toolError;if(!domain?.id||!tool?.id)throw new Error('Phase 5 RLS test requires at least one active domain and tool fixture.');for(const operation of [admin.from('profile_domain_preferences').upsert({user_id:memberId,domain_id:domain.id},{onConflict:'user_id,domain_id'}),admin.from('profile_domain_preferences').upsert({user_id:otherId,domain_id:domain.id},{onConflict:'user_id,domain_id'}),admin.from('profile_tool_preferences').upsert({user_id:memberId,tool_id:tool.id},{onConflict:'user_id,tool_id'}),admin.from('profile_tool_preferences').upsert({user_id:otherId,tool_id:tool.id},{onConflict:'user_id,tool_id'})]){const {error}=await operation;if(error)throw error}
  const member=memberDb();const signIn=await member.auth.signInWithPassword({email:required('E2E_MEMBER_EMAIL'),password:required('E2E_MEMBER_PASSWORD')});if(signIn.error)throw signIn.error;
  const ownProfile=await member.from('profiles').select('id,weekly_capacity,skills,preferred_roles').eq('id',memberId).single();expect(ownProfile.error).toBeNull();expect(ownProfile.data?.id).toBe(memberId);const otherProfile=await member.from('profiles').select('id,weekly_capacity,skills,preferred_roles').eq('id',otherId);expect(otherProfile.error).toBeNull();expect(otherProfile.data).toEqual([]);
  const ownDomains=await member.from('profile_domain_preferences').select('user_id,domain_id,domains(slug,name)').eq('user_id',memberId);expect(ownDomains.error).toBeNull();expect(ownDomains.data?.length).toBeGreaterThan(0);expect(ownDomains.data?.every(row=>row.user_id===memberId)).toBe(true);const otherDomains=await member.from('profile_domain_preferences').select('user_id,domain_id').eq('user_id',otherId);expect(otherDomains.error).toBeNull();expect(otherDomains.data).toEqual([]);
  const ownTools=await member.from('profile_tool_preferences').select('user_id,tool_id,tools(slug,name)').eq('user_id',memberId);expect(ownTools.error).toBeNull();expect(ownTools.data?.length).toBeGreaterThan(0);expect(ownTools.data?.every(row=>row.user_id===memberId)).toBe(true);const otherTools=await member.from('profile_tool_preferences').select('user_id,tool_id').eq('user_id',otherId);expect(otherTools.error).toBeNull();expect(otherTools.data).toEqual([]);
 });

 test('Member A cannot read or mutate Member B project request',async()=>{
  const admin=serviceDb();const {otherId}=await findUserIds();const {data:project,error:projectError}=await admin.from('projects').select('id').limit(1).single();if(projectError||!project)throw projectError||new Error('Phase 5 RLS test requires a project fixture.');
  await admin.from('project_applications').delete().eq('project_id',project.id).eq('user_id',otherId).eq('application_kind','interest');
  const now=new Date().toISOString();const {data:otherRequest,error:insertError}=await admin.from('project_applications').insert({project_id:project.id,user_id:otherId,project_role_id:null,status:'submitted',application_kind:'interest',contribution_statement:'Disposable cross-user Phase 5 RLS request used only inside the isolated local Supabase test.',terms_accepted_at:now,terms_version:PROJECT_PARTICIPATION_TERMS_VERSION,submitted_at:now}).select('id').single();if(insertError||!otherRequest)throw insertError||new Error('Could not seed cross-user request.');
  const member=memberDb();const signIn=await member.auth.signInWithPassword({email:required('E2E_MEMBER_EMAIL'),password:required('E2E_MEMBER_PASSWORD')});if(signIn.error)throw signIn.error;
  const readOther=await member.from('project_applications').select('id,user_id,status').eq('id',otherRequest.id);expect(readOther.error).toBeNull();expect(readOther.data).toEqual([]);
  const mutateOther=await member.from('project_applications').update({availability:'unauthorised-change-attempt'}).eq('id',otherRequest.id).select('id');expect(mutateOther.error).toBeNull();expect(mutateOther.data).toEqual([]);
  const {data:unchanged,error:verifyError}=await admin.from('project_applications').select('availability').eq('id',otherRequest.id).single();if(verifyError)throw verifyError;expect(unchanged.availability).not.toBe('unauthorised-change-attempt');
  await admin.from('project_applications').delete().eq('id',otherRequest.id);
 });

 test('database rejects a second active role-neutral interest for the same member and project',async()=>{
  const admin=serviceDb();const {memberId}=await findUserIds();const {data:project,error:projectError}=await admin.from('projects').select('id').limit(1).single();if(projectError||!project)throw projectError||new Error('Phase 5 uniqueness test requires a project fixture.');
  await admin.from('project_applications').delete().eq('project_id',project.id).eq('user_id',memberId).eq('application_kind','interest');
  const now=new Date().toISOString();const row={project_id:project.id,user_id:memberId,project_role_id:null,status:'submitted',application_kind:'interest',contribution_statement:'Disposable Phase 5 uniqueness request used only inside the isolated local Supabase test.',terms_accepted_at:now,terms_version:PROJECT_PARTICIPATION_TERMS_VERSION,submitted_at:now};
  const first=await admin.from('project_applications').insert(row).select('id').single();if(first.error||!first.data)throw first.error||new Error('Could not seed first Phase 5 interest.');
  const second=await admin.from('project_applications').insert(row).select('id');expect(second.error?.code).toBe('23505');
  await admin.from('project_applications').delete().eq('id',first.data.id);
 });

 test('source contract keeps Phase 5 member reads authenticated and applicant access separate from membership',async()=>{
  const page=fs.readFileSync('app/member/discover/[id]/page.tsx','utf8');const api=fs.readFileSync('app/api/project-applications/route.ts','utf8');const detail=fs.readFileSync('lib/project-detail-content.ts','utf8');const migration=fs.readFileSync('supabase/migrations/20260905170000_project_experience_phase_5_interest_uniqueness.sql','utf8');
  expect(page).toContain('createServerSupabaseClient');expect(page).toContain("supabase.from('profiles')");expect(page).toContain(".eq('id',user.id)");expect(page).toContain("profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id)");expect(page).toContain("profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id)");expect(page).not.toContain("serviceDb().from('profiles')");
  expect(api).not.toContain("from('project_members').insert");expect(api).toContain("from('project_applications').insert");expect(detail).toContain("row.sensitivity==='public'&&row.publish_policy==='permitted'&&row.governance_status==='green'");expect(detail).toContain('Approved project members receive authorised resource links');
  expect(migration).toContain('project_applications_one_active_interest_per_project_user');expect(migration).toContain("where application_kind='interest'");expect(migration).toContain("status not in ('declined','withdrawn')");
 });
});
