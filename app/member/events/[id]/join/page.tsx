import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ProjectVideoRoom from '@/components/ProjectVideoRoom';
import styles from '@/components/Phase6Events.module.css';

export const metadata:Metadata={title:'Project event room',description:'A secure Mettelo project event room.'};
export default async function JoinProjectEvent({params}:{params:Promise<{id:string}>}){const {id}=await params;const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/events/${id}/join`)}`);return <main className={styles.videoPage}><ProjectVideoRoom eventId={id}/></main>}
