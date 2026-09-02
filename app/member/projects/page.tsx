import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import MemberProjectsCapabilityPathStrip from '@/components/MemberProjectsCapabilityPathStrip';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {humaniseProjectValue,matchesProjectPortfolioFilter,nextPortfolioTask,projectPriority,type PortfolioTask} from '@/lib/member-projects';
import styles from './member-projects.module.css';

export const metadata:Metadata={title:'My Projects · My Mettelo',description:'Manage ongoing, preparing and completed Mettelo project work from one member portfolio.'};
export const dynamic='force-dynamic';

const PAGE_SIZE=6;
type Project={id:string;title:string;status:string;team_size_threshold:number|null;project_type:string|null};
type Run={id:string;status:string;run_number:number};
type Membership={id:string;team_role:string;membership_status:string;joined_at:string;project_id:string;project_run_id:string|null;projects:Project|Project[]|null;project_runs:Run|Run[]|null};
type Contribution={id:string;project_id:string;verification_status:string};
type Search={q?:string;state?:string;role?:string;page?:string};

function one<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]||null:value||null}
function labHref(item:Membership){return `/member/projects/${item.project_id}${item.project_run_id?`?run=${item.project_run_id}`:''}`}
function dateLabel(value:string|null){return value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(value)):null}
function typeLabel(project:Project|null){return project?.project_type==='partner'?'Partner Project':'Open Project'}
function canOpenLab(item:Membership){const run=one(item.project_runs);return ['active','completed'].includes(item.membership_status)&&Boolean(run&&['active','review','completed'].includes(run.status))}

export default async function MyProjectsPage({searchParams}:{searchParams:Promise<Search>}){
  const params=await searchParams;
  const query=(params.q||'').trim().slice(0,80);
  const state=['current','completed','all'].includes(params.state||'')?String(params.state):'current';
  const role=(params.role||'all').trim();
  const requestedPage=Math.max(1,Number.parseInt(params.page||'1',10)||1);

  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=/member/projects');

  const [membersResult,proofCountResult]=await Promise.all([
    supabase.from('project_members').select('id,team_role,membership_status,joined_at,project_id,project_run_id,projects(id,title,status,team_size_threshold,project_type),project_runs(id,status,run_number)').eq('user_id',user.id).in('membership_status',['waiting','active','completed']).order('joined_at',{ascending:false}).limit(120),
    supabase.from('contributions').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('verification_status','verified')
  ]);

  const memberships=((membersResult.data||[]) as unknown as Membership[]).filter(item=>Boolean(one(item.projects)));
  const active=memberships.filter(item=>item.membership_status==='active'&&canOpenLab(item));
  const preparing=memberships.filter(item=>item.membership_status==='waiting'||(item.membership_status==='active'&&!canOpenLab(item)));
  const completed=memberships.filter(item=>item.membership_status==='completed'||one(item.projects)?.status==='completed');
  const projectIds=[...new Set(memberships.map(item=>item.project_id))];
  const activeIds=[...new Set(active.map(item=>item.project_id))];
  const completedIds=[...new Set(completed.map(item=>item.project_id))];

  const [tasksResult,contributionsResult]=await Promise.all([
    activeIds.length?supabase.from('project_tasks').select('id,title,status,due_at,blocker_reason,project_id,project_run_id').eq('assignee_user_id',user.id).in('project_id',activeIds).order('due_at',{ascending:true,nullsFirst:false}).limit(100):Promise.resolve({data:[]}),
    completedIds.length?supabase.from('contributions').select('id,project_id,verification_status').eq('user_id',user.id).eq('verification_status','verified').in('project_id',completedIds).limit(200):Promise.resolve({data:[]})
  ]);
  const tasks=(tasksResult.data||[]) as PortfolioTask[];
  const verified=(contributionsResult.data||[]) as Contribution[];
  const proofProjects=new Set(verified.map(item=>item.project_id));

  const filled=new Map<string,number>();
  const service=serviceDb();
  if(service&&projectIds.length){
    const {data:members}=await service.from('project_members').select('project_id,membership_status').in('project_id',projectIds).in('membership_status',['waiting','active']);
    for(const item of members||[])filled.set(item.project_id,(filled.get(item.project_id)||0)+1);
  }

  const tasksByProject=new Map<string,PortfolioTask[]>();
  for(const task of tasks)tasksByProject.set(task.project_id,[...(tasksByProject.get(task.project_id)||[]),task]);
  const orderedActive=[...active].sort((a,b)=>projectPriority(tasksByProject.get(b.project_id)||[],b.joined_at)-projectPriority(tasksByProject.get(a.project_id)||[],a.joined_at));
  const roles=[...new Set(memberships.map(item=>item.team_role))].sort();
  const matches=(item:Membership)=>matchesProjectPortfolioFilter({title:one(item.projects)?.title||'',role:item.team_role,query,roleFilter:role});
  const filteredActive=orderedActive.filter(matches);
  const filteredPreparing=preparing.filter(matches);
  const filteredCompleted=completed.filter(matches);
  const showCurrent=state==='current'||state==='all';
  const showCompleted=state==='completed'||state==='all';
  const visibleCompleted=showCompleted?filteredCompleted:[];
  const totalPages=Math.max(1,Math.ceil(visibleCompleted.length/PAGE_SIZE));
  const page=Math.min(requestedPage,totalPages);
  const completedPage=visibleCompleted.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const resultCount=(showCurrent?filteredActive.length+filteredPreparing.length:0)+(showCompleted?filteredCompleted.length:0);

  const filterHref=(next:Partial<Search>)=>{
    const values=new URLSearchParams();
    const nextQuery=next.q??query,nextState=next.state??state,nextRole=next.role??role,nextPage=next.page??'1';
    if(nextQuery)values.set('q',nextQuery);if(nextState!=='current')values.set('state',nextState);if(nextRole!=='all')values.set('role',nextRole);if(nextPage!=='1')values.set('page',nextPage);
    const text=values.toString();return `/member/projects${text?`?${text}`:''}`;
  };

  const primary=filteredActive[0]||null;
  const primaryProject=primary?one(primary.projects):null;
  const primaryTasks=primary?tasksByProject.get(primary.project_id)||[]:[];
  const primaryNext=nextPortfolioTask(primaryTasks);
  const completedTaskCount=primaryTasks.filter(task=>task.status==='done').length;

  return <main className={styles.page} aria-labelledby="projects-title">
    <header className={styles.hero}>
      <div><div className={styles.eyebrow}>MY WORK · PROJECTS</div><h1 id="projects-title">My Projects</h1><p>Manage the projects you’ve joined. Continue active work, track projects preparing to start, and revisit completed work and the Proof you built.</p></div>
      <div className={styles.heroActions}><Link className={`${styles.button} ${styles.buttonDark}`} href="/member/discover">Discover projects</Link><Link className={styles.button} href="/member/recommended">Recommended</Link></div>
    </header>

    <MemberProjectsCapabilityPathStrip/>

    <section className={styles.summary} aria-label="Project portfolio summary">
      <article><strong>{active.length}</strong><span>Active</span><small>Project{active.length===1?'':'s'} currently in delivery</small></article>
      <article><strong>{preparing.length}</strong><span>Preparing</span><small>Confirmed work not yet ready for delivery</small></article>
      <article><strong>{completed.length}</strong><span>Completed</span><small>Your retained project history</small></article>
      <article><strong>{proofCountResult.count||0}</strong><span>Verified Proof</span><small>Evidence across your project work</small></article>
    </section>

    <form className={styles.filters} action="/member/projects" method="get" aria-label="Project filters">
      <label><span className="srOnly">Search my projects</span><input className={styles.search} name="q" defaultValue={query} aria-label="Search my projects" placeholder="Search your projects or role"/></label>
      <div className={styles.tabs} aria-label="Project state">
        {(['current','completed','all'] as const).map(value=><Link key={value} className={`${styles.tab} ${state===value?styles.tabActive:''}`} aria-current={state===value?'page':undefined} href={filterHref({state:value,page:'1'})}>{value==='current'?'Ongoing':humaniseProjectValue(value)}</Link>)}
      </div>
      <select className={styles.select} name="role" defaultValue={role} aria-label="Filter by project role"><option value="all">All roles</option>{roles.map(value=><option value={value} key={value}>{humaniseProjectValue(value)}</option>)}</select>
      <button className={`${styles.button} ${styles.buttonDark}`} type="submit">Apply filters</button>
      <input type="hidden" name="state" value={state}/>
    </form>

    {resultCount===0&&<section className={styles.empty} aria-live="polite"><h2>No matching projects</h2><p>Your current search or filters did not match this bounded portfolio view. Clear the filters to return to your ongoing work.</p><Link className={`${styles.button} ${styles.buttonDark}`} href="/member/projects">Reset filters</Link></section>}

    {showCurrent&&<>
      <section className={styles.section} aria-labelledby="current-work-title"><div className={styles.sectionHead}><div><div className={styles.eyebrow}>ONGOING WORK</div><h2 id="current-work-title">Continue where you left off</h2><p>Active work gets priority because it is the project work you can act on now.</p></div><span className={styles.count}>{filteredActive.length} active</span></div>
        {primary&&primaryProject?<div className={styles.activeGrid}>
          <article className={styles.activeCard}><div><span className={styles.status}>● Active</span><h3>{primaryProject.title}</h3><p>{typeLabel(primaryProject)} · {one(primary.project_runs)?.run_number?`Your team: Team ${one(primary.project_runs)?.run_number} · `:''}Your role: {humaniseProjectValue(primary.team_role)}</p><div className={styles.meta}><span>{completedTaskCount} of {primaryTasks.length} assigned tasks complete</span>{primaryNext?.blocker_reason&&<span>Blocker recorded</span>}{primaryNext?.due_at&&<span>Due {dateLabel(primaryNext.due_at)}</span>}</div><div className={styles.actions}><Link className={`${styles.button} ${styles.buttonDark}`} href={labHref(primary)}>Open Mettelo Lab →</Link></div></div><aside className={styles.upNext}><small>UP NEXT{primaryNext?.due_at?` · DUE ${dateLabel(primaryNext.due_at)?.toUpperCase()}`:''}</small><strong>{primaryNext?.title||'Continue in Mettelo Lab'}</strong><p>{primaryNext?.blocker_reason?`Blocker: ${primaryNext.blocker_reason}`:'Project execution and full task context remain inside Mettelo Lab.'}</p></aside></article>
          {filteredActive.slice(1).map(item=>{const project=one(item.projects);const itemTasks=tasksByProject.get(item.project_id)||[];const next=nextPortfolioTask(itemTasks);return <article className={styles.activeCardSecondary} key={item.id}><div><span className={styles.status}>● Active</span><h3>{project?.title}</h3><p>{humaniseProjectValue(item.team_role)}{one(item.project_runs)?.run_number?` · Team ${one(item.project_runs)?.run_number}`:''}</p>{next&&<div className={styles.meta}><span>Next: {next.title}</span>{next.due_at&&<span>Due {dateLabel(next.due_at)}</span>}</div>}</div><div className={styles.actions}><Link className={`${styles.button} ${styles.buttonDark}`} href={labHref(item)}>Open Mettelo Lab →</Link></div></article>})}
        </div>:<div className={styles.empty}><h3>No active projects right now.</h3><p>{preparing.length?'Your confirmed work is still preparing to start.':'When a project enters active delivery, it will appear here with a direct route into Mettelo Lab.'}</p>{!preparing.length&&<Link className={`${styles.button} ${styles.buttonDark}`} href="/member/discover">Discover projects</Link>}</div>}
      </section>

      <section className={styles.section} aria-labelledby="preparing-title"><div className={styles.sectionHead}><div><div className={styles.eyebrow}>PREPARING TO START</div><h2 id="preparing-title">Your confirmed projects</h2><p>These projects are visible in your portfolio but are not yet ready for active delivery.</p></div><span className={styles.count}>{filteredPreparing.length} preparing</span></div>
        {filteredPreparing.length?<div className={styles.grid}>{filteredPreparing.map(item=>{const project=one(item.projects);const run=one(item.project_runs);const threshold=project?.team_size_threshold||0;const count=filled.get(item.project_id)||0;return <article className={styles.card} key={item.id}><div><span className={`${styles.status} ${styles.forming}`}>◷ Team forming</span><h3>{project?.title}</h3><p>Your place is confirmed. Mettelo is preparing the project team and delivery run before work begins.</p></div><div className={styles.formingNote}><strong>No action needed right now</strong><small>Track formation here. Mettelo Lab will only open when the project is ready and your run is authorized.</small></div><div className={styles.facts}><div><small>Your role</small><strong>{humaniseProjectValue(item.team_role)}</strong></div><div><small>Your team</small><strong>{run?.run_number?`Team ${run.run_number}`:'Not assigned yet'}</strong></div>{threshold>0&&<div><small>Formation</small><strong>{Math.min(count,threshold)} of {threshold} places filled</strong></div>}</div><div className={styles.actions}><Link className={`${styles.button} ${styles.buttonDark}`} href="/member/applications">View status</Link></div></article>})}</div>:<div className={styles.empty}><h3>No projects are preparing to start.</h3><p>Confirmed projects that are still forming will appear here without being treated as errors or failed applications.</p></div>}
      </section>
    </>}

    {showCompleted&&<section className={styles.section} aria-labelledby="completed-title"><div className={styles.sectionHead}><div><div className={styles.eyebrow}>COMPLETED</div><h2 id="completed-title">Your project history</h2><p>Completed work stays useful as professional history and connects to verified Proof only when real evidence exists.</p></div><span className={styles.count}>{filteredCompleted.length} completed</span></div>
      {completedPage.length?<div className={styles.completed}>{completedPage.map(item=>{const project=one(item.projects);const hasProof=proofProjects.has(item.project_id);return <article className={styles.card} key={item.id}><span className={`${styles.status} ${styles.complete}`}>✓ Completed</span><h3>{project?.title}</h3><p>{humaniseProjectValue(item.team_role)} · Completed project</p><div className={styles.actions}>{canOpenLab(item)&&<Link className={styles.button} href={labHref(item)}>View project</Link>}{hasProof&&<Link className={styles.button} href="/member/proof">View Proof</Link>}</div></article>})}</div>:<div className={styles.empty}><h3>No completed projects yet.</h3><p>Completed projects and any verified contribution evidence will remain available here as your project history grows.</p></div>}
      {totalPages>1&&<nav className={styles.pagination} aria-label="Completed project pages"><Link className={styles.button} aria-disabled={page===1} tabIndex={page===1?-1:0} href={page===1?'#':filterHref({page:String(page-1)})}>Previous</Link><span>Page {page} of {totalPages}</span><Link className={styles.button} aria-disabled={page===totalPages} tabIndex={page===totalPages?-1:0} href={page===totalPages?'#':filterHref({page:String(page+1)})}>Next</Link></nav>}
    </section>}

    <section className={styles.explore} aria-labelledby="explore-title"><div><div className={styles.eyebrow}>EXPLORE & GROW</div><h2 id="explore-title">Ready for another project?</h2><p>Discover broad project opportunities or start with projects matched to your profile. These remain secondary while ongoing work needs attention.</p></div><div className={styles.heroActions}><Link className={`${styles.button} ${styles.buttonDark}`} href="/member/discover">Discover projects</Link><Link className={styles.button} href="/member/recommended">See recommendations</Link></div></section>
  </main>;
}
