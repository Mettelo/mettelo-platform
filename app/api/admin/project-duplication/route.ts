import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

function cleanKey(value:unknown){
  const key=String(value||'').trim();
  return key.length>=8&&key.length<=160?key:null;
}

export async function POST(request:Request){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    if(user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});

    const body=await request.json().catch(()=>({}));
    const sourceProjectId=String(body.source_project_id||'').trim();
    const idempotencyKey=cleanKey(body.idempotency_key||request.headers.get('idempotency-key'));
    if(!sourceProjectId)return NextResponse.json({error:'Choose a project to duplicate.'},{status:400});
    if(!idempotencyKey)return NextResponse.json({error:'A valid duplication request key is required.'},{status:400});

    // Use the authenticated session, not service role, so auth.uid()/JWT authority
    // inside the canonical PostgreSQL transaction remains meaningful.
    const {data,error}=await auth.rpc('phase21_duplicate_project',{
      p_source_project_id:sourceProjectId,
      p_idempotency_key:idempotencyKey
    });
    if(error){
      const message=String(error.message||'');
      if(message.includes('ADMIN_REQUIRED'))return NextResponse.json({error:'Admin access required.'},{status:403});
      if(message.includes('SOURCE_PROJECT_NOT_FOUND'))return NextResponse.json({error:'Source project not found.'},{status:404});
      if(message.includes('IDEMPOTENCY_KEY_INVALID'))return NextResponse.json({error:'A valid duplication request key is required.'},{status:400});
      throw error;
    }

    return NextResponse.json({ok:true,item:data},{status:data?.already_created?200:201});
  }catch(error){
    console.error('project duplication error',error instanceof Error?{name:error.name,message:error.message}:{name:'unknown'});
    return NextResponse.json({error:'Unable to duplicate this project safely.'},{status:500});
  }
}
