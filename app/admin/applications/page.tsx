import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminApplicationQueue from '@/components/AdminApplicationQueue';

export const dynamic='force-dynamic';
const pageSize=10;
export default async function AdminApplicationsPage({searchParams}:{searchParams?:Promise<{page?:string}>}){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  const params=await searchParams||{};const page=Math.max(1,Number(params.page||1)||1);const db=serviceDb();if(!db)return <section className="section"><div className="shell"><div className="emptyState"><h1>Admin data service unavailable.</h1></div></div></section>;
  const from=(page-1)*pageSize;const to=from+pageSize-1;
  const {data:rows,count}=await db.from('project_applications').select('id,user_id,status,submitted_at,contribution_statement,portfolio_url,availability,application_kind,requested_role,projects(title),project_roles(title)',{count:'exact'}).in('status',['submitted','in_review','shortlisted']).order('submitted_at',{ascending:true}).range(from,to);
  const ids=[...new Set((rows||[]).map(row=>row.user_id))];const profileMap=new Map<string,string>();if(ids.length){const {data:profiles}=await db.from('profiles').select('id,full_name').in('id',ids);(profiles||[]).forEach(p=>profileMap.set(p.id,p.full_name||'Mettelo member'));}
  const authUsers=ids.length?await db.auth.admin.listUsers({page:1,perPage:1000}):null;const emailMap=new Map<string,string>();authUsers?.data.users.forEach(u=>{if(ids.includes(u.id))emailMap.set(u.id,u.email||'');});
  const items=(rows||[]).map(row=>{const project=Array.isArray(row.projects)?row.projects[0]:row.projects;const role=Array.isArray(row.project_roles)?row.project_roles[0]:row.project_roles;return {id:row.id,name:profileMap.get(row.user_id)||'Mettelo member',email:emailMap.get(row.user_id)||'',project:project?.title||'Project',role:role?.title||row.requested_role||((row.application_kind||'application')==='interest'?'Project interest':'Role'),status:row.status,submitted_at:row.submitted_at,statement:row.contribution_statement,portfolio_url:row.portfolio_url,availability:row.availability};});
  const total=count||0;const pages=Math.max(1,Math.ceil(total/pageSize));
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Admin · Applications</div><h1>Review project demand without overfilling teams.</h1></div><p>Review ten requests at a time, select applicants from one project, and bulk progress them. Approval stops automatically when the team threshold is reached.</p></div><div className="panel"><div className="panelHead"><strong>{total} active request{total===1?'':'s'}</strong><span className="chip">PAGE {page} / {pages}</span></div><AdminApplicationQueue initialItems={items}/><div className="actions" style={{justifyContent:'space-between',marginTop:20}}>{page>1?<a className="button ghost" href={`/admin/applications?page=${page-1}`}>← Previous page</a>:<span/>}{page<pages?<a className="button dark" href={`/admin/applications?page=${page+1}`}>Next page →</a>:<span/>}</div></div></div></section>;
}
