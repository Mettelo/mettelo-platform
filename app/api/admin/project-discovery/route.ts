import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const text=(value:unknown)=>String(value??'').trim();
const EXPERIENCE_VALUES=new Set(['entry','intermediate','advanced']);
const WORKING_VALUES=new Set(['remote','hybrid','on-site']);
const COMMITMENT_VALUES=new Set(['up-to-3-hours','3-5-hours','5-7-hours','7-10-hours','10-plus-hours']);
const COMMITMENT_TEXT:Record<string,string>={'up-to-3-hours':'Up to 3 hours/week','3-5-hours':'3–5 hours/week','5-7-hours':'5–7 hours/week','7-10-hours':'7–10 hours/week','10-plus-hours':'10+ hours/week'};
async function admin(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();return user?.app_metadata?.role==='admin'?user:null}
function ids(value:unknown){return Array.isArray(value)?[...new Set(value.map(text).filter(Boolean))]:[]}

export async function GET(request:Request){try{
  const user=await admin();if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Admin database is not configured.'},{status:503});
  const projectId=text(new URL(request.url).searchParams.get('project_id'));if(!projectId)return NextResponse.json({error:'Project ID is required.'},{status:400});
  const [{data:project,error:projectError},{data:domains,error:domainError},{data:tools,error:toolError},{data:methods,error:methodError},{data:selectedDomains,error:selectedDomainError},{data:selectedTools,error:selectedToolError},{data:selectedMethods,error:selectedMethodError}]=await Promise.all([
    db.from('projects').select('id,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,location_type,status,visibility').eq('id',projectId).maybeSingle(),
    db.from('domains').select('id,slug,name').eq('is_active',true).order('sort_order').order('name'),
    db.from('tools').select('id,slug,name,category').eq('is_active',true).order('category').order('sort_order').order('name'),
    db.from('methods').select('id,slug,name,category').eq('is_active',true).order('category').order('sort_order').order('name'),
    db.from('project_domains').select('domain_id,is_primary').eq('project_id',projectId).order('is_primary',{ascending:false}),
    db.from('project_tools').select('tool_id').eq('project_id',projectId),
    db.from('project_methods').select('method_id').eq('project_id',projectId)
  ]);
  if(projectError)throw projectError;if(!project)return NextResponse.json({error:'Project not found.'},{status:404});for(const error of [domainError,toolError,methodError,selectedDomainError,selectedToolError,selectedMethodError])if(error)throw error;
  return NextResponse.json({project,domains:domains||[],tools:tools||[],methods:methods||[],selected:{domain_ids:(selectedDomains||[]).map(row=>row.domain_id),tool_ids:(selectedTools||[]).map(row=>row.tool_id),method_ids:(selectedMethods||[]).map(row=>row.method_id)}});
}catch(error){console.error(error);return NextResponse.json({error:'Unable to load project discovery metadata.'},{status:500})}}

export async function PATCH(request:Request){try{
  const user=await admin();if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Admin database is not configured.'},{status:503});
  const body=await request.json() as Record<string,unknown>;const projectId=text(body.project_id);if(!projectId)return NextResponse.json({error:'Project ID is required.'},{status:400});
  const experience=text(body.experience_level);if(experience&&!EXPERIENCE_VALUES.has(experience))return NextResponse.json({error:'Choose Beginner, Intermediate or Advanced.'},{status:400});
  const format=text(body.project_format);if(format&&!['solo','team'].includes(format))return NextResponse.json({error:'Choose Solo or Team.'},{status:400});
  const working=text(body.working_model);if(working&&!WORKING_VALUES.has(working))return NextResponse.json({error:'Choose Remote, Hybrid or On-site.'},{status:400});
  const commitment=text(body.commitment_band);if(commitment&&!COMMITMENT_VALUES.has(commitment))return NextResponse.json({error:'Choose a supported weekly commitment band.'},{status:400});
  const teamSize=Math.max(1,Math.min(50,Number(body.team_size)||1));if(format==='team'&&teamSize<2)return NextResponse.json({error:'Team projects need a team size of at least 2.'},{status:400});
  const domainIds=ids(body.domain_ids),toolIds=ids(body.tool_ids),methodIds=ids(body.method_ids);
  const updates:Record<string,unknown>={updated_at:new Date().toISOString(),updated_by_user_id:user.id};if(experience)updates.difficulty_level=experience;if(format)updates.team_size_threshold=format==='solo'?1:teamSize;if(working)updates.location_type=working;if(commitment)updates.weekly_commitment=COMMITMENT_TEXT[commitment];
  const {data:project,error:projectError}=await db.from('projects').select('id').eq('id',projectId).maybeSingle();if(projectError)throw projectError;if(!project)return NextResponse.json({error:'Project not found.'},{status:404});
  const {error:taxonomyError}=await db.rpc('admin_replace_project_discovery_taxonomy',{p_project_id:projectId,p_domain_ids:domainIds,p_tool_ids:toolIds,p_method_ids:methodIds});if(taxonomyError)return NextResponse.json({error:'One or more taxonomy selections are invalid or inactive. Reload and try again.'},{status:409});
  const {error:updateError}=await db.from('projects').update(updates).eq('id',projectId);if(updateError)throw updateError;
  return NextResponse.json({ok:true});
}catch(error){console.error(error);return NextResponse.json({error:'Unable to save project discovery metadata.'},{status:500})}}
