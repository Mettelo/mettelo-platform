import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request:Request){
  const url=new URL(request.url);
  const code=url.searchParams.get('code');
  const next=url.searchParams.get('next')||'/member';
  const safeNext=next.startsWith('/')&&!next.startsWith('//')?next:'/member';

  if(code){
    try{
      const supabase=await createServerSupabaseClient();
      const {error}=await supabase.auth.exchangeCodeForSession(code);
      if(!error) return NextResponse.redirect(new URL(safeNext,url.origin));
    }catch{}
  }

  const target=new URL('/signin',url.origin);
  target.searchParams.set('error','auth-callback');
  return NextResponse.redirect(target);
}
