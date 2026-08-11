import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import AdminTeamFormation from '@/components/AdminTeamFormation';

export const metadata:Metadata={title:'Team Formation | Mettelo Admin',description:'Monitor project team formation, kickoff and lead assignment.'};
export const dynamic='force-dynamic';

export default async function TeamFormationPage(){
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Mettelo Admin · Project operations</div><h1>Team formation</h1></div><p>See approved members fill each project, assign the Project Lead, start a partial team when needed, or cancel with a clear reason.</p></div><div className="actions" style={{marginBottom:20}}><a className="button ghost" href="/admin">← Back to Admin</a><a className="button ghost" href="/admin#applications">Application queue →</a></div><AdminTeamFormation/></div></section>;
}
