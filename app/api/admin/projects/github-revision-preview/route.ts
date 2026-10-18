import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {fetchGithubProjectManifest} from '@/lib/admin-github-project-import';
export async function POST(request:Request){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 if(user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
 const db=serviceDb();
 if(!db)return NextResponse.json({error:'Admin data service is not configured.'},{status:503});
 let body:{project_id?:unknown};
 try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON request.'},{status:400})}
 const id=typeof body.project_id==='string'?body.project_id:'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:'Valid project ID required.'},{status:400});
 const {data:project,error:projectError}=await db.from('projects').select('id,canonical_project_key,github_url,status,visibility').eq('id',id).maybeSingle();
 if(projectError)return NextResponse.json({error:'Unable to load project.'},{status:503});
 if(!project||!project.canonical_project_key||!project.github_url)return NextResponse.json({error:'GitHub-linked project not found.'},{status:404});
 const {data:logs,error:logError}=await db.from('project_activity_log').select('metadata,created_at').eq('project_id',id).eq('event_type','project_created').order('created_at',{ascending:true}).limit(1);
 if(logError)return NextResponse.json({error:'Unable to verify project provenance.'},{status:503});
 const initial=logs?.[0]?.metadata?.github_import;
 if(!initial||initial.external_id!==project.canonical_project_key||initial.repository!==project.github_url||!initial.manifest_snapshot)return NextResponse.json({error:'No verified initial GitHub snapshot.'},{status:409});
 const latest=await fetchGithubProjectManifest(project.github_url);
 if(!latest.ok||!latest.manifest)return NextResponse.json({error:'Repository validation failed.',details:latest.errors},{status:422});
 if(latest.manifest.id!==project.canonical_project_key||latest.manifest.repository!==project.github_url)return NextResponse.json({error:'Repository identity cannot change.'},{status:409});
 const {data:approved,error:approvedError}=await db.from('project_activity_log').select('metadata,created_at')
  .eq('project_id',id).eq('event_type','github_manifest_revision_approved')
  .order('created_at',{ascending:false}).limit(100);
 if(approvedError)return NextResponse.json({error:'Unable to load approved revision history.'},{status:503});
 const revisions=(approved||[]).map(row=>row.metadata?.github_import).filter(entry=>entry&&Number.isSafeInteger(entry.revision));
 revisions.sort((a,b)=>b.revision-a.revision);
 const current=revisions[0]||initial;
 const original=current.manifest_snapshot as Record<string,unknown>;
 const manifest=latest.manifest;
 const changedFields=(['name','track','brief','problem','sector','roles','capabilities','status'] as const).filter(key=>JSON.stringify(original[key])!==JSON.stringify(manifest[key]));
 return NextResponse.json({ok:true,project_id:id,canonical_project_key:project.canonical_project_key,changed_fields:changedFields,changes_pending_approval:changedFields.length>0,latest_manifest:manifest,original_revision:initial.revision||1,current_revision:current.revision||1,latest_blob_sha:latest.commit,can_approve:project.status==='draft'&&project.visibility==='private'&&process.env.METTELO_PHASE3_GITHUB_REVISION_APPROVAL_ENABLED==='true',applied:false});
}
