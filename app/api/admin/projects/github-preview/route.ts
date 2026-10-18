import {getGithubMasterProjects} from '@/lib/github-master-projects';
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
 let body:{repository_url?:unknown};
 try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON request.'},{status:400})}
 const result=await fetchGithubProjectManifest(String(body.repository_url??''));
 if(!result.ok||!result.manifest)return NextResponse.json({error:'Repository validation failed.',details:result.errors},{status:422});
 if(getGithubMasterProjects().some(p=>p.id===result.manifest.id))return NextResponse.json({error:'This project ID is reserved by the pinned 50-project catalogue.'},{status:409});
 const {data:existing,error}=await db.from('projects').select('id,title,canonical_project_key,github_url').or(`canonical_project_key.eq.${result.manifest.id},github_url.eq.${result.manifest.repository}`).limit(1);
 if(error)return NextResponse.json({error:'Unable to verify project uniqueness.'},{status:503});
 if(existing?.length)return NextResponse.json({error:'Project already registered.',existing_project_id:existing[0].id},{status:409});
 return NextResponse.json({ok:true,manifest:result.manifest,repository_commit:result.commit,publication:'draft_only',applications_open:false});
}
