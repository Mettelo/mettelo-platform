import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ArchitectProjectForm from '@/components/ArchitectProjectForm';

export const dynamic='force-dynamic';
export default async function NewArchitectProjectPage(){const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin');const {data:identity}=await supabase.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle();if(identity?.account_type!=='project_architect'&&user.app_metadata?.role!=='admin')redirect('/member/project-architect');return <section className="section softSection memberWorkspace"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Project Architect · New proposal</div><h1>Create a governed Data &amp; AI project.</h1></div><p>Define the problem, evidence, delivery shape and risk. The proposal remains private until an independent review is complete.</p></div><ArchitectProjectForm/></div></section>}
