import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request:Request){
  const contentType=request.headers.get('content-type')||'';
  let email='';
  try{
    if(contentType.includes('application/json')) email=String((await request.json()).email||'').trim().toLowerCase();
    else email=String((await request.formData()).get('email')||'').trim().toLowerCase();
  }catch{}
  if(!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey) return NextResponse.json({error:'Newsletter signup is temporarily unavailable.'},{status:503});
  const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await supabase.from('newsletter_subscribers').upsert({email,status:'active'},{onConflict:'email'});
  if(error) return NextResponse.json({error:'We could not save your email. Please try again.'},{status:500});
  return NextResponse.redirect(new URL('/newsletter?subscribed=1',request.url),303);
}
