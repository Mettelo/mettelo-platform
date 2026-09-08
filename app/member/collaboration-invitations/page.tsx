import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberCollaborationInvitations from '@/components/MemberCollaborationInvitations';

export const dynamic='force-dynamic';

export default async function CollaborationInvitationsPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin?next=%2Fmember%2Fcollaboration-invitations');
 return <main><MemberCollaborationInvitations/></main>;
}
