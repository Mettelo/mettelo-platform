import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import AdminGithubProjectImport from '@/components/AdminGithubProjectImport';
export const dynamic='force-dynamic';
export default async function GithubImportPage(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)redirect('/signin');
 if(user.app_metadata?.role!=='admin')redirect('/member');
 return <AdminGithubProjectImport/>;
}
