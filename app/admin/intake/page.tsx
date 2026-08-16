import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminIntakeQueue from '@/components/AdminIntakeQueue';

export const dynamic='force-dynamic';
type IntakeRow={id:string;form_type:string;status:string;created_at:string;updated_at:string|null;assigned_to_user_id:string|null;reviewed_at:string|null;resolved_at:string|null;duplicate_of_id:string|null;converted_application_id:string|null;payload:Record<string,unknown>};
export default async function AdminIntakePage(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');const db=serviceDb();let rows:IntakeRow[]=[];let owners:{id:string;name:string;email:string}[]=[];if(db){const [submissions,users]=await Promise.all([db.from('form_submissions').select('id,form_type,status,created_at,updated_at,assigned_to_user_id,reviewed_at,resolved_at,duplicate_of_id,converted_application_id,payload').order('created_at',{ascending:false}).limit(1000),db.auth.admin.listUsers({page:1,perPage:1000})]);rows=(submissions.data||[]) as IntakeRow[];owners=users.data.users.filter(account=>account.app_metadata?.role==='admin').map(account=>({id:account.id,name:String(account.user_metadata?.full_name||account.email?.split('@')[0]||'Admin'),email:account.email||''}));}return <section className="section softSection"><div className="shell"><AdminIntakeQueue initialRows={rows} owners={owners}/></div></section>}
