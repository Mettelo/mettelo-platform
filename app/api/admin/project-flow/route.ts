import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

async function adminContext(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return {error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin')return {error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db)return {error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return {db,user};
}

async function emailFor(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null;}

export async function GET(){
  try{
    const ctx=await adminContext();if('error' in ctx)return ctx.error;const {db}=ctx;
    const {data:projects,error}=await db.from('projects').select('id,title,status,team_size_threshold,forming_deadline,kickoff_at,lead_user_id,updated_at').in('status',['recruiting','open','forming','active','review']).order('updated_at',{ascending:false});if(error)throw error;
    const projectIds=(projects||[]).map(project=>project.id);
    const {data:members}=projectIds.length?await db.from('project_members').select('id,project_id,user_id,team_role,membership_status').in('project_id',projectIds).in('membership_status',['waiting','active']):{data:[]};
    const userIds=[...new Set((members||[]).map(member=>member.user_id))];
    const {data:profiles}=userIds.length?await db.from('profiles').select('id,full_name,headline').in('id',userIds):{data:[]};
    const names=new Map((profiles||[]).map(profile=>[profile.id,profile]));
    const items=(projects||[]).map(project=>{const team=(members||[]).filter(member=>member.project_id===project.id).map(member=>({id:member.user_id,name:names.get(member.user_id)?.full_name||'Mettelo member',headline:names.get(member.user_id)?.headline||null,team_role:member.team_role,membership_status:member.membership_status}));return {...project,filled:team.length,team};});
    return NextResponse.json({items});
  }catch(error){console.error('project flow admin list error',error);return NextResponse.json({error:'Unable to load team formation.'},{status:500});}
}

export async function POST(request:Request){
  try{
    const ctx=await adminContext();if('error' in ctx)return ctx.error;const {db}=ctx;
    const body=await request.json();const projectId=String(body.project_id||'');const action=String(body.action||'');const reason=String(body.reason||'').trim().slice(0,1200);
    if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
    const {data:project}=await db.from('projects').select('id,title,status,team_size_threshold,kickoff_at,lead_user_id').eq('id',projectId).maybeSingle();
    if(!project)return NextResponse.json({error:'Project not found.'},{status:404});

    if(action==='assign_lead'){
      const userId=String(body.user_id||'');if(!userId)return NextResponse.json({error:'Choose a team member.'},{status:400});
      const {data:member}=await db.from('project_members').select('id,membership_status').eq('project_id',projectId).eq('user_id',userId).in('membership_status',['waiting','active']).maybeSingle();
      if(!member)return NextResponse.json({error:'Project lead must be a current team member.'},{status:400});
      await db.from('project_members').update({team_role:'contributor'}).eq('project_id',projectId).eq('team_role','project_lead');
      const {error}=await db.from('project_members').update({team_role:'project_lead'}).eq('id',member.id);if(error)throw error;
      await db.from('projects').update({lead_user_id:userId,updated_at:new Date().toISOString()}).eq('id',projectId);
      const email=await emailFor(db,userId);await notifyUser(db,{userId,email,projectId,type:'project_lead_assigned',title:'You are the Project Lead',body:`You have been assigned as Project Lead for ${project.title}. You can now schedule the team meeting and allocate tasks.`,actionUrl:`/member/projects/${projectId}`,subject:`Project Lead assigned — ${project.title}`});
      return NextResponse.json({ok:true,message:'Project Lead updated.'});
    }

    if(action==='force_start'){
      const {data:members}=await db.from('project_members').select('user_id').eq('project_id',projectId).eq('membership_status','waiting');
      if(!members?.length)return NextResponse.json({error:'There are no approved waiting members to start this project.'},{status:409});
      const now=new Date().toISOString();
      await db.from('projects').update({status:'active',kickoff_at:project.kickoff_at||now,starts_at:project.kickoff_at||now,updated_at:now}).eq('id',projectId);
      await db.from('project_members').update({membership_status:'active',activated_at:now}).eq('project_id',projectId).eq('membership_status','waiting');
      await db.from('project_applications').update({status:'team_complete',updated_at:now}).eq('project_id',projectId).in('status',['approved','waiting_for_team','accepted']);
      await Promise.all(members.map(async member=>notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_force_started',title:'Your project is starting',body:`${project.title} has been started by Mettelo with the current team. Open the workspace to begin delivery.`,actionUrl:`/member/projects/${projectId}`,subject:`Your Mettelo project is starting — ${project.title}`})));
      return NextResponse.json({ok:true,message:`Project started with ${members.length} approved member${members.length===1?'':'s'}.`});
    }

    if(action==='cancel'){
      if(project.status==='completed')return NextResponse.json({error:'A completed project cannot be cancelled.'},{status:409});
      if(!reason)return NextResponse.json({error:'Add a cancellation reason so members understand what happened.'},{status:400});
      const {data:members}=await db.from('project_members').select('user_id').eq('project_id',projectId).in('membership_status',['waiting','active']);
      const now=new Date().toISOString();
      await db.from('projects').update({status:'cancelled',cancelled_at:now,cancellation_reason:reason,updated_at:now}).eq('id',projectId);
      await db.from('project_members').update({membership_status:'removed',left_at:now}).eq('project_id',projectId).in('membership_status',['waiting','active']);
      await db.from('project_applications').update({status:'declined',decision_at:now,decision_reason:`Project cancelled: ${reason}`,updated_at:now}).eq('project_id',projectId).in('status',['approved','waiting_for_team','team_complete','accepted']);
      await Promise.all((members||[]).map(async member=>notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_cancelled',title:'Project cancelled',body:`${project.title} has been cancelled. ${reason}`,actionUrl:'/member#applications',subject:`Project cancelled — ${project.title}`})));
      return NextResponse.json({ok:true,message:'Project cancelled and approved members notified.'});
    }

    return NextResponse.json({error:'Unknown project action.'},{status:400});
  }catch(error){console.error('project flow admin error',error);return NextResponse.json({error:'Unable to update project flow.'},{status:500});}
}
