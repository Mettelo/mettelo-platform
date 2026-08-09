import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProjectDeliveryControls from '@/components/ProjectDeliveryControls';
import ContributionForm from '@/components/ContributionForm';

export const metadata:Metadata={title:'Project Workspace',description:'Private Mettelo Labs project delivery workspace.'};
export const dynamic='force-dynamic';

type Milestone={id:string;title:string;description:string|null;due_at:string|null;status:string;sort_order:number};
type Task={id:string;title:string;description:string|null;status:string;due_at:string|null;milestone_id:string|null;evidence_url:string|null};

export default async function ProjectWorkspace({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/signin?next=${encodeURIComponent(`/member/projects/${id}`)}`);
  const [{data:membership},{data:project}]=await Promise.all([
    supabase.from('project_members').select('id,team_role,joined_at').eq('project_id',id).eq('user_id',user.id).maybeSingle(),
    supabase.from('projects').select('id,title,summary,status,github_url,weekly_commitment').eq('id',id).maybeSingle()
  ]);
  if(!membership||!project) notFound();
  const [{data:milestoneRows},{data:taskRows}]=await Promise.all([
    supabase.from('project_milestones').select('id,title,description,due_at,status,sort_order').eq('project_id',id).order('sort_order').order('created_at'),
    supabase.from('project_tasks').select('id,title,description,status,due_at,milestone_id,evidence_url').eq('project_id',id).order('created_at')
  ]);
  const milestones=(milestoneRows||[]) as Milestone[];
  const tasks=(taskRows||[]) as Task[];
  const canLead=user.app_metadata?.role==='admin'||['project_lead','reviewer'].includes(membership.team_role);
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Mettelo Labs · Private workspace</div><h1>{project.title}</h1></div><p>{project.summary}</p></div>
    <div className="statBand"><div><strong>{project.status.toUpperCase()}</strong><span>Project status</span></div><div><strong>{membership.team_role.replace('_',' ')}</strong><span>Your team role</span></div><div><strong>{milestones.length}</strong><span>Milestones</span></div><div><strong>{tasks.filter(task=>task.status==='done').length}/{tasks.length}</strong><span>Tasks done</span></div></div>
    <div className="dashboardGrid" style={{marginTop:24}}><section className="panel"><div className="panelHead"><h3>Milestones</h3><span className="chip">DELIVERY</span></div>{milestones.length?milestones.map(item=><div className="listRow" key={item.id}><div><strong>{item.title}</strong>{item.description&&<><br/><small>{item.description}</small></>}</div><span className={`chip ${item.status==='completed'?'green':''}`}>{item.status.replace('_',' ').toUpperCase()}</span></div>):<div className="emptyState"><h3>No milestones yet.</h3><p>The Project Lead will break the brief into reviewable delivery stages.</p></div>}</section><section className="panel"><div className="panelHead"><h3>Tasks</h3><span className="chip">OWNERSHIP</span></div>{tasks.length?tasks.map(item=><div className="listRow" key={item.id}><div><strong>{item.title}</strong>{item.due_at&&<><br/><small>Due {new Date(item.due_at).toLocaleDateString('en-GB')}</small></>}</div><span className={`chip ${item.status==='done'?'green':''}`}>{item.status.replace('_',' ').toUpperCase()}</span></div>):<div className="emptyState"><h3>No tasks yet.</h3><p>Tasks make ownership visible before contribution is submitted as Proof.</p></div>}</section></div>
    {canLead&&<div style={{marginTop:24}}><ProjectDeliveryControls projectId={id} milestones={milestones.map(item=>({id:item.id,title:item.title}))}/></div>}
    <div style={{marginTop:24}}><ContributionForm projects={[{id:project.id,title:project.title}]}/></div>
    <div className="actions"><a className="button ghost" href="/member">← Back to My Mettelo</a>{project.github_url&&<a className="button dark" href={project.github_url} target="_blank" rel="noopener noreferrer">Open project repository →</a>}</div>
  </div></section>;
}
