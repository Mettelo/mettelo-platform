import {createClient} from '@supabase/supabase-js';
import {expect,test} from '@playwright/test';

const projectId='00000000-0000-4000-8000-00000000b704';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function localUrl(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 7 run privacy tests refuse non-local Supabase hosts.');return url}
function service(){return createClient(localUrl(),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
function browserClient(){return createClient(localUrl(),required('E2E_SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}

async function cleanup(){const db=service();await db.from('project_runs').delete().eq('project_id',projectId);await db.from('projects').delete().eq('id',projectId)}

async function seed(){
 const db=service();await cleanup();
 const {error:projectError}=await db.from('projects').insert({id:projectId,slug:'phase7-run-privacy',title:'Phase 7 run privacy fixture',summary:'Disposable Phase 7 run privacy fixture.',problem_statement:'Validate safe public run status without exposing Admin operational metadata.',status:'open',visibility:'public',project_type:'open',applications_open:true,team_size_threshold:1,min_team_size:1,target_team_size:1,max_team_size:2,participation_mode:'team',admission_mode:'auto'});if(projectError)throw projectError;
 const {data,error}=await db.from('project_runs').insert({project_id:projectId,run_number:1,status:'forming',team_size_threshold:1,required_team_size:1,has_started:false,recruitment_open:true,auto_start_pause_reason:'Private governance note',auto_start_block_reason:'Private security note',auto_start_failure:'private-diagnostic'}).select('id').single();if(error||!data)throw error||new Error('Could not seed Phase 7 run privacy fixture.');return data.id;
}

test.describe('Project Experience Phase 7 run operational privacy',()=>{
 test('anon sees safe run state but cannot select private operational columns',async()=>{const runId=await seed();try{const anon=browserClient();const safe=await anon.from('project_runs').select('id,status,has_started,recruitment_open,auto_start_paused_at,auto_start_blocked_at').eq('id',runId).single();expect(safe.error).toBeNull();expect(safe.data).toMatchObject({id:runId,status:'forming',has_started:false,recruitment_open:true});for(const column of ['auto_start_pause_reason','auto_start_paused_by_user_id','auto_start_block_reason','auto_start_blocked_by_user_id','auto_start_failure']){const result=await anon.from('project_runs').select(`id,${column}`).eq('id',runId);expect(result.error,`anon unexpectedly selected ${column}`).toBeTruthy()}}finally{await cleanup()}});

 test('ordinary authenticated member cannot read private operational columns',async()=>{const runId=await seed();try{const member=browserClient();const {error:authError}=await member.auth.signInWithPassword({email:required('E2E_MEMBER_EMAIL'),password:required('E2E_MEMBER_PASSWORD')});if(authError)throw authError;const safe=await member.from('project_runs').select('id,status,scheduled_start_at').eq('id',runId).single();expect(safe.error).toBeNull();const denied=await member.from('project_runs').select('id,auto_start_block_reason').eq('id',runId);expect(denied.error).toBeTruthy()}finally{await cleanup()}});

 test('service role retains full operational visibility',async()=>{const runId=await seed();try{const result=await service().from('project_runs').select('id,auto_start_pause_reason,auto_start_block_reason,auto_start_failure').eq('id',runId).single();expect(result.error).toBeNull();expect(result.data).toMatchObject({id:runId,auto_start_pause_reason:'Private governance note',auto_start_block_reason:'Private security note',auto_start_failure:'private-diagnostic'})}finally{await cleanup()}});
});
