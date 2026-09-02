import {NextResponse} from 'next/server';
import {architectContext,clean,recordGovernance} from '@/lib/project-governance';

const decisions=new Set(['verification_required','amber','green','red']);
const permissions=new Set(['permitted','restricted','not_permitted','unknown']);
function httpsUrl(value:unknown){const url=clean(value,2000);return !url||/^https:\/\//i.test(url)?url:''}
function qualityStatus(decision:string){return decision==='green'?'approved':decision==='verification_required'?'unreviewed':'issues_found'}

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
    const {data:source,error:sourceError}=await db.from('project_data_sources').select('id,project_id,name,sensitivity,external_url,licence_name,licence_url,governance_status').eq('id',resourceId).is('project_run_id',null).maybeSingle();
    if(sourceError)throw sourceError;if(!source)return NextResponse.json({error:'Canonical project resource not found.'},{status:404});
    if(decision==='green'&&(!source.external_url||!source.licence_name))return NextResponse.json({error:'A green decision requires an original source URL and licence name.'},{status:409});
    if(publicUseApproved&&(decision!=='green'||source.sensitivity!=='public'))return NextResponse.json({error:'Public source display can be approved only for a green resource classified as public.'},{status:409});
    const now=new Date().toISOString();
    const {error:updateError}=await db.from('project_data_sources').update({
      governance_status:decision,
      governance_verified_at:now,
      governance_verified_by:user.id,
      retention_policy:retention,
      internal_storage_policy:internalStorage,
      internal_storage_url:internalStorageUrl||null,
      publish_policy:publicUseApproved?'permitted':'not_permitted',
      quality_status:qualityStatus(decision)
    }).eq('id',source.id).is('project_run_id',null);
    if(updateError)throw updateError;
    const {error:reviewError}=await db.from('project_data_source_governance_reviews').insert({data_source_id:source.id,decision,notes:notes||null,evidence_url:evidenceUrl||null,reviewer_user_id:user.id});if(reviewError)throw reviewError;
    await recordGovernance(db,{projectId:source.project_id,actorId:user.id,actorScope:'admin',eventType:'resource_governance_reviewed',reason:notes||`Resource ${source.name} reviewed as ${decision}.`,metadata:{resource_id:source.id,resource_name:source.name,decision,retention_policy:retention,internal_storage_policy:internalStorage,public_use_approved:publicUseApproved,evidence_url:evidenceUrl||null}});
    return NextResponse.json({ok:true,resource_id:source.id,governance_status:decision,publish_policy:publicUseApproved?'permitted':'not_permitted'});
  }catch(error){console.error('project resource governance update error',error);return NextResponse.json({error:'Unable to update project resource governance.'},{status:500})}
}
