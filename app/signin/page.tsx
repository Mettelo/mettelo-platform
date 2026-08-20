import {redirect} from 'next/navigation';
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

function memberApplicationReturn(next:string|undefined){
  const match=next?.match(/^\/projects\/([0-9a-f-]{36})#apply$/i);
  return match?`/member/discover/${match[1]}/apply`:null;
}

export default async function SignInPage({searchParams}:{searchParams:Promise<{next?:string|string[]}>}){
  const query=await searchParams;
  const requestedNext=Array.isArray(query.next)?query.next[0]:query.next;
  const canonicalNext=memberApplicationReturn(requestedNext);
  if(canonicalNext)redirect(`/signin?next=${encodeURIComponent(canonicalNext)}`);
  const memberCount=await getMemberCount();
  return <AuthAccountClient memberCount={memberCount}/>;
}
