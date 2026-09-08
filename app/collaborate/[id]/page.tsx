import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {serviceDb} from '@/lib/project-flow';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import CollaborationShareActions from '@/components/CollaborationShareActions';
import ExternalCollaborationInviteActions from '@/components/ExternalCollaborationInviteActions';

export const dynamic='force-dynamic';

type Need={id:string;project_id:string;project_run_id:string;responsibility:string|null;target_role_catalogue_id:string|null;target_domain_id:string|null;experience_level:string|null;weekly_commitment:string|null;member_message:string|null;status:string;created_at:string};
type Capacity={available?:number;capacity_available?:boolean};
type Search={invite?:string|string[]};
function one<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}
function oneString(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}

async function loadOpportunity(id:string){
 const db=serviceDb();if(!db)return null;
 const {data:need}=await db.from('project_collaboration_needs').select('id,project_id,project_run_id,responsibility,target_role_catalogue_id,target_domain_id,experience_level,weekly_commitment,member_message,status,created_at').eq('id',id).maybeSingle();
 if(!need)return null;const row=need as Need;
 const [{data:project},{data:run},{data:links},capacityResult]=await Promise.all([
  db.from('projects').select('id,title,summary,status,visibility,project_type,weekly_commitment,late_joining_enabled,late_joining_cutoff_at').eq('id',row.project_id).maybeSingle(),
  db.from('project_runs').select('id,project_id,status,recruitment_open').eq('id',row.project_run_id).eq('project_id',row.project_id).maybeSingle(),
  db.from('project_collaboration_need_capabilities').select('capability_id').eq('collaboration_need_id',row.id),
  db.rpc('phase9_project_run_capacity',{p_project_id:row.project_id,p_run_id:row.project_run_id})
 ]);
 if(!project||!run||project.visibility!=='public')return null;
 const ids=(links||[]).map(item=>String(item.capability_id));
 const [roleResult,domainResult,capabilityResult]=await Promise.all([
  row.target_role_catalogue_id?db.from('project_role_catalogue').select('title').eq('id',row.target_role_catalogue_id).eq('active',true).maybeSingle():Promise.resolve({data:null}),
  row.target_domain_id?db.from('domains').select('name').eq('id',row.target_domain_id).eq('is_active',true).maybeSingle():Promise.resolve({data:null}),
  ids.length?db.from('capabilities').select('id,name').in('id',ids).eq('is_active',true):Promise.resolve({data:[]})
 ]);
 const capacity=one(capacityResult.data as Capacity|Capacity[]|null);
 const cutoffClosed=Boolean(project.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());
 const accepting=row.status==='active'&&!['cancelled','completed','archived'].includes(project.status)&&['forming','active'].includes(run.status)&&run.recruitment_open!==false&&(run.status!=='active'||(project.late_joining_enabled!==false&&!cutoffClosed))&&capacity?.capacity_available===true&&Number(capacity.available||0)>0;
 return{need:row,project,run,role:roleResult.data?.title||null,domain:domainResult.data?.name||null,capabilities:(capabilityResult.data||[]).map(item=>String(item.name)),openPlaces:accepting?Number(capacity?.available||0):0,accepting};
}

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;const item=await loadOpportunity(id);
 if(!item)return{title:'Collaboration opportunity | Mettelo',description:'Discover collaboration opportunities through Mettelo.',robots:{index:false,follow:false}};
 const role=item.role||item.need.responsibility||'collaborator';const title=`Collaborator needed: ${item.project.title}`;const description=`${item.project.title} is looking for a ${role} through Mettelo.${item.need.weekly_commitment||item.project.weekly_commitment?` Commitment: ${item.need.weekly_commitment||item.project.weekly_commitment}.`:''}`.slice(0,300);const canonical=`https://mettelo.com/collaborate/${encodeURIComponent(id)}`;
 return{title,description,alternates:{canonical},robots:{index:item.accepting,follow:true},openGraph:{title,description,url:canonical,siteName:'Mettelo',type:'website'},twitter:{card:'summary',title,description}};
}

export default async function CollaborationOpportunityPage({params,searchParams}:{params:Promise<{id:string}>;searchParams?:Promise<Search>}){
 const {id}=await params;const query=await searchParams||{};const inviteToken=oneString(query.invite).trim().slice(0,180);const item=await loadOpportunity(id);if(!item)notFound();
 let user=null;try{const auth=await createServerSupabaseClient();const result=await auth.auth.getUser();user=result.data.user}catch{user=null}
 const analyticsDb=serviceDb();if(analyticsDb)void analyticsDb.rpc('phase18_record_collaboration_analytics',{p_event_type:'opportunity_viewed',p_collaboration_need_id:id,p_surface:'public_opportunity',p_actor_user_id:user?.id||null});
 const role=item.role||item.need.responsibility||'Project collaborator';const commitment=item.need.weekly_commitment||item.project.weekly_commitment||'See project details';const publicUrl=`https://mettelo.com/collaborate/${encodeURIComponent(id)}`;const interestTarget=`/member/discover/${item.project.id}?collaboration_need=${encodeURIComponent(id)}`;const inviteLanding=`/collaborate/${encodeURIComponent(id)}${inviteToken?`?invite=${encodeURIComponent(inviteToken)}`:''}`;const cta=user?interestTarget:`/signin?next=${encodeURIComponent(inviteToken?inviteLanding:interestTarget)}`;const shareText=`We’re looking for ${role} to join the Mettelo project: ${item.project.title}.${item.capabilities.length?` Useful capabilities: ${item.capabilities.join(', ')}.`:''} Commitment: ${commitment}.`;
 return <section className="section softSection"><div className="shell formShell"><div className="eyebrow">COLLABORATOR NEEDED</div><h1>{item.project.title}</h1><p className="lead">{item.project.summary}</p><article className="formCard" aria-labelledby="collaboration-need-heading"><h2 id="collaboration-need-heading">What this project needs</h2><dl><div><dt>Looking for</dt><dd>{role}</dd></div>{item.capabilities.length>0&&<div><dt>Useful capabilities</dt><dd>{item.capabilities.join(' · ')}</dd></div>}{item.domain&&<div><dt>Domain</dt><dd>{item.domain}</dd></div>}{item.need.experience_level&&<div><dt>Experience level</dt><dd>{item.need.experience_level}</dd></div>}<div><dt>Commitment</dt><dd>{commitment}</dd></div><div><dt>Project stage</dt><dd>{item.project.status}</dd></div><div><dt>Places available</dt><dd>{item.openPlaces}</dd></div>{item.project.late_joining_cutoff_at&&<div><dt>Joining deadline</dt><dd>{new Date(item.project.late_joining_cutoff_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</dd></div>}</dl>{item.need.member_message&&<p>{item.need.member_message}</p>}{item.accepting?inviteToken?user?<><div className="eyebrow">DIRECT INVITATION</div><p>This invitation must be accepted by the account it was sent to. Accepting only continues to Mettelo’s canonical project-interest process; it does not add you to the project automatically.</p><ExternalCollaborationInviteActions token={inviteToken} fallbackHref={publicUrl}/></>:<div className="actions"><a className="button dark" href={cta}>Sign in or create account to respond</a><a className="button ghost" href={publicUrl}>View without invitation</a></div>:<div className="actions"><a className="button dark" href={cta}>I’m interested</a><a className="button ghost" href={`/projects/${item.project.id}`}>View project</a></div>:<div role="status"><strong>This project is no longer accepting collaborators.</strong><p>You can still view the project and explore other opportunities on Mettelo.</p><a className="button ghost" href="/projects">Explore projects</a></div>}</article>{item.accepting&&<section aria-labelledby="share-collaboration-title"><div className="eyebrow">SHARE OPPORTUNITY</div><h2 id="share-collaboration-title">Know someone who may fit?</h2><p>Share the public collaboration page. Private project workspace information is never included.</p><CollaborationShareActions url={publicUrl} text={shareText} collaborationNeedId={id}/></section>}</div></section>;
}
