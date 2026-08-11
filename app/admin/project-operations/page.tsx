import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import AdminApplicationQueue from '@/components/AdminApplicationQueue';
import AdminTeamFormation from '@/components/AdminTeamFormation';

export const metadata:Metadata={title:'Project Operations | Mettelo Admin',description:'Review project requests, form teams, assign leads and start delivery.'};
export const dynamic='force-dynamic';

type Row={id:string;user_id:string;status:string;submitted_at:string;contribution_statement:string;portfolio_url:string|null;availability:string|null;application_kind:string|null;requested_role:string|null;projects:{title:string}|null;project_roles:{title:string}|null};

export default async function ProjectOperationsPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const db=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
  let items:{id:string;name:string;email:string;project:string;role:string;status:string;submitted_at:string;statement:string;portfolio_url:string|null;availability:string|null}[]=[];
  if(db){
    const {data}=await db.from('project_applications').select('id,user_id,status,submitted_at,contribution_statement,portfolio_url,availability,application_kind,requested_role,projects(title),project_roles(title)').in('status',['submitted','in_review','shortlisted']).order('submitted_at',{ascending:true});
    const rows=(data||[]) as unknown as Row[];const ids=[...new Set(rows.map(r=>r.user_id))];const names=new Map<string,string>();const emails=new Map<string,string>();
    if(ids.length){const {data:profiles}=await db.from('profiles').select('id,full_name').in('id',ids);(profiles||[]).forEach(p=>names.set(p.id,p.full_name||'Mettelo member'));const users=await db.auth.admin.listUsers({page:1,perPage:1000});users.data.users.forEach(u=>{if(ids.includes(u.id))emails.set(u.id,u.email||'');});}
    items=rows.map(row=>({id:row.id,name:names.get(row.user_id)||'Mettelo member',email:emails.get(row.user_id)||'',project:row.projects?.title||'Project',role:row.project_roles?.title||row.requested_role||(row.application_kind==='interest'?'Project interest':'Role not set'),status:row.status,submitted_at:row.submitted_at,statement:row.contribution_statement,portfolio_url:row.portfolio_url,availability:row.availability}));
  }
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Mettelo Admin · Project operations</div><h1>Move requests into real project teams.</h1></div><p>One operating flow: review participation requests, approve the right people, fill the team, assign a lead and start the workspace.</p></div><div className="actions" style={{marginBottom:22}}><a className="button dark" href="/admin/access">Manage admin access →</a><a className="button ghost" href="/admin">Full admin console →</a><a className="button ghost" href="/member">Member mode →</a></div><div className="grid4" style={{marginBottom:22}}><article className="card"><div className="cardNumber">01 / REQUEST</div><h3>Interest or application</h3><p>Every participation request enters one trackable queue and appears for both member and Admin.</p></article><article className="card"><div className="cardNumber">02 / REVIEW</div><h3>Assess fit</h3><p>Move to review, shortlist, approve or decline with an auditable decision.</p></article><article className="card"><div className="cardNumber">03 / FORM TEAM</div><h3>Allocate contributors</h3><p>Approved people enter team formation. Monitor filled places and assign the Project Lead.</p></article><article className="card"><div className="cardNumber">04 / KICKOFF</div><h3>Start delivery</h3><p>Start automatically at threshold or force-start a viable team, then unlock the shared workspace.</p></article></div><section className="panel" style={{marginBottom:22}}><div className="panelHead"><div><span className="cardNumber">INBOX</span><h3 style={{marginTop:8}}>Project request review</h3></div><span className="chip">{items.length} OPEN</span></div><AdminApplicationQueue initialItems={items}/></section><section className="panel"><div className="panelHead"><div><span className="cardNumber">TEAM FORMATION</span><h3 style={{marginTop:8}}>Allocate team, lead and kickoff</h3></div><a className="linkArrow" href="/admin/team-formation">Open focused team view →</a></div><AdminTeamFormation/></section></div></section>;
}
