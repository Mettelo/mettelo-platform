import {NextResponse} from 'next/server';
import {architectContext,clean} from '@/lib/project-governance';

const decisions=new Set(['verification_required','amber','green','red']);
const permissions=new Set(['permitted','restricted','not_permitted','unknown']);
function httpsUrl(value:unknown){const url=clean(value,2000);return !url||/^https:\/\//i.test(url)?url:''}
function rpcMessage(message:string){
  if(message.includes('GREEN_REQUIRES_LICENCE_EVIDENCE'))return 'A GREEN decision requires the original source, a licence name, and either a licence URL or independent HTTPS governance evidence.';
  if(message.includes('PUBLIC_USE_REQUIRES_GREEN_PUBLIC_RESOURCE'))return 'Public source display can be approved only for a GREEN resource classified as public.';
  if(message.includes('CANONICAL_RESOURCE_NOT_FOUND'))return 'Canonical project resource not found.';
  return 'Unable to update project resource governance.';
}

export async function GET(){
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;
    if(!ctx.isAdmin)return NextResponse.json({error:'Admin access is required for resource governance.'},{status:403});
    const {data,error}=await ctx.db.from('project_data_sources').select('id,project_id,name,description,source_type,external_url,provider_name,provider:project_resource_providers(name,website_url),licence_name,licence_url,required_subset,approximate_size,data_period,data_format,sensitivity,provenance,known_limitations,retention_policy,internal_storage_policy,internal_storage_url,governance_status,governance_verified_at,projects(title,governance_status)').is('project_run_id',null).order('created_at',{ascending:false});
    if(error)throw error;
    return NextResponse.json({items:data||[]});
  }catch(error){console.error('project resource governance list error',error);return NextResponse.json({error:'Unable to load project resource governance.'},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;
    const {db,user,isAdmin}=ctx;if(!isAdmin)return NextResponse.json({error:'Admin access is required to approve project resources.'},{status:403});
    const body=await request.json();
    const resourceId=clean(body.resource_id,80),decision=clean(body.decision,40),notes=clean(body.notes,3000),evidenceUrl=httpsUrl(body.evidence_url),rawEvidence=clean(body.evidence_url,2000),internalStorageUrl=httpsUrl(body.internal_storage_url),rawInternal=clean(body.internal_storage_url,2000);
    const retention=permissions.has(clean(body.retention_policy,30))?clean(body.retention_policy,30):'unknown';
    const internalStorage=permissions.has(clean(body.internal_storage_policy,30))?clean(body.internal_storage_policy,30):'unknown';
    const publicUseApproved=body.public_use_approved===true;
    if(!resourceId||!decisions.has(decision))return NextResponse.json({error:'Choose a project resource and valid governance decision.'},{status:400});
    if(rawEvidence&&!evidenceUrl)return NextResponse.json({error:'Governance evidence must use an HTTPS URL.'},{status:400});
    if(rawInternal&&!internalStorageUrl)return NextResponse.json({error:'Internal storage links must use HTTPS.'},{status:400});
    if(decision!=='green'&&!notes)return NextResponse.json({error:'Add review notes for verification-required, amber or red decisions.'},{status:400});
    const {data:source,error:sourceError}=await db.from('project_data_sources').select('id,name,sensitivity,external_url,licence_name,licence_url').eq('id',resourceId).is('project_run_id',null).maybeSingle();
    if(sourceError)throw sourceError;if(!source)return NextResponse.json({error:'Canonical project resource not found.'},{status:404});
    if(decision==='green'&&(!source.external_url||!source.licence_name||(!source.licence_url&&!evidenceUrl)))return NextResponse.json({error:'A GREEN decision requires the original source, a licence name, and either a licence URL or independent HTTPS governance evidence.'},{status:409});
    if(publicUseApproved&&(decision!=='green'||source.sensitivity!=='public'))return NextResponse.json({error:'Public source display can be approved only for a GREEN resource classified as public.'},{status:409});
    const {error}=await db.rpc('apply_project_resource_governance_review',{target_resource_id:resourceId,actor_user_id:user.id,decision_value:decision,notes_value:notes,evidence_url_value:evidenceUrl,retention_policy_value:retention,internal_storage_policy_value:internalStorage,internal_storage_url_value:internalStorageUrl,public_use_approved:publicUseApproved});
    if(error)return NextResponse.json({error:rpcMessage(error.message)},{status:error.message.includes('REQUIRES')?409:500});
    return NextResponse.json({ok:true,resource_id:resourceId,governance_status:decision,publish_policy:publicUseApproved?'permitted':'not_permitted'});
  }catch(error){console.error('project resource governance update error',error);return NextResponse.json({error:'Unable to update project resource governance.'},{status:500})}
}
