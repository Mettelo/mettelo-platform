import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function clean(value:unknown,max=180){return String(value??'').trim().slice(0,max);}
async function adminDb(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
  if(!user||user.app_metadata?.role!=='admin') return null;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return null;
  return {db:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),user};
}

export async function GET(){
  const ctx=await adminDb();if(!ctx)return NextResponse.json({error:'Admin access required.'},{status:403});
  const {data,error}=await ctx.db.from('opportunity_ingestion_sources').select('id,provider,organisation_name,source_key,region,employer_domain,is_active,auto_publish_enabled,last_synced_at,last_sync_status,last_sync_error,created_at').order('organisation_name');
  if(error)return NextResponse.json({error:'Unable to load sources.'},{status:500});return NextResponse.json({sources:data||[]});
}

export async function POST(request:Request){
  const ctx=await adminDb();if(!ctx)return NextResponse.json({error:'Admin access required.'},{status:403});
  const body=await request.json();const provider=clean(body.provider,30);const organisation=clean(body.organisation_name);const sourceKey=clean(body.source_key,120);const region=clean(body.region,20)||'global';const employerDomain=clean(body.employer_domain,180).toLowerCase();
  if(!['greenhouse','lever'].includes(provider)||!organisation||!sourceKey)return NextResponse.json({error:'Provider, organisation and source key are required.'},{status:400});
  if(!/^[a-zA-Z0-9._-]+$/.test(sourceKey))return NextResponse.json({error:'Source key contains unsupported characters.'},{status:400});
  if(!['global','eu'].includes(region))return NextResponse.json({error:'Invalid source region.'},{status:400});
  const {data,error}=await ctx.db.from('opportunity_ingestion_sources').insert({provider,organisation_name:organisation,source_key:sourceKey,region,employer_domain:employerDomain||null,created_by:ctx.user.id}).select('*').single();
  if(error)return NextResponse.json({error:error.code==='23505'?'That ATS source is already registered.':'Unable to add source.'},{status:error.code==='23505'?409:500});return NextResponse.json({source:data});
}

export async function PATCH(request:Request){
  const ctx=await adminDb();if(!ctx)return NextResponse.json({error:'Admin access required.'},{status:403});
  const body=await request.json();const id=clean(body.id,80);if(!id)return NextResponse.json({error:'Source id is required.'},{status:400});
  const changes:Record<string,unknown>={updated_at:new Date().toISOString()};if(typeof body.is_active==='boolean')changes.is_active=body.is_active;if(typeof body.auto_publish_enabled==='boolean')changes.auto_publish_enabled=body.auto_publish_enabled;
  const {data,error}=await ctx.db.from('opportunity_ingestion_sources').update(changes).eq('id',id).select('*').single();if(error)return NextResponse.json({error:'Unable to update source.'},{status:500});return NextResponse.json({source:data});
}
