import { createClient } from '@supabase/supabase-js';

const TRANSIENT_PUBLIC_READ_STATUSES=new Set([429,500,502,503,504]);
const PUBLIC_READ_MAX_ATTEMPTS=3;

function requestMethod(input:RequestInfo|URL,init?:RequestInit){
  if(init?.method)return init.method.toUpperCase();
  if(typeof Request!=='undefined'&&input instanceof Request)return input.method.toUpperCase();
  return 'GET';
}

async function resilientPublicFetch(input:RequestInfo|URL,init?:RequestInit){
  const method=requestMethod(input,init);
  const retryable=method==='GET'||method==='HEAD';
  if(!retryable)return fetch(input,init);

  let lastError:unknown=null;
  for(let attempt=1;attempt<=PUBLIC_READ_MAX_ATTEMPTS;attempt+=1){
    try{
      const response=await fetch(input,init);
      if(!TRANSIENT_PUBLIC_READ_STATUSES.has(response.status)||attempt===PUBLIC_READ_MAX_ATTEMPTS)return response;
    }catch(error){
      lastError=error;
      if(attempt===PUBLIC_READ_MAX_ATTEMPTS)throw error;
    }
    // Read-only anonymous catalogue/path requests can briefly lose PostgREST or
    // connection-pool capacity under long browser suites and production bursts.
    // Retry with a tiny bounded backoff; mutations are never retried here.
    await new Promise(resolve=>setTimeout(resolve,75*attempt));
  }
  throw lastError instanceof Error?lastError:new Error('Public read failed after bounded retries.');
}

export function createPublicSupabaseClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:resilientPublicFetch}});
}
