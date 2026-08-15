import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

function safePath(value:string|null,fallback:string){if(!value)return fallback;return value.startsWith('/')&&!value.startsWith('//')?value:fallback}
function signinTarget(url:URL,flow:string,error:string,next:string){const target=new URL('/signin',url.origin);target.searchParams.set('error',error);if(flow==='signup'||flow==='social-signup')target.searchParams.set('mode','signup');if(flow==='recovery')target.searchParams.set('mode','reset');if(next)target.searchParams.set('next',next);return target}

export async function GET(request:Request){
  const url=new URL(request.url);const code=url.searchParams.get('code');const flow=url.searchParams.get('flow')||'oauth';const next=safePath(url.searchParams.get('next'),flow==='recovery'?'/auth/update-password':flow==='social-signup'?'/onboarding':'/member');
  const providerError=url.searchParams.get('error');const providerDescription=(url.searchParams.get('error_description')||'').toLowerCase();
  if(providerError){const cancelled=providerError==='access_denied'||providerDescription.includes('cancel')||providerDescription.includes('denied');return NextResponse.redirect(signinTarget(url,flow,cancelled?'oauth-cancelled':'oauth-failed',next))}
  if(code){
    try{
      const supabase=await createServerSupabaseClient();const {error}=await supabase.auth.exchangeCodeForSession(code);
      if(!error){
        if(flow==='signup'){const target=new URL('/auth/verified',url.origin);target.searchParams.set('next',next);return NextResponse.redirect(target)}
        if(flow==='social-signup'){const target=new URL('/auth/social-complete',url.origin);target.searchParams.set('next',next);return NextResponse.redirect(target)}
        return NextResponse.redirect(new URL(next,url.origin));
      }
    }catch{}
  }
  return NextResponse.redirect(signinTarget(url,flow,'expired-link',next));
}
