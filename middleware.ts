import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {adminRouteAllowed} from '@/lib/admin-route-capabilities';
import {isTrustedAdmin} from '@/lib/admin-capabilities';

type CookieToSet={name:string;value:string;options?:CookieOptions};

function safePath(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:null}
function normalizeProjectIntent(value:string|null){const safe=safePath(value);if(!safe)return null;const match=safe.match(/^\/projects\/([^/?#]+)(?:\?[^#]*)?#apply$/);return match?`/member/discover/${encodeURIComponent(match[1])}/apply`:safe}
function rememberIntent(response:NextResponse,request:NextRequest,intent:string|null){if(intent&&intent!=='/member')response.cookies.set('mettelo_return_to',intent,{httpOnly:true,sameSite:'lax',secure:request.nextUrl.protocol==='https:',path:'/',maxAge:60*60*4});return response}
function adminApiError(message:string,status:number){return NextResponse.json({error:message},{status})}
function preserveAuthCookies(source:NextResponse,target:NextResponse){for(const cookie of source.cookies.getAll())target.cookies.set(cookie);return target}

export async function middleware(request:NextRequest){
  const pathname=request.nextUrl.pathname;
  if(pathname==='/signin'){
    const rawNext=request.nextUrl.searchParams.get('next');const intent=normalizeProjectIntent(rawNext);
    if(rawNext&&intent&&rawNext!==intent){const target=request.nextUrl.clone();target.searchParams.set('next',intent);return rememberIntent(NextResponse.redirect(target),request,intent)}
    return rememberIntent(NextResponse.next(),request,intent);
  }
  const architectEntry=pathname==='/project-architect';
  const adminPage=pathname.startsWith('/admin');
  const adminApi=pathname.startsWith('/api/admin');
  const protectedPath=pathname.startsWith('/member')||adminPage||adminApi||architectEntry;
  if(!protectedPath)return NextResponse.next();

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!anonKey){
    if(adminApi)return adminApiError('Authentication service is not configured.',503);
    const target=request.nextUrl.clone();target.pathname='/signin';target.searchParams.set('reason','not-configured');if(architectEntry)target.searchParams.set('next','/member/project-architect');return NextResponse.redirect(target);
  }

  let response=NextResponse.next({request});
  const supabase=createServerClient(url,anonKey,{
    cookies:{
      getAll(){return request.cookies.getAll();},
      setAll(cookies:CookieToSet[]){cookies.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
    }
  });
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){
    if(adminApi)return preserveAuthCookies(response,adminApiError('Authentication required.',401));
    const target=request.nextUrl.clone();target.pathname='/signin';const requested=`${pathname}${request.nextUrl.search}`;target.searchParams.set('next',architectEntry?'/member/project-architect':requested);return preserveAuthCookies(response,NextResponse.redirect(target));
  }
  if(architectEntry){const target=request.nextUrl.clone();target.pathname='/member/project-architect';target.search='';return preserveAuthCookies(response,NextResponse.redirect(target))}
  if(adminPage||adminApi){
    if(!isTrustedAdmin(user)){
      if(adminApi)return preserveAuthCookies(response,adminApiError('Admin access required.',403));
      const target=request.nextUrl.clone();target.pathname='/member';target.search='';return preserveAuthCookies(response,NextResponse.redirect(target));
    }
    if(!adminRouteAllowed(user,pathname)){
      if(adminApi)return preserveAuthCookies(response,adminApiError('Admin capability required for this route.',403));
      const target=request.nextUrl.clone();target.pathname='/admin';target.search='';target.searchParams.set('reason','capability');return preserveAuthCookies(response,NextResponse.redirect(target));
    }
  }
  return response;
}

export const config={matcher:['/signin','/member/:path*','/admin/:path*','/api/admin/:path*','/project-architect']};
