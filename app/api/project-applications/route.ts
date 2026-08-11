import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {notifyAdmins,notifyUser,serviceDb} from '@/lib/project-flow';

export async function POST(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Sign in before applying to a Labs project.'},{status:401});
    const body=await request.json();
    const projectId=String(body.project_id||'');
    const roleId=String(body.project_role_id||'');
    const statement=String(body.contribution_statement||'').trim().slice(0,2000);
    const portfolio=String(body.portfolio_url||'').trim().slice(0,400);
    const availability=String(body.availability||'').trim().slice(0,160);
    if(!projectId||!roleId||statement.length<40) return NextResponse.json({error:'Choose a project and role, and explain your contribution in at least 40 characters.'},{status:400});

    const {data:project,error:projectError}=await supabase.from('projects').select('id,title,status').eq('id',projectId).single();
    if(projectError||!project||!['recruiting','open','forming'].includes(project.status)) return NextResponse.json({error:'This project is not currently accepting applications.'},{status:400});
    const {data:role,error:roleError}=await supabase.from('project_roles').select('id,project_id,title').eq('id',roleId).eq('project_id',projectId).single();
    if(roleError||!role) return NextResponse.json({error:'Choose a valid role for this project.'},{status:400});

    const {data,error}=await supabase.from('project_applications').insert({project_id:projectId,project_role_id:roleId,user_id:user.id,portfolio_url:portfolio||null,contribution_statement:statement,availability:availability||null,status:'submitted'}).select('id,status').single();
    if(error){
      if(error.code==='23505') return NextResponse.json({error:'You already have an application for this project role.'},{status:409});
      throw error;
    }

    const db=serviceDb();
    if(db){
      const profileName=String(user.user_metadata?.full_name||user.email?.split('@')[0]||'A member');
      await Promise.all([
        notifyUser(db,{userId:user.id,email:user.email,projectId,applicationId:data.id,type:'application_submitted',title:'Application received',body:`We received your application for ${project.title}${role.title?` — ${role.title}`:''}. You can track every review stage from your dashboard.`,actionUrl:'/member#applications',subject:`Application received — ${project.title}`}),
        notifyAdmins(db,{projectId,applicationId:data.id,type:'new_project_application',title:`New application — ${project.title}`,body:`${profileName} applied for ${role.title||'a project role'} on ${project.title}.`,actionUrl:'/admin#applications',subject:`New Mettelo application — ${project.title}`})
      ]);
    }
    return NextResponse.json({ok:true,application:data});
  }catch(error){
    console.error('project application error',error);
    return NextResponse.json({error:'We could not submit this application. Please try again.'},{status:500});
  }
}

export async function PATCH(request:Request){
  try{
    const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json();const id=String(body.id||'');const action=String(body.action||'');if(!id||action!=='withdraw')return NextResponse.json({error:'Invalid application action.'},{status:400});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Application service is not configured.'},{status:503});
    const {data:application}=await db.from('project_applications').select('id,user_id,project_id,status,projects(title)').eq('id',id).maybeSingle();if(!application||application.user_id!==user.id)return NextResponse.json({error:'Application not found.'},{status:404});
    if(!['submitted','in_review','shortlisted'].includes(application.status))return NextResponse.json({error:'You can only withdraw before an approval or decline decision is made.'},{status:409});
    const now=new Date().toISOString();const {data:updated,error}=await db.from('project_applications').update({status:'withdrawn',withdrawn_at:now,updated_at:now}).eq('id',id).select('id,status').single();if(error)throw error;
    const project=Array.isArray(application.projects)?application.projects[0]:application.projects;const title=project?.title||'Mettelo Labs project';
    await notifyAdmins(db,{projectId:application.project_id,applicationId:id,type:'application_withdrawn',title:`Application withdrawn — ${title}`,body:`${user.user_metadata?.full_name||user.email||'A member'} withdrew their application before a decision.`,actionUrl:'/admin#applications'});
    return NextResponse.json({ok:true,application:updated});
  }catch(error){console.error('application withdrawal error',error);return NextResponse.json({error:'Unable to withdraw this application.'},{status:500});}
}
