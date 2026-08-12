import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

export type ProjectRisk='standard'|'controlled'|'prohibited';
export type GovernanceStatus='draft'|'submitted'|'changes_requested'|'approved'|'recruiting'|'forming'|'active'|'review'|'completed'|'denied'|'paused';
export const archetypes=['analytics','data_engineering','machine_learning','generative_ai','research','visualisation','data_governance'] as const;
export function clean(value:unknown,max=2000){return String(value??'').trim().slice(0,max)}
export function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,92)}
export function classifyRisk(input:{declared?:unknown;partner?:unknown;sensitivity?:unknown;impact?:unknown;rightsConfirmed?:unknown;prohibited?:unknown}){
  const reasons:string[]=[];let level:ProjectRisk='standard';
  if(input.prohibited===true||input.prohibited==='true'){level='prohibited';reasons.push('The proposal includes a prohibited activity.');}
  if(input.rightsConfirmed!==true&&input.rightsConfirmed!=='true'){level='prohibited';reasons.push('Legitimate data access or usage rights were not confirmed.');}
  if(level!=='prohibited'&&(input.partner===true||input.partner==='true'||['restricted','confidential'].includes(String(input.sensitivity))||['health','finance','employment','high_impact_ai'].includes(String(input.impact)))){level='controlled';reasons.push('Partner, restricted, confidential or high-impact work requires Admin review.');}
  if(input.declared==='controlled'&&level==='standard'){level='controlled';reasons.push('The Project Architect declared additional oversight is needed.');}
  return{level,reasons,adminReviewRequired:level!=='standard'};
}
export async function architectContext(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
  if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Project service is not configured.'},{status:503})};
  const {data:identity}=await db.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle();
  if(identity?.account_type!=='project_architect'&&user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Approved Project Architect access is required.'},{status:403})};
  return{db,user,isAdmin:user.app_metadata?.role==='admin'};
}
export async function assignedRole(db:NonNullable<ReturnType<typeof serviceDb>>,projectId:string,userId:string){const {data}=await db.from('project_architect_assignments').select('assignment_role').eq('project_id',projectId).eq('user_id',userId).eq('assignment_status','active');return(data||[]).map(row=>row.assignment_role as string)}
export async function recordGovernance(db:NonNullable<ReturnType<typeof serviceDb>>,input:{projectId:string;actorId:string;actorScope:'project_architect'|'admin';eventType:string;from?:string|null;to?:string|null;reason:string;metadata?:Record<string,unknown>}){const {error}=await db.from('project_governance_events').insert({project_id:input.projectId,actor_user_id:input.actorId,actor_scope:input.actorScope,event_type:input.eventType,from_status:input.from||null,to_status:input.to||null,reason:input.reason,metadata:input.metadata||{}});if(error)throw error}
