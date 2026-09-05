import {createClient} from '@supabase/supabase-js';
import {expect,test} from '@playwright/test';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function localUrl(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 6 AUTO security test refuses non-local Supabase hosts.');return url}
function serviceDb(){return createClient(localUrl(),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
function memberDb(){return createClient(localUrl(),required('E2E_SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}

async function memberId(){const admin=serviceDb();const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const member=data.users.find(user=>user.email===required('E2E_MEMBER_EMAIL'));if(!member)throw new Error('Phase 6 security test requires the disposable member identity.');return member.id}

async function fixture(){
 const db=serviceDb();const {data:project,error:projectError}=await db.from('projects').select('id,admission_mode').limit(1).single();if(projectError||!project)throw projectError||new Error('Phase 6 security test requires a project fixture.');
 let {data:run,error:runError}=await db.from('project_runs').select('id,status,has_started,scheduled_start_at').eq('project_id',project.id).eq('has_started',false).limit(1).maybeSingle();if(runError)throw runError;let created=false;
 if(!run){const {data:latest}=await db.from('project_runs').select('run_number').eq('project_id',project.id).order('run_number',{ascending:false}).limit(1).maybeSingle();const createdRun=await db.from('project_runs').insert({project_id:project.id,run_number:(latest?.run_number||0)+1,status:'forming',team_size_threshold:1,required_team_size:1,has_started:false}).select('id,status,has_started,scheduled_start_at').single();if(createdRun.error||!createdRun.data)throw createdRun.error||new Error('Unable to create disposable Phase 6 run.');run=createdRun.data;created=true}
 return{db,project,run,created};
}

test.describe('Project Experience Phase 6 AUTO RLS and tampering',()=>{
 test('member cannot change admission policy, forge scheduling or activate a run',async()=>{
  const {db,project,run,created}=await fixture();const member=memberDb();const signIn=await member.auth.signInWithPassword({email:required('E2E_MEMBER_EMAIL'),password:required('E2E_MEMBER_PASSWORD')});if(signIn.error)throw signIn.error;
  const originalMode=project.admission_mode;const originalSchedule=run.scheduled_start_at;const projectAttempt=await member.from('projects').update({admission_mode:originalMode==='auto'?'review_required':'auto'}).eq('id',project.id).select('id');expect(projectAttempt.data||[]).toEqual([]);
  const forged='2099-01-01T00:00:00.000Z';const runAttempt=await member.from('project_runs').update({scheduled_start_at:forged,status:'active',has_started:true}).eq('id',run.id).select('id');expect(runAttempt.data||[]).toEqual([]);
  const [{data:projectAfter,error:projectAfterError},{data:runAfter,error:runAfterError}]=await Promise.all([db.from('projects').select('admission_mode').eq('id',project.id).single(),db.from('project_runs').select('scheduled_start_at,status,has_started').eq('id',run.id).single()]);if(projectAfterError)throw projectAfterError;if(runAfterError)throw runAfterError;expect(projectAfter.admission_mode).toBe(originalMode);expect(runAfter.scheduled_start_at).toBe(originalSchedule);expect(runAfter.has_started).toBe(false);expect(runAfter.status).not.toBe('active');if(created)await db.from('project_runs').delete().eq('id',run.id);
 });

 test('member cannot self-create project membership or execute service-only AUTO admission',async()=>{
  const {db,project,run,created}=await fixture();const userId=await memberId();await db.from('project_members').delete().eq('project_run_id',run.id).eq('user_id',userId);const member=memberDb();const signIn=await member.auth.signInWithPassword({email:required('E2E_MEMBER_EMAIL'),password:required('E2E_MEMBER_PASSWORD')});if(signIn.error)throw signIn.error;
  const insert=await member.from('project_members').insert({project_id:project.id,project_run_id:run.id,user_id:userId,project_role_id:null,team_role:'contributor',membership_status:'waiting'}).select('id');expect(insert.error).not.toBeNull();
  const {count,error:countError}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',run.id).eq('user_id',userId);if(countError)throw countError;expect(count||0).toBe(0);
  const rpc=await member.rpc('phase6_auto_admit_interest',{p_application_id:'00000000-0000-0000-0000-000000000001',p_participation_preference:'solo'});expect(rpc.error).not.toBeNull();expect(rpc.error?.message.toLowerCase()).toMatch(/permission|privilege|function/);if(created)await db.from('project_runs').delete().eq('id',run.id);
 });
});
