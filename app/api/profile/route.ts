import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const allowedAreas=new Set(['Data Analysis / BI','Data Science / ML','Data Engineering','AI / Generative AI','Analytics Engineering','Research / Product / Design','Career transition / Student','Other']);
const experienceLevels=new Set(['entry','mid','senior','lead','executive']);
const employmentStatuses=new Set(['employed','self_employed','student','career_transition','seeking_work','not_disclosed']);
const availabilityStatuses=new Set(['available_now','available_soon','limited','not_available']);
function slugList(value:unknown){return Array.isArray(value)?[...new Set(value.map(v=>String(v).trim()).filter(Boolean))].slice(0,20):[];}
function list(value:unknown,max=20){return Array.isArray(value)?[...new Set(value.map(v=>String(v).trim()).filter(Boolean))].slice(0,max):[];}

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
    const primaryGoal=String(body.primary_goal||'').trim().slice(0,200);
    const linkedinUrl=String(body.linkedin_url||'').trim().slice(0,300);
    const githubUrl=String(body.github_url||'').trim().slice(0,300);
    const portfolioUrl=String(body.portfolio_url||'').trim().slice(0,300);
    const currentJobTitle=String(body.current_job_title||'').trim().slice(0,140);
    const organisation=String(body.organisation||'').trim().slice(0,160);
    const experienceLevel=String(body.experience_level||'').trim();
    const employmentStatus=String(body.employment_status||'').trim();
    const projectAvailability=String(body.project_availability||'').trim();
    const weeklyCapacity=String(body.weekly_capacity||'').trim().slice(0,120);
    const avatarUrl=body.avatar_url?String(body.avatar_url).trim().slice(0,700):'';
    const skills=list(body.skills,30);
    const preferredRoles=list(body.preferred_roles,12);
    const languages=list(body.languages,12);
    const isPublic=Boolean(body.is_public);
    const domainSlugs=slugList(body.domain_preferences);
    const toolSlugs=slugList(body.tool_preferences);
    const onboardingStep=Math.max(0,Math.min(4,Number.isFinite(Number(body.onboarding_step))?Math.trunc(Number(body.onboarding_step)):0));
    const onboardingComplete=body.onboarding_complete===true;

    if(!fullName) return NextResponse.json({error:'Full name is required.'},{status:400});
    if(professionalArea&&!allowedAreas.has(professionalArea)) return NextResponse.json({error:'Choose a valid professional area.'},{status:400});
    if(experienceLevel&&!experienceLevels.has(experienceLevel))return NextResponse.json({error:'Choose a valid experience level.'},{status:400});
    if(employmentStatus&&!employmentStatuses.has(employmentStatus))return NextResponse.json({error:'Choose a valid employment status.'},{status:400});
    if(projectAvailability&&!availabilityStatuses.has(projectAvailability))return NextResponse.json({error:'Choose a valid project availability.'},{status:400});
    for(const url of [linkedinUrl,githubUrl,portfolioUrl]){if(url){try{if(new URL(url).protocol!=='https:')throw new Error();}catch{return NextResponse.json({error:'Profile links must be valid HTTPS URLs.'},{status:400});}}}
    if(avatarUrl){
      const projectUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,'');
      const expectedPrefix=projectUrl?`${projectUrl}/storage/v1/object/public/profile-images/${user.id}/`:'';
      if(!expectedPrefix||!avatarUrl.startsWith(expectedPrefix)) return NextResponse.json({error:'Profile image must come from your Mettelo image upload.'},{status:400});
    }

    const [domainRows,toolRows]=await Promise.all([
      domainSlugs.length?supabase.from('domains').select('id,slug').eq('is_active',true).in('slug',domainSlugs):Promise.resolve({data:[],error:null}),
      toolSlugs.length?supabase.from('tools').select('id,slug').eq('is_active',true).in('slug',toolSlugs):Promise.resolve({data:[],error:null})
    ]);
    if(domainRows.error||toolRows.error) return NextResponse.json({error:'Unable to validate project preferences.'},{status:500});
    if((domainRows.data||[]).length!==domainSlugs.length||(toolRows.data||[]).length!==toolSlugs.length)return NextResponse.json({error:'One or more project preferences are invalid. Refresh and try again.'},{status:400});

    const updatePayload={
      full_name:fullName,headline,bio,location,professional_area:professionalArea||null,primary_goal:primaryGoal||null,
      linkedin_url:linkedinUrl||null,github_url:githubUrl||null,portfolio_url:portfolioUrl||null,avatar_url:avatarUrl||null,
      current_job_title:currentJobTitle||null,organisation:organisation||null,experience_level:experienceLevel||null,
      employment_status:employmentStatus||null,project_availability:projectAvailability||null,weekly_capacity:weeklyCapacity||null,
      skills,preferred_roles:preferredRoles,languages,is_public:isPublic,onboarding_step:onboardingComplete?4:onboardingStep,
      ...(onboardingComplete?{onboarding_completed_at:new Date().toISOString()}:{}),updated_at:new Date().toISOString()
    };
    const {data,error}=await supabase.from('profiles').update(updatePayload).eq('id',user.id).select('*').single();
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
    return NextResponse.json({profile:data,domain_preferences:domainSlugs,tool_preferences:toolSlugs});
  }catch{return NextResponse.json({error:'Invalid profile request.'},{status:400});}
}
