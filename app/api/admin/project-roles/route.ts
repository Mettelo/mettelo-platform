import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type DbError={code?:string;message?:string};

export async function POST(request:Request){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});
    if(user.app_metadata?.role!=='admin') return NextResponse.json({error:'Admin access required.'},{status:403});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key) return NextResponse.json({error:'Admin data service is not configured.'},{status:503});
    const body=await request.json();
    const projectId=String(body.project_id||'');
    const title=String(body.title||'').trim().slice(0,120);
    const discipline=String(body.discipline||'').trim().slice(0,120);
    const description=String(body.description||'').trim().slice(0,1000);
    const skills=String(body.skills||'').split(',').map((v:string)=>v.trim()).filter(Boolean).slice(0,20);
    const openings=Math.max(1,Math.min(50,Number(body.openings)||1));
    if(!projectId||!title) return NextResponse.json({error:'Project and role title are required.'},{status:400});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:project}=await db.from('projects').select('id').eq('id',projectId).single();
    if(!project) return NextResponse.json({error:'Project not found.'},{status:404});
    const existing=await db.from('project_roles').select('id').eq('project_id',projectId).eq('title',title).maybeSingle();
    const payload={project_id:projectId,title,discipline:discipline||null,description:description||null,skills,openings};
    const result=existing.data?.id?await db.from('project_roles').update(payload).eq('id',existing.data.id).select('*').single():await db.from('project_roles').insert(payload).select('*').single();
    if(result.error){
      if(result.error.code==='23514')return NextResponse.json({error:result.error.message||'This role change would make the live project capacity invalid.'},{status:409});
      throw result.error;
    }
    return NextResponse.json({ok:true,role:result.data});
  }catch(error){
    const dbError=error as DbError;
    console.error('project role error',error);
    if(dbError.code==='23514')return NextResponse.json({error:dbError.message||'This role change conflicts with current project capacity.'},{status:409});
    return NextResponse.json({error:'Unable to save project role.'},{status:500});
  }
}
