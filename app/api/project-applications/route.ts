import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {notifyAdmins,notifyUser,serviceDb} from '@/lib/project-flow';

function acceptsApplications(project:{status:string;project_type:string;applications_open?:boolean|null}){
  if(project.applications_open===false)return false;
  if(project.project_type==='open')return !['pilot','completed','archived','cancelled'].includes(project.status);
  return ['recruiting','open','forming'].includes(project.status);
}

export async function POST(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Sign in before registering project interest or applying.'},{status:401});

    const body=await request.json();
    const projectId=String(body.project_id||'');
    const requestedKind=String(body.application_kind||'application')==='interest'?'interest':'application';
    const roleId=String(body.project_role_id||'');
    const requestedRole=String(body.requested_role||'').trim().slice(0,160);
    const statement=String(body.contribution_statement||'').trim().slice(0,2000);
    const portfolio=String(body.portfolio_url||'').trim().slice(0,400);
    const availability=String(body.availability||'').trim().slice(0,160);

    if(!projectId||statement.length<40) return NextResponse.json({error:'Choose a project and explain your contribution in at least 40 characters.'},{status:400});

    const {data:project,error:projectError}=await supabase.from('projects').select('id,title,status,visibility,project_type,application_deadline,applications_open').eq('id',projectId).single();
    if(projectError||!project) return NextResponse.json({error:'Project not found.'},{status:404});
    if(project.application_deadline&&new Date(project.application_deadline).getTime()<Date.now())return NextResponse.json({error:'The application deadline for this project has passed.'},{status:409});

    const isInterest=requestedKind==='interest';
    if(project.applications_open===false)return NextResponse.json({error:'Applications are currently closed for this project.'},{status:409});
    if(isInterest&&(!['pilot','recruiting','open','forming','active','review'].includes(project.status)||project.visibility!=='public')) return NextResponse.json({error:'This project is not currently accepting interest.'},{status:400});
    if(!isInterest&&!acceptsApplications(project)) return NextResponse.json({error:'This project is not currently accepting applications.'},{status:400});

    let role:{id:string;title:string}|null=null;
    if(!isInterest){
      if(!roleId) return NextResponse.json({error:'Choose a project role.'},{status:400});
      const {data,error}=await supabase.from('project_roles').select('id,project_id,title').eq('id',roleId).eq('project_id',projectId).single();
      if(error||!data) return NextResponse.json({error:'Choose a valid role for this project.'},{status:400});
      role={id:data.id,title:data.title};
    }else if(!requestedRole){
      return NextResponse.json({error:'Choose the contribution area you are interested in.'},{status:400});
    }

    const {data,error}=await supabase.from('project_applications').insert({
      project_id:projectId,
      project_role_id:role?.id||null,
      user_id:user.id,
      portfolio_url:portfolio||null,
      contribution_statement:statement,
      availability:availability||null,
      status:'submitted',
      application_kind:isInterest?'interest':'application',
      requested_role:isInterest?requestedRole:null
    }).select('id,status,application_kind').single();

    if(error){
      if(error.code==='23505'){
        let existingQuery=supabase.from('project_applications').select('id,status,application_kind').eq('project_id',projectId).eq('user_id',user.id).eq('application_kind',isInterest?'interest':'application');
        if(!isInterest) existingQuery=existingQuery.eq('project_role_id',role?.id||'');
        const {data:existing}=await existingQuery.maybeSingle();
        if(existing){
          console.info('[project-applications] idempotent duplicate accepted',{kind:existing.application_kind,status:existing.status});
          return NextResponse.json({ok:true,already_submitted:true,application:existing});
        }
        return NextResponse.json({error:isInterest?'You already registered interest in this project.':'You already have an active application for this project role. Track it in My Mettelo, or reapply after a previous application is withdrawn or declined.'},{status:409});
      }
      throw error;
    }

    const db=serviceDb();
    if(db){
      const profileName=String(user.user_metadata?.full_name||user.email?.split('@')[0]||'A member');
      const roleLabel=isInterest?requestedRole:(role?.title||'project role');
      const memberTitle=isInterest?'Project interest received':'Application received';
      const adminTitle=isInterest?`New project interest — ${project.title}`:`New application — ${project.title}`;
      await Promise.all([
        notifyUser(db,{userId:user.id,email:user.email,projectId,applicationId:data.id,type:isInterest?'project_interest_submitted':'application_submitted',title:memberTitle,body:`We received your ${isInterest?'interest':'application'} for ${project.title} — ${roleLabel}. You can track it from My Mettelo.`,actionUrl:'/member/applications',subject:`${memberTitle} — ${project.title}`}),
        notifyAdmins(db,{projectId,applicationId:data.id,type:isInterest?'new_project_interest':'new_project_application',title:adminTitle,body:`${profileName} submitted ${isInterest?'interest':'an application'} for ${roleLabel} on ${project.title}.`,actionUrl:'/admin',subject:`${adminTitle}`})
      ]);
    }

    console.info('[project-applications] submission accepted',{kind:data.application_kind,status:data.status,notificationsConfigured:Boolean(db)});
    return NextResponse.json({ok:true,application:data});
  }catch(error){
    console.error('project application error',error);
    return NextResponse.json({error:'We could not submit this project request. Please try again.'},{status:500});
  }
}

export async function PATCH(request:Request){
  try{
    const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json();const id=String(body.id||'');const action=String(body.action||'');if(!id||action!=='withdraw')return NextResponse.json({error:'Invalid application action.'},{status:400});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Application service is not configured.'},{status:503});
    const {data:application}=await db.from('project_applications').select('id,user_id,project_id,project_run_id,status,application_kind,projects(title,status)').eq('id',id).maybeSingle();if(!application||application.user_id!==user.id)return NextResponse.json({error:'Project request not found.'},{status:404});
    const project=Array.isArray(application.projects)?application.projects[0]:application.projects;const title=project?.title||'Mettelo Labs project';
    if(application.status==='team_complete'||project?.status==='active')return NextResponse.json({error:'This project has already started. Contact Mettelo Support or the Project Lead if you need to leave an active team.'},{status:409});
    const now=new Date().toISOString();
    if(['approved','accepted','waiting_for_team'].includes(application.status)){
      if(application.project_run_id){const {error:memberError}=await db.from('project_members').update({membership_status:'left',left_at:now}).eq('project_run_id',application.project_run_id).eq('user_id',user.id).eq('membership_status','waiting');if(memberError)throw memberError;}
      const {data:updated,error}=await db.from('project_applications').update({status:'withdrawn',withdrawn_at:now,updated_at:now}).eq('id',id).select('id,status').single();if(error)throw error;
      await notifyAdmins(db,{projectId:application.project_id,applicationId:id,type:'application_withdrawn',title:`Confirmed place withdrawn — ${title}`,body:`${user.user_metadata?.full_name||user.email||'A member'} withdrew while the team was still forming. The team capacity has been released.`,actionUrl:'/admin'});
      return NextResponse.json({ok:true,application:updated,team_place_released:true});
    }
    if(!['submitted','in_review','shortlisted'].includes(application.status))return NextResponse.json({error:'This application can no longer be withdrawn from the application tracker.'},{status:409});
    const {data:updated,error}=await db.from('project_applications').update({status:'withdrawn',withdrawn_at:now,updated_at:now}).eq('id',id).select('id,status').single();if(error)throw error;
    await notifyAdmins(db,{projectId:application.project_id,applicationId:id,type:'application_withdrawn',title:`Project request withdrawn — ${title}`,body:`${user.user_metadata?.full_name||user.email||'A member'} withdrew their ${application.application_kind==='interest'?'interest':'application'} before a decision.`,actionUrl:'/admin'});
    return NextResponse.json({ok:true,application:updated});
  }catch(error){console.error('application withdrawal error',error);return NextResponse.json({error:'Unable to withdraw this project request.'},{status:500});}
}
