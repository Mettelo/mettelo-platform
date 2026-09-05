import {NextResponse} from 'next/server';
import type {User} from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {validateUsername} from '@/lib/member-identity';

async function ensureIdentityProfile(supabase:Awaited<ReturnType<typeof createServerSupabaseClient>>,user:User){
  const existing=await supabase.from('profiles').select('username,member_id').eq('id',user.id).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data)return existing.data;
  const fullName=String(user.user_metadata?.full_name||'').trim().slice(0,120);
  const created=await supabase.from('profiles').insert({id:user.id,full_name:fullName}).select('username,member_id').single();
  if(created.error)throw created.error;
  return created.data;
}

export async function GET(){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const identity=await ensureIdentityProfile(supabase,user);
    return NextResponse.json({identity});
  }catch(error){
    console.error('member identity load failed',error);
    return NextResponse.json({error:'Unable to load member identity.'},{status:500});
  }
}

export async function POST(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    await ensureIdentityProfile(supabase,user);
    const body=await request.json();
    const validation=validateUsername(String(body.username||''));
    if(!validation.ok)return NextResponse.json({error:validation.error,code:'INVALID'},{status:400});
    const {data,error}=await supabase.rpc('claim_member_username',{p_username:validation.username});
    if(error){console.error('username claim failed',{code:error.code,message:error.message});return NextResponse.json({error:'Unable to save username. Please try again.'},{status:500});}
    const result=Array.isArray(data)?data[0]:data;
    if(!result)return NextResponse.json({error:'Unable to save username. Please try again.'},{status:500});
    if(result.success)return NextResponse.json({identity:{username:result.claimed_username,member_id:result.claimed_member_id},code:result.code});
    const status=result.code==='RATE_LIMITED'?429:result.code==='UNAVAILABLE'?409:400;
    const message=result.code==='RATE_LIMITED'?'Please wait a moment before trying another username.':result.code==='UNAVAILABLE'?'That username is unavailable. Choose another.':result.code==='RESERVED'?'That username is reserved. Choose another.':result.code==='PROFILE_MISSING'?'Your member profile could not be prepared. Please try again.':'Choose a valid username.';
    return NextResponse.json({error:message,code:result.code},{status});
  }catch(error){
    console.error('member identity request failed',error);
    return NextResponse.json({error:'Invalid member identity request.'},{status:400});
  }
}
