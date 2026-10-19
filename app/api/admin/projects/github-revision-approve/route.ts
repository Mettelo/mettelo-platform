import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {fetchGithubProjectManifest} from '@/lib/admin-github-project-import';

export async function POST(request:Request){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 if(user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
 if(process.env.METTELO_PHASE3_GITHUB_REVISION_APPROVAL_ENABLED!=='true')
  return NextResponse.json({error:'GitHub revision approval is not enabled.'},{status:409});
 const db=serviceDb();
 if(!db)return NextResponse.json({error:'Admin data service is not configured.'},{status:503});
 let body:{project_id?:unknown;expected_revision?:unknown;expected_blob_sha?:unknown;confirmation?:unknown};
 try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON request.'},{status:400})}
 const id=typeof body.project_id==='string'?body.project_id:'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:'Valid project ID required.'},{status:400});
 if(body.confirmation!=='APPROVE_GITHUB_REVISION')
  return NextResponse.json({error:'Explicit revision approval confirmation is required.'},{status:400});
 if(!Number.isSafeInteger(body.expected_revision)||Number(body.expected_revision)<1||Number(body.expected_revision)>100000)
  return NextResponse.json({error:'Valid expected revision required.'},{status:400});
 if(typeof body.expected_blob_sha!=='string'||!/^[0-9a-f]{40}$/.test(body.expected_blob_sha))
  return NextResponse.json({error:'Valid GitHub blob SHA required.'},{status:400});
 const {data:project,error:projectError}=await db.from('projects')
  .select('id,canonical_project_key,github_url,status,visibility').eq('id',id).maybeSingle();
 if(projectError)return NextResponse.json({error:'Unable to load project.'},{status:503});
 if(!project||project.status!=='draft'||project.visibility!=='private'||!project.canonical_project_key||!project.github_url)
  return NextResponse.json({error:'Only private GitHub drafts can approve repository metadata changes.'},{status:409});
 const latest=await fetchGithubProjectManifest(project.github_url);
 if(!latest.ok||!latest.manifest)return NextResponse.json({error:'GitHub validation failed.',details:latest.errors},{status:422});
 if(latest.manifest.id!==project.canonical_project_key||latest.manifest.repository!==project.github_url)
  return NextResponse.json({error:'GitHub project identity cannot change.'},{status:409});
 if(latest.commit!==body.expected_blob_sha)
  return NextResponse.json({error:'GitHub repository changed since preview. Check changes again.'},{status:409});
 const {data,error}=await db.rpc('phase3_approve_github_revision',{
  p_project_id:id,p_actor_user_id:user.id,p_expected_revision:body.expected_revision,
  p_manifest:latest.manifest,p_blob_sha:latest.commit
 });
 if(error)return NextResponse.json({error:'Revision approval was rejected. Refresh the project and check again.'},{status:409});
 return NextResponse.json({ok:true,project_id:id,approved_revision:data,publication_changed:false,applications_changed:false});
}
