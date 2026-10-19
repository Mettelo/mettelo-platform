import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import AdminGithubProjectReview from '@/components/AdminGithubProjectReview';
export const dynamic='force-dynamic';
export default async function GithubProjectReviewPage(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)redirect('/signin');
 if(user.app_metadata?.role!=='admin')redirect('/member');
 return <AdminGithubProjectReview/>;
}
