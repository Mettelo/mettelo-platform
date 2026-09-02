import { createClient } from '@supabase/supabase-js';

const TRANSIENT_PUBLIC_READ_STATUSES=new Set([429,502,503,504]);

function requestMethod(input:RequestInfo|URL,init?:RequestInit){
  if(init?.method)return init.method.toUpperCase();
  if(typeof Request!=='undefined'&&input instanceof Request)return input.method.toUpperCase();
  return 'GET';
}

async function resilientPublicFetch(input:RequestInfo|URL,init?:RequestInit){
  const method=requestMethod(input,init);
  const retryable=method==='GET'||method==='HEAD';
  try{
    const response=await fetch(input,init);
    if(!retryable||!TRANSIENT_PUBLIC_READ_STATUSES.has(response.status))return response;
  }catch(error){
    if(!retryable)throw error;
  }
  // Anonymous catalogue/path reads are intentionally retryable once. Long E2E and
  // production traffic can briefly exhaust PostgREST/pool capacity; one transient
  // read failure must not turn a healthy public catalogue into an unavailable page.
  await new Promise(resolve=>setTimeout(resolve,75));
  return fetch(input,init);
}

export function createPublicSupabaseClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:resilientPublicFetch}});
}
