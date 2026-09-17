import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyAdmins,notifyUser,serviceDb} from '@/lib/project-flow';

function clean(value:unknown,max=4000){return String(value??'').trim().slice(0,max)}
async function emailFor(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null}
function rpcStatus(error:{message?:string;code?:string}){const message=error.message||'';if(error.code==='42501'||message.includes('NOT_AUTHORIZED')||message.includes('AUTHENTICATION_REQUIRED'))return 403;if(error.code==='P0002'||message.includes('NOT_FOUND'))return 404;if(error.code==='22023'||message.includes('_REQUIRED'))return 400;return 409}

async function authority(db:NonNullable<ReturnType<typeof serviceDb>>,projectId:string,runId:string,user:{id:string;app_metadata?:Record<string,unknown>}){
 const [{data:member},{data:architect},{data:delegation}]=await Promise.all([
  db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
  db.from('project_architect_assignments').select('id').eq('project_id',projectId).eq('user_id',user.id).eq('assignment_status','active').limit(1).maybeSingle(),
  db.from('project_submission_permissions').select('id').eq('project_run_id',runId).eq('user_id',user.id).is('revoked_at',null).maybeSingle()
 ]);
 const isAdmin=user.app_metadata?.role==='admin';const active=member&&['active','completed'].includes(member.membership_status);return{member,canGrant:Boolean(isAdmin||architect||(active&&member.team_role==='project_lead')),delegated:Boolean(delegation)}
}

export async function POST(request:Request){
 try{
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const db=serviceDb();if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});const body=await request.json();const action=clean(body.action,40),projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80);if(!projectId||!runId)return NextResponse.json({error:'Project and team are required.'},{status:400});
  const [{data:project},{data:run}]=await Promise.all([
   db.from('projects').select('id,title,project_type,presentation_required,github_repo_required,final_proof_required,github_url,status').eq('id',projectId).maybeSingle(),
   db.from('project_runs').select('id,run_number,status,has_started,recruitment_open,completed_at,completion_state,completion_completed_at').eq('id',runId).eq('project_id',projectId).maybeSingle()
  ]);if(!project||!run)return NextResponse.json({error:'Project team not found.'},{status:404});const access=await authority(db,projectId,runId,user);

  if(action==='grant'||action==='revoke'){
   if(!access.canGrant)return NextResponse.json({error:'Only an Admin, assigned Project Architect, or Project Leader can delegate final-proof submission.'},{status:403});const target=clean(body.user_id,80);if(!target)return NextResponse.json({error:'Choose a team member.'},{status:400});const {data:targetMember}=await db.from('project_members').select('id,membership_status').eq('project_run_id',runId).eq('user_id',target).maybeSingle();if(!targetMember||!['waiting','active'].includes(targetMember.membership_status))return NextResponse.json({error:'Delegation must target a current member of this team.'},{status:400});const now=new Date().toISOString();if(action==='grant'){const {data,error}=await db.from('project_submission_permissions').upsert({project_id:projectId,project_run_id:runId,user_id:target,granted_by_user_id:user.id,granted_at:now,revoked_at:null,revoked_by_user_id:null},{onConflict:'project_run_id,user_id'}).select('*').single();if(error)throw error;await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'final_proof_permission_granted',actor_type:'user',actor_user_id:user.id,metadata:{delegated_user_id:target}});return NextResponse.json({ok:true,permission:data})}const {data,error}=await db.from('project_submission_permissions').update({revoked_at:now,revoked_by_user_id:user.id}).eq('project_run_id',runId).eq('user_id',target).is('revoked_at',null).select('*').maybeSingle();if(error)throw error;await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'final_proof_permission_revoked',actor_type:'user',actor_user_id:user.id,metadata:{delegated_user_id:target}});return NextResponse.json({ok:true,permission:data});
  }

  if(action!=='submit')return NextResponse.json({error:'Unknown final-proof action.'},{status:400});
  const summary=clean(body.summary,4000),evidenceUrl=clean(body.evidence_url,800),githubUrl=clean(body.github_url,800)||clean(project.github_url,800);
  if(summary.length<30)return NextResponse.json({error:'Describe the final Proof in at least 30 characters.'},{status:400});if(project.final_proof_required&&!evidenceUrl)return NextResponse.json({error:'This project requires a final Proof/deliverable URL.'},{status:400});if(project.github_repo_required&&!githubUrl)return NextResponse.json({error:'This project requires a published GitHub repository before completion.'},{status:409});

  // Atomic exact-run submission. The authenticated RPC locks the run, re-checks server-side
  // authority/readiness, supersedes the prior submission, freezes recruitment and either
  // enters Partner review or completes an Open cohort. It never creates or verifies Proof.
  const {data:result,error}=await auth.rpc('phase19_submit_final_proof',{
   p_project_id:projectId,p_run_id:runId,p_summary:summary,p_evidence_url:evidenceUrl||null,p_github_url:githubUrl||null
  });
  if(error)return NextResponse.json({error:error.message||'Unable to submit final Proof.'},{status:rpcStatus(error)});
  const outcome=(result||{}) as {ok?:boolean;idempotent?:boolean;submission?:{id?:string};completion?:string;review_required?:boolean;request_id?:string;completed_at?:string;recruitment_frozen?:boolean};

  if(outcome.completion==='completed'){
   const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('membership_status','completed');
   for(const member of members||[])await notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_completed',title:'Open project cohort completed',body:`Team ${run.run_number} for ${project.title} completed after all configured project-level completion conditions and final submission were satisfied. Individual Verified Proof remains subject to contribution verification.`,actionUrl:`/member/projects/${projectId}?run=${runId}#proof`,subject:`Project cohort completed: ${project.title}`,templateKey:'project_completed'});
   return NextResponse.json(outcome);
  }

  if(outcome.review_required){
   await notifyAdmins(db,{projectId,type:'project_completion_review',title:`Partner completion review: ${project.title}`,body:`Team ${run.run_number} has satisfied its configured project-level completion conditions. A final submission is ready for secure review in Mettelo.`,actionUrl:`/member/projects/${projectId}?run=${runId}#completion`,subject:`Partner completion review: ${project.title}`,dedupeKey:`partner-completion:${runId}:${outcome.submission?.id||outcome.request_id}`});
  }
  return NextResponse.json(outcome);
 }catch(error){console.error('final proof error',error);return NextResponse.json({error:'Unable to update final Proof.'},{status:500})}
}
