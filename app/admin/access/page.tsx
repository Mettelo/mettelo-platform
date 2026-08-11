import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import AdminAccessManager from '@/components/AdminAccessManager';

export const metadata:Metadata={title:'Admin Access | Mettelo',description:'Control which Mettelo accounts have administrative access.'};
export const dynamic='force-dynamic';

export default async function AdminAccessPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Mettelo Admin · Security</div><h1>Admin access</h1></div><p>Public registration creates members only. Use this page to explicitly grant or remove administrative access.</p></div><div className="actions" style={{marginBottom:20}}><a className="button ghost" href="/admin/project-operations">← Project operations</a><a className="button ghost" href="/member">Member mode →</a></div><section className="panel"><div className="panelHead"><div><span className="cardNumber">ACCESS CONTROL</span><h3 style={{marginTop:8}}>Manage administrative accounts</h3></div><span className="chip green">ADMIN ONLY</span></div><p style={{marginTop:0}}>A person can create a Mettelo member account themselves, but they cannot make themselves an Admin. Grant access here only to people who need to operate the platform.</p><AdminAccessManager/></section></div></section>;
}
