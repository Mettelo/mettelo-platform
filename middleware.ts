import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet={name:string;value:string;options?:CookieOptions};

export async function middleware(request:NextRequest){
  const pathname=request.nextUrl.pathname;
  if(!pathname.startsWith('/member')&&!pathname.startsWith('/admin')) return NextResponse.next();

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!anonKey){
    const target=request.nextUrl.clone();
    target.pathname='/signin';
    target.searchParams.set('reason','not-configured');
    return NextResponse.redirect(target);
  }

  let response=NextResponse.next({request});
  const supabase=createServerClient(url,anonKey,{
    cookies:{
      getAll(){return request.cookies.getAll();},
      setAll(cookies:CookieToSet[]){
        cookies.forEach(({name,value})=>request.cookies.set(name,value));
        response=NextResponse.next({request});
        cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      }
    }
  });
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){
    const target=request.nextUrl.clone();
    target.pathname='/signin';
    target.searchParams.set('next',pathname);
    return NextResponse.redirect(target);
  }
  if(pathname.startsWith('/admin') && user.app_metadata?.role!=='admin'){
    const target=request.nextUrl.clone();
    target.pathname='/member';
    return NextResponse.redirect(target);
  }
  return response;
}

export const config={matcher:['/member/:path*','/admin/:path*']};
