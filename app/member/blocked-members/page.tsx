import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import BlockedMembersManager from '@/components/BlockedMembersManager';

export const dynamic='force-dynamic';

export default async function BlockedMembersPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin?next=%2Fmember%2Fblocked-members');
 return <main><BlockedMembersManager/></main>;
}
