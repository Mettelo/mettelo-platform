import {createClient} from '@supabase/supabase-js';
import {expect,test} from '@playwright/test';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function localUrl(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 5 member-fit security test refuses non-local Supabase hosts.');return url}
function serviceDb(){return createClient(localUrl(),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
function memberDb(){return createClient(localUrl(),required('E2E_SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}

async function findUserIds(){
 const db=serviceDb();const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;
 const member=data.users.find(user=>user.email===required('E2E_MEMBER_EMAIL'));const other=data.users.find(user=>user.email===required('E2E_ARCHITECT_EMAIL'));
 if(!member||!other)throw new Error('Phase 5 RLS test requires disposable member and architect identities.');
 return{memberId:member.id,otherId:other.id};
}

test.describe('Project Experience Phase 5 member-fit RLS',()=>{
 test('member can read own profile and preferences but not another user profile/preferences',async()=>{
  const admin=serviceDb();const {memberId,otherId}=await findUserIds();
  const [{data:domain,error:domainError},{data:tool,error:toolError}]=await Promise.all([
   admin.from('domains').select('id').eq('is_active',true).limit(1).single(),
   admin.from('tools').select('id').eq('is_active',true).limit(1).single()
  ]);
  if(domainError)throw domainError;if(toolError)throw toolError;
  for(const operation of [
   admin.from('profile_domain_preferences').upsert({user_id:memberId,domain_id:domain.id},{onConflict:'user_id,domain_id'}),
   admin.from('profile_domain_preferences').upsert({user_id:otherId,domain_id:domain.id},{onConflict:'user_id,domain_id'}),
   admin.from('profile_tool_preferences').upsert({user_id:memberId,tool_id:tool.id},{onConflict:'user_id,tool_id'}),
   admin.from('profile_tool_preferences').upsert({user_id:otherId,tool_id:tool.id},{onConflict:'user_id,tool_id'})
  ]){const {error}=await operation;if(error)throw error;}

  const member=memberDb();const signIn=await member.auth.signInWithPassword({email:required('E2E_MEMBER_EMAIL'),password:required('E2E_MEMBER_PASSWORD')});if(signIn.error)throw signIn.error;

  const ownProfile=await member.from('profiles').select('id,weekly_capacity,skills,preferred_roles').eq('id',memberId).single();expect(ownProfile.error).toBeNull();expect(ownProfile.data?.id).toBe(memberId);
  const otherProfile=await member.from('profiles').select('id,weekly_capacity,skills,preferred_roles').eq('id',otherId);expect(otherProfile.error).toBeNull();expect(otherProfile.data).toEqual([]);

  const ownDomains=await member.from('profile_domain_preferences').select('user_id,domain_id,domains(slug,name)').eq('user_id',memberId);expect(ownDomains.error).toBeNull();expect(ownDomains.data?.length).toBeGreaterThan(0);expect(ownDomains.data?.every(row=>row.user_id===memberId)).toBe(true);
  const otherDomains=await member.from('profile_domain_preferences').select('user_id,domain_id').eq('user_id',otherId);expect(otherDomains.error).toBeNull();expect(otherDomains.data).toEqual([]);

  const ownTools=await member.from('profile_tool_preferences').select('user_id,tool_id,tools(slug,name)').eq('user_id',memberId);expect(ownTools.error).toBeNull();expect(ownTools.data?.length).toBeGreaterThan(0);expect(ownTools.data?.every(row=>row.user_id===memberId)).toBe(true);
  const otherTools=await member.from('profile_tool_preferences').select('user_id,tool_id').eq('user_id',otherId);expect(otherTools.error).toBeNull();expect(otherTools.data).toEqual([]);
 });

 test('source contract keeps Phase 5 member reads authenticated and user-scoped',async()=>{
  const fs=await import('node:fs');const page=fs.readFileSync('app/member/discover/[id]/page.tsx','utf8');
  expect(page).toContain('createServerSupabaseClient');expect(page).toContain("supabase.from('profiles')");expect(page).toContain(".eq('id',user.id)");expect(page).toContain("profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id)");expect(page).toContain("profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id)");
  expect(page).not.toContain("serviceDb().from('profiles')");expect(page).not.toContain("serviceDb().from('profile_domain_preferences')");expect(page).not.toContain("serviceDb().from('profile_tool_preferences')");
 });
});
