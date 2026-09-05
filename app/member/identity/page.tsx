import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberIdentityClaimForm from '@/components/MemberIdentityClaimForm';

export const dynamic='force-dynamic';

export default async function MemberIdentityPage({searchParams}:{searchParams:Promise<{next?:string}>}){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=%2Fmember%2Fidentity');
  const {data}=await supabase.from('profiles').select('full_name,username,member_id').eq('id',user.id).single();
  const params=await searchParams;const next=params.next&&params.next.startsWith('/')&&!params.next.startsWith('//')?params.next:'/member/profile';
  return <section className="section softSection"><div className="shell" style={{maxWidth:760}}><div className="eyebrow">Member identity</div><h1 style={{fontSize:'clamp(2rem,7vw,3.75rem)',margin:'0 0 14px'}}>Your Mettelo identity.</h1><p className="lead">Your account keeps its secure internal Auth ID. Mettelo uses a separate Member ID and username for people-facing collaboration, attribution and support.</p>{data?.username?<div className="panel" style={{marginTop:24,padding:'clamp(20px,4vw,32px)'}}><strong>{data.full_name||'Mettelo member'}</strong><p style={{margin:'8px 0 0'}}>@{data.username}</p><p style={{margin:'4px 0 0',color:'var(--slate)'}}>Member ID: {data.member_id}</p></div>:<div style={{marginTop:24}}><MemberIdentityClaimForm next={next}/></div>}</div></section>;
}
