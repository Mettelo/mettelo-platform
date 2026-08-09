import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!anonKey) throw new Error('Supabase environment variables are not configured.');

  const cookieStore=await cookies();
  return createServerClient(url,anonKey,{
    cookies:{
      getAll(){return cookieStore.getAll();},
      setAll(items){
        try{items.forEach(({name,value,options})=>cookieStore.set(name,value,options));}
        catch{
          // Server Components cannot always mutate cookies. Middleware refreshes sessions.
        }
      }
    }
  });
}
