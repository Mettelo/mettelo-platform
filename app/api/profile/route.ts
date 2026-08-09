import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const allowedAreas=new Set(['Data Analysis / BI','Data Science / ML','Data Engineering','AI / Generative AI','Analytics Engineering','Research / Product / Design','Career transition / Student','Other']);

export async function GET(){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});
    const {data,error}=await supabase.from('profiles').select('*').eq('id',user.id).single();
    if(error) return NextResponse.json({error:'Unable to load profile.'},{status:500});
    return NextResponse.json({profile:data});
  }catch{return NextResponse.json({error:'Profile service is unavailable.'},{status:503});}
}

export async function PATCH(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});

    const body=await request.json();
    const fullName=String(body.full_name||'').trim().slice(0,120);
    const headline=String(body.headline||'').trim().slice(0,160);
    const bio=String(body.bio||'').trim().slice(0,1000);
    const location=String(body.location||'').trim().slice(0,120);
    const professionalArea=String(body.professional_area||'').trim();
    const primaryGoal=String(body.primary_goal||'').trim().slice(0,160);
    const linkedinUrl=String(body.linkedin_url||'').trim().slice(0,300);
    const githubUrl=String(body.github_url||'').trim().slice(0,300);
    const skills=Array.isArray(body.skills)?body.skills.map((v:unknown)=>String(v).trim()).filter(Boolean).slice(0,20):[];
    const isPublic=Boolean(body.is_public);

    if(!fullName) return NextResponse.json({error:'Full name is required.'},{status:400});
    if(professionalArea&&!allowedAreas.has(professionalArea)) return NextResponse.json({error:'Choose a valid professional area.'},{status:400});

    const {data,error}=await supabase.from('profiles').update({
      full_name:fullName,headline,bio,location,professional_area:professionalArea||null,primary_goal:primaryGoal,
      linkedin_url:linkedinUrl||null,github_url:githubUrl||null,skills,is_public:isPublic,updated_at:new Date().toISOString()
    }).eq('id',user.id).select('*').single();
    if(error) return NextResponse.json({error:'Unable to save profile.'},{status:500});
    return NextResponse.json({profile:data});
  }catch{return NextResponse.json({error:'Invalid profile request.'},{status:400});}
}
