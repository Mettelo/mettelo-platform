import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet={name:string;value:string;options?:CookieOptions};

function safePath(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:null}
function normalizeProjectIntent(value:string|null){const safe=safePath(value);if(!safe)return null;const match=safe.match(/^\/projects\/([^/?#]+)(?:\?[^#]*)?#apply$/);return match?`/member/discover/${encodeURIComponent(match[1])}/apply`:safe}

export async function middleware(request:NextRequest){
  const pathname=request.nextUrl.pathname;
  if(pathname==='/signin'){
    const response=NextResponse.next();const intent=normalizeProjectIntent(request.nextUrl.searchParams.get('next'));
    if(intent&&intent!=='/member')response.cookies.set('mettelo_return_to',intent,{httpOnly:true,sameSite:'lax',secure:request.nextUrl.protocol==='https:',path:'/',maxAge:60*60*4});
    return response;
  }
  const architectEntry=pathname==='/project-architect';
  const protectedPath=pathname.startsWith('/member')||pathname.startsWith('/admin')||architectEntry;
  if(!protectedPath)return NextResponse.next();

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!anonKey){
    const target=request.nextUrl.clone();
    target.pathname='/signin';
    target.searchParams.set('reason','not-configured');
    if(architectEntry)target.searchParams.set('next','/member/project-architect');
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
    const requested=`${pathname}${request.nextUrl.search}`;
    target.searchParams.set('next',architectEntry?'/member/project-architect':requested);
    return NextResponse.redirect(target);
  }
  if(architectEntry){
    const target=request.nextUrl.clone();
    target.pathname='/member/project-architect';
    target.search='';
    return NextResponse.redirect(target);
  }
  if(pathname.startsWith('/admin') && user.app_metadata?.role!=='admin'){
    const target=request.nextUrl.clone();
    target.pathname='/member';
    return NextResponse.redirect(target);
  }
  return response;
}

export const config={matcher:['/signin','/member/:path*','/admin/:path*','/project-architect']};