import AuthAccountClient from './AuthAccountClient';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import './signin.css';

export const dynamic='force-dynamic';

async function getMemberCount(){
  const db=createPublicSupabaseClient();
  if(!db)return null;
  const result=await db.from('profiles').select('id',{count:'exact',head:true});
  return result.count??null;
}

export default async function SignInPage(){
  const memberCount=await getMemberCount();
  return <AuthAccountClient memberCount={memberCount}/>;
}
