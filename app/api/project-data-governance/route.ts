import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const downloadPolicies=new Set(['allowed','team_only','not_allowed']);
const publishPolicies=new Set(['permitted','approval_required','not_permitted']);
function clean(value:unknown,max=2000){return String(value??'').trim().slice(0,max)}
function httpsUrl(value:string){try{return new URL(value).protocol==='https:'}catch{return false}}

export async function POST(request:Request){
  try{
    const body=await request.json();
    const projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80),sourceId=clean(body.data_source_id,80),action=clean(body.action,50);
    if(!projectId||!runId||!sourceId)return NextResponse.json({error:'Project, project run and data source are required.'},{status:400});
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Project data service is not configured.'},{status:503});
    const [{data:membership},{data:source}]=await Promise.all([
      db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
      db.from('project_data_sources').select('id,owner_user_id,external_url,version_label').eq('id',sourceId).eq('project_id',projectId).eq('project_run_id',runId).maybeSingle()
    ]);
    if(!source)return NextResponse.json({error:'Data source not found.'},{status:404});
    const isAdmin=user.app_metadata?.role==='admin';
    const active=membership&&['active','completed'].includes(membership.membership_status);
    const canManage=isAdmin||Boolean(active&&membership.team_role==='project_lead')||source.owner_user_id===user.id;
    if(!canManage)return NextResponse.json({error:'Only the data owner, Project Lead or Admin can change data governance.'},{status:403});

    if(action==='governance'){
      const provenance=clean(body.provenance,2500)||null;
      const downloadPolicy=clean(body.download_policy,40);
      const publishPolicy=clean(body.publish_policy,40);
      if(!downloadPolicies.has(downloadPolicy)||!publishPolicies.has(publishPolicy))return NextResponse.json({error:'Choose valid download and publication rules.'},{status:400});
      const {data,error}=await db.from('project_data_sources').update({provenance,download_policy:downloadPolicy,publish_policy:publishPolicy,updated_at:new Date().toISOString()}).eq('id',sourceId).eq('project_run_id',runId).select('id,provenance,download_policy,publish_policy').single();
      if(error)throw error;
      return NextResponse.json({ok:true,item:data,message:'Data governance rules updated.'});
    }

    if(action==='version'){
      const versionLabel=clean(body.version_label,120),externalUrl=clean(body.external_url,800),changeSummary=clean(body.change_summary,1800)||null;
      if(!versionLabel||!httpsUrl(externalUrl))return NextResponse.json({error:'Add a version label and valid HTTPS URL.'},{status:400});
      const {data:duplicate}=await db.from('project_data_source_versions').select('id').eq('data_source_id',sourceId).eq('version_label',versionLabel).maybeSingle();
      if(duplicate)return NextResponse.json({error:'That version label already exists for this data source.'},{status:409});
      const {data,error}=await db.from('project_data_source_versions').insert({data_source_id:sourceId,project_run_id:runId,version_label:versionLabel,external_url:externalUrl,change_summary:changeSummary,created_by_user_id:user.id}).select('id,data_source_id,version_label,external_url,change_summary,created_at').single();
      if(error)throw error;
      const {error:updateError}=await db.from('project_data_sources').update({version_label:versionLabel,external_url:externalUrl,updated_at:new Date().toISOString()}).eq('id',sourceId).eq('project_run_id',runId);
      if(updateError)throw updateError;
      return NextResponse.json({ok:true,item:data,message:'New data version registered.'});
    }

    return NextResponse.json({error:'Unknown data governance action.'},{status:400});
  }catch(error){
    console.error('project data governance error',error);
    return NextResponse.json({error:'Unable to update data governance.'},{status:500});
  }
}
