import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import AdminGovernanceQueue from '@/components/AdminGovernanceQueue';
import AdminProjectParticipationSummary from '@/components/AdminProjectParticipationSummary';
export const metadata:Metadata={title:'Project Governance | Mettelo Admin',description:'Review risk, participation, intervene in governed projects and assign Project Architects.'};
export const dynamic='force-dynamic';
export default async function ProjectGovernancePage(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Mettelo Admin · Governance</div><h1>Global project authority.</h1></div><p>Approve controlled work, verify participation and capacity, assign delivery oversight, or pause, deny, reverse, unpublish and investigate any Architect-created project. Every action requires a reason.</p></div><AdminProjectParticipationSummary/><AdminGovernanceQueue/></div></section>}
