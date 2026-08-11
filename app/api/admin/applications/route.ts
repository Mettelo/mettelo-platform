import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

const statuses=new Set(['in_review','shortlisted','approved','declined']);

async function adminDb(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user) return {error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin') return {error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db) return {error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return {db,user};
}

async function memberEmail(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){
  const {data}=await db.auth.admin.getUserById(userId);
  return data.user?.email||null;
}

export async function PATCH(request:Request){
  try{
    const connection=await adminDb();
    if('error' in connection) return connection.error;
    const {db}=connection;
    const body=await request.json();
    const id=String(body.id||'');
    const status=String(body.status||'');
    const reviewerNotes=String(body.reviewer_notes||'').trim().slice(0,1500);
    if(!id||!statuses.has(status)) return NextResponse.json({error:'Choose a valid application and status.'},{status:400});

    const {data:application,error:loadError}=await db.from('project_applications').select('id,project_id,project_role_id,user_id,status,projects(id,title,status,team_size_threshold,kickoff_at)').eq('id',id).single();
    if(loadError||!application) return NextResponse.json({error:'Application not found.'},{status:404});
    const project=Array.isArray(application.projects)?application.projects[0]:application.projects;
    if(!project)return NextResponse.json({error:'Project not found.'},{status:404});

    if(status==='declined'&&(['approved','waiting_for_team','team_complete','accepted'].includes(application.status)||project.status==='active')){
      return NextResponse.json({error:'This applicant has already joined the forming/active team. Remove or replace the team member through project controls instead of declining the application.'},{status:409});
    }

    if(status!=='approved'){
      const patch:{status:string;reviewer_notes:string|null;decision_reason?:string|null;decision_at?:string}={status,reviewer_notes:reviewerNotes||null};
      if(status==='declined'){patch.decision_reason=reviewerNotes||null;patch.decision_at=new Date().toISOString();}
      const {data:updated,error}=await db.from('project_applications').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('id,status').single();
      if(error)throw error;
      const email=await memberEmail(db,application.user_id);
      if(status==='declined')await notifyUser(db,{userId:application.user_id,email,projectId:application.project_id,applicationId:id,type:'application_declined',title:'Project application update',body:`Your application for ${project.title} was not selected.${reviewerNotes?` Reason: ${reviewerNotes}`:''}`,actionUrl:'/member#applications',subject:`Application update — ${project.title}`});
      return NextResponse.json({ok:true,application:updated});
    }

    const now=new Date().toISOString();
    const {error:memberError}=await db.from('project_members').upsert({project_id:application.project_id,user_id:application.user_id,project_role_id:application.project_role_id,team_role:'contributor',membership_status:'waiting'},{onConflict:'project_id,user_id'});
    if(memberError)throw memberError;

    await db.from('projects').update({status:['draft','pilot','recruiting','open'].includes(project.status)?'forming':project.status,updated_at:now}).eq('id',application.project_id);
    const {count}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',application.project_id).in('membership_status',['waiting','active']);
    const threshold=Number(project.team_size_threshold||5);
    const filled=count||0;
    const full=filled>=threshold;

    const {data:updated,error}=await db.from('project_applications').update({status:full?'team_complete':'waiting_for_team',reviewer_notes:reviewerNotes||null,approved_at:now,decision_at:now,decision_reason:null,updated_at:now}).eq('id',id).select('id,status').single();
    if(error)throw error;

    const applicantEmail=await memberEmail(db,application.user_id);
    await notifyUser(db,{userId:application.user_id,email:applicantEmail,projectId:application.project_id,applicationId:id,type:'application_approved',title:'Application approved',body:full?`You are approved for ${project.title}. The team threshold has been reached and kickoff is starting.`:`You are approved for ${project.title}. ${filled} of ${threshold} team spots are now filled.`,actionUrl:'/member#applications',subject:`Approved — ${project.title}`});

    if(full){
      await db.from('projects').update({status:'active',kickoff_at:project.kickoff_at||now,starts_at:project.kickoff_at||now,updated_at:now}).eq('id',application.project_id);
      await db.from('project_members').update({membership_status:'active',activated_at:now}).eq('project_id',application.project_id).eq('membership_status','waiting');
      await db.from('project_applications').update({status:'team_complete',updated_at:now}).eq('project_id',application.project_id).in('status',['approved','waiting_for_team','accepted']);
      const {data:members}=await db.from('project_members').select('user_id').eq('project_id',application.project_id).eq('membership_status','active');
      await Promise.all((members||[]).map(async member=>{
        const email=await memberEmail(db,member.user_id);
        return notifyUser(db,{userId:member.user_id,email,projectId:application.project_id,type:'project_kickoff',title:'Your project is starting',body:`${project.title} has reached ${filled} of ${threshold} spots and is now active. Open the workspace to meet the team and begin delivery.`,actionUrl:`/member/projects/${application.project_id}`,subject:`Your Mettelo project is starting — ${project.title}`});
      }));
    }

    return NextResponse.json({ok:true,application:updated,team:{filled,threshold,full},project_status:full?'active':'forming'});
  }catch(error){
    console.error('application review error',error);
    return NextResponse.json({error:'Unable to update this application.'},{status:500});
  }
}
