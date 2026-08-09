import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const allowedAreas=new Set(['Data Analysis / BI','Data Science / ML','Data Engineering','AI / Generative AI','Analytics Engineering','Research / Product / Design','Career transition / Student','Other']);
function slugList(value:unknown){return Array.isArray(value)?[...new Set(value.map(v=>String(v).trim()).filter(Boolean))].slice(0,20):[];}

export async function GET(){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});
    const [profileResult,domainPrefs,toolPrefs]=await Promise.all([
      supabase.from('profiles').select('*').eq('id',user.id).single(),
      supabase.from('profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id),
      supabase.from('profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id)
    ]);
    if(profileResult.error) return NextResponse.json({error:'Unable to load profile.'},{status:500});
    return NextResponse.json({profile:profileResult.data,domain_preferences:domainPrefs.data||[],tool_preferences:toolPrefs.data||[]});
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
    const domainSlugs=slugList(body.domain_preferences);
    const toolSlugs=slugList(body.tool_preferences);

    if(!fullName) return NextResponse.json({error:'Full name is required.'},{status:400});
    if(professionalArea&&!allowedAreas.has(professionalArea)) return NextResponse.json({error:'Choose a valid professional area.'},{status:400});

    const [domainRows,toolRows]=await Promise.all([
      domainSlugs.length?supabase.from('domains').select('id,slug').eq('is_active',true).in('slug',domainSlugs):Promise.resolve({data:[],error:null}),
      toolSlugs.length?supabase.from('tools').select('id,slug').eq('is_active',true).in('slug',toolSlugs):Promise.resolve({data:[],error:null})
    ]);
    if(domainRows.error||toolRows.error) return NextResponse.json({error:'Unable to validate project preferences.'},{status:500});
    if((domainRows.data||[]).length!==domainSlugs.length||(toolRows.data||[]).length!==toolSlugs.length)return NextResponse.json({error:'One or more project preferences are invalid. Refresh and try again.'},{status:400});

    const {data,error}=await supabase.from('profiles').update({
      full_name:fullName,headline,bio,location,professional_area:professionalArea||null,primary_goal:primaryGoal,
      linkedin_url:linkedinUrl||null,github_url:githubUrl||null,skills,is_public:isPublic,updated_at:new Date().toISOString()
    }).eq('id',user.id).select('*').single();
    if(error) return NextResponse.json({error:'Unable to save profile.'},{status:500});

    const [clearDomains,clearTools]=await Promise.all([
      supabase.from('profile_domain_preferences').delete().eq('user_id',user.id),
      supabase.from('profile_tool_preferences').delete().eq('user_id',user.id)
    ]);
    if(clearDomains.error||clearTools.error)return NextResponse.json({error:'Profile saved, but project preferences could not be updated.'},{status:500});
    const domainLinks=(domainRows.data||[]).map(row=>({user_id:user.id,domain_id:row.id}));
    const toolLinks=(toolRows.data||[]).map(row=>({user_id:user.id,tool_id:row.id}));
    const [saveDomains,saveTools]=await Promise.all([
      domainLinks.length?supabase.from('profile_domain_preferences').insert(domainLinks):Promise.resolve({error:null}),
      toolLinks.length?supabase.from('profile_tool_preferences').insert(toolLinks):Promise.resolve({error:null})
    ]);
    if(saveDomains.error||saveTools.error)return NextResponse.json({error:'Profile saved, but project preferences could not be updated.'},{status:500});
    return NextResponse.json({profile:data});
  }catch{return NextResponse.json({error:'Invalid profile request.'},{status:400});}
}
