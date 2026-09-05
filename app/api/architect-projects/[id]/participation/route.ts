import {NextResponse} from 'next/server';
import {architectContext,assignedRole} from '@/lib/project-governance';
import {parseProjectParticipation,validateProjectParticipation} from '@/lib/project-participation';

type Context={params:Promise<{id:string}>};
function uuid(value:unknown){const id=String(value||'').trim();return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)?id:''}

async function access(projectId:string){
  const ctx=await architectContext();
  if('error'in ctx)return{error:ctx.error} as const;
  const {db,user,isAdmin}=ctx;
  const {data:project,error}=await db.from('projects').select('id,governance_status,participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold').eq('id',projectId).maybeSingle();
  if(error)throw error;
  if(!project)return{error:NextResponse.json({error:'Project proposal not found.'},{status:404})} as const;
  const roles=await assignedRole(db,projectId,user.id);
  if(!isAdmin&&!roles.includes('creating_architect'))return{error:NextResponse.json({error:'Creating Project Architect access is required.'},{status:403})} as const;
  return{db,user,isAdmin,project} as const;
}

export async function GET(_:Request,{params}:Context){
  try{
    const {id}=await params;const projectId=uuid(id);if(!projectId)return NextResponse.json({error:'Valid project ID required.'},{status:400});
    const ctx=await access(projectId);if('error'in ctx)return ctx.error;
    return NextResponse.json({item:ctx.project,editable:['draft','changes_requested'].includes(ctx.project.governance_status)});
  }catch(error){console.error('project participation load error',error);return NextResponse.json({error:'Unable to load project participation.'},{status:500})}
}

export async function PATCH(request:Request,{params}:Context){
  try{
    const {id}=await params;const projectId=uuid(id);if(!projectId)return NextResponse.json({error:'Valid project ID required.'},{status:400});
    const ctx=await access(projectId);if('error'in ctx)return ctx.error;
    if(!['draft','changes_requested'].includes(ctx.project.governance_status))return NextResponse.json({error:'Participation can only be edited while the proposal is Draft or Changes Requested.'},{status:409});
    const body=await request.json();
    const participation=parseProjectParticipation(body&&typeof body==='object'?body:{});
    const validation=validateProjectParticipation(participation);if(validation)return NextResponse.json({error:validation},{status:400});
    const {error}=await ctx.db.rpc('apply_project_participation_revision',{
      target_project_id:projectId,
      actor_user_id:ctx.user.id,
      actor_scope_value:ctx.isAdmin?'admin':'project_architect',
      target_participation_mode:participation.participation_mode,
      target_min_team_size:participation.min_team_size,
      target_target_team_size:participation.target_team_size,
      target_max_team_size:participation.max_team_size
    });
    if(error){
      if(error.message.includes('PROJECT_NOT_EDITABLE'))return NextResponse.json({error:'This proposal is no longer editable because its governance state changed.'},{status:409});
      if(error.message.includes('INVALID_'))return NextResponse.json({error:'Choose a valid participation mode and capacity.'},{status:400});
      throw error;
    }
    return NextResponse.json({ok:true,item:participation});
  }catch(error){console.error('project participation update error',error);return NextResponse.json({error:'Unable to update project participation.'},{status:500})}
}
