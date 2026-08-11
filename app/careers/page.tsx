import type {Metadata} from 'next';
import Link from 'next/link';
import {createPublicSupabaseClient} from '@/lib/supabase/public';

export const metadata:Metadata={title:'Careers at Mettelo',description:'Join the Mettelo team and help build professional capability infrastructure for Data & AI.'};
export const dynamic='force-dynamic';

type Role={id:string;slug:string;title:string;team:string|null;employment_type:string;location:string|null;work_arrangement:string|null;salary_text:string|null;summary:string;closes_at:string|null};
export default async function CareersPage(){
  const db=createPublicSupabaseClient();let roles:Role[]=[];let loadError=false;
  if(db){const result=await db.from('career_roles').select('id,slug,title,team,employment_type,location,work_arrangement,salary_text,summary,closes_at').eq('status','published').or(`closes_at.is.null,closes_at.gt.${new Date().toISOString()}`).order('published_at',{ascending:false});if(result.error)loadError=true;else roles=(result.data||[]) as Role[];}else loadError=true;
  return <>
    <section className="hero"><div className="shell heroGrid"><div><div className="eyebrow">Careers at Mettelo</div><h1>Help build what Data & AI professionals need next.</h1><p className="heroLead">Careers is for roles working directly with Mettelo. These are not external jobs from the Opportunities board.</p></div><aside className="heroPanel"><span className="chip">WORK WITH METTELO</span><h3 style={{marginTop:18}}>Internal roles only.</h3><p>Employment, contract and internship opportunities to help build Mettelo itself are published here.</p><div className="path"><span>Role</span><span>Apply</span><span>Review</span><span>Interview</span><span>Outcome</span></div></aside></div></section>
    <section className="section"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Open roles</div><h2>{roles.length?'Current opportunities to join Mettelo.':'No roles are open right now.'}</h2></div><p>Every application receives a confirmation and meaningful recruitment-stage updates by email.</p></div>
      {loadError?<div className="panel emptyState"><h3>Careers is temporarily unavailable.</h3><p>Please try again later.</p></div>:roles.length?<div className="projectGrid">{roles.map(role=><article className="projectCard" key={role.id}><div><span className="chip green">OPEN</span><h3>{role.title}</h3><p>{role.summary}</p><div className="metaRow"><span className="metaPill">{role.team||'Mettelo'}</span><span className="metaPill">{role.employment_type.replaceAll('_',' ')}</span>{role.location&&<span className="metaPill">{role.location}</span>}{role.work_arrangement&&<span className="metaPill">{role.work_arrangement}</span>}</div>{role.salary_text&&<p><strong>{role.salary_text}</strong></p>}{role.closes_at&&<small>Closes {new Date(role.closes_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</small>}</div><div className="projectFoot"><span>Join the Mettelo team</span><Link className="button dark" href={`/careers/${role.slug}`}>View role →</Link></div></article>)}</div>:<div className="panel emptyState"><h3>There are no open Mettelo vacancies today.</h3><p>We only publish real internal roles when we are actively recruiting. External Data & AI opportunities remain available on the Opportunities board.</p><Link className="button ghost" href="/opportunities">Explore external opportunities →</Link></div>}
    </div></section>
  </>;
}
