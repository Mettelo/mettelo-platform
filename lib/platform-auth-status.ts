import {unstable_noStore as noStore} from 'next/cache';

export type PlatformConfigurationState='configured'|'missing'|'enabled'|'disabled'|'unknown';
export type PlatformAuthStatus={
 supabase_client:PlatformConfigurationState;
 admin_service:PlatformConfigurationState;
 callback_origin:PlatformConfigurationState;
 auth_service:PlatformConfigurationState;
 email_signup:PlatformConfigurationState;
 google:PlatformConfigurationState;
 github:PlatformConfigurationState;
};

function booleanState(value:unknown):PlatformConfigurationState{return typeof value==='boolean'?(value?'enabled':'disabled'):'unknown'}
function object(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}

export async function getPlatformAuthStatus():Promise<PlatformAuthStatus>{
 noStore();
 const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim().replace(/\/$/,'');
 const anonKey=(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'').trim();
 const serviceKey=(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 const callbackOrigin=(process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN||'').trim();
 const base:PlatformAuthStatus={
  supabase_client:url&&anonKey?'configured':'missing',
  admin_service:url&&serviceKey?'configured':'missing',
  callback_origin:callbackOrigin?'configured':'missing',
  auth_service:url&&anonKey?'unknown':'missing',
  email_signup:'unknown',google:'unknown',github:'unknown'
 };
 if(!url||!anonKey)return base;
 try{
  const response=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:anonKey,authorization:`Bearer ${anonKey}`},cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return base;
  const body=object(await response.json());if(!body)return base;
  const external=object(body.external);
  const disableSignup=body.disable_signup;
  return{...base,auth_service:'enabled',email_signup:typeof disableSignup==='boolean'?(disableSignup?'disabled':'enabled'):'unknown',google:booleanState(external?.google),github:booleanState(external?.github)};
 }catch{return base}
}
