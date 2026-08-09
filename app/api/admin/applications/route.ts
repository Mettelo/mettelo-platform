import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const statuses=new Set(['submitted','in_review','shortlisted','accepted','declined']);

async function adminDb(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user) return {error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin') return {error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return {error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return {db:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})};
}

export async function PATCH(request:Request){
  try{
    const connection=await adminDb();
    if('error' in connection) return connection.error;
    const {db}=connection;
    const body=await request.json();
    const id=String(body.id||'');
    const status=String(body.status||'');
    const reviewerNotes=String(body.reviewer_notes||'').trim().slice(0,1500);
    if(!id||!statuses.has(status)) return NextResponse.json({error:'Choose a valid application and status.'},{status:400});

    const {data:application,error:loadError}=await db.from('project_applications').select('id,project_id,project_role_id,user_id,status').eq('id',id).single();
    if(loadError||!application) return NextResponse.json({error:'Application not found.'},{status:404});

    const {data:updated,error}=await db.from('project_applications').update({status,reviewer_notes:reviewerNotes||null,updated_at:new Date().toISOString()}).eq('id',id).select('id,status').single();
    if(error) throw error;

    if(status==='accepted'){
      const {error:memberError}=await db.from('project_members').upsert({
        project_id:application.project_id,
        user_id:application.user_id,
        project_role_id:application.project_role_id,
        team_role:'contributor'
      },{onConflict:'project_id,user_id'});
      if(memberError) throw memberError;
    }

    return NextResponse.json({ok:true,application:updated});
  }catch(error){
    console.error('application review error',error);
    return NextResponse.json({error:'Unable to update this application.'},{status:500});
  }
}
