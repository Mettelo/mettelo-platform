import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    const {data:project,error:projectError}=await supabase.from('projects').select('id,status').eq('id',projectId).single();
    if(projectError||!project||project.status!=='recruiting') return NextResponse.json({error:'This project is not currently accepting applications.'},{status:400});
    const {data:role,error:roleError}=await supabase.from('project_roles').select('id,project_id').eq('id',roleId).eq('project_id',projectId).single();
    if(roleError||!role) return NextResponse.json({error:'Choose a valid role for this project.'},{status:400});

    const {data,error}=await supabase.from('project_applications').insert({project_id:projectId,project_role_id:roleId,user_id:user.id,portfolio_url:portfolio||null,contribution_statement:statement,availability:availability||null,status:'submitted'}).select('id,status').single();
    if(error){
      if(error.code==='23505') return NextResponse.json({error:'You already have an application for this project role.'},{status:409});
      throw error;
    }
    return NextResponse.json({ok:true,application:data});
  }catch(error){
    console.error('project application error',error);
    return NextResponse.json({error:'We could not submit this application. Please try again.'},{status:500});
  }
}
