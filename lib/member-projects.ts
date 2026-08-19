export type PortfolioTask={id:string;title:string;status:string;due_at:string|null;blocker_reason:string|null;project_id:string;project_run_id:string|null};

export function humaniseProjectValue(value:string|null|undefined,fallback='Member'){
  const text=(value||'').trim();
  return text?text.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase()):fallback;
}

export function projectPriority(tasks:PortfolioTask[],joinedAt:string){
  const now=Date.now();
  const open=tasks.filter(task=>task.status!=='done');
  const overdue=open.some(task=>task.due_at&&new Date(task.due_at).getTime()<now);
  const blocked=open.some(task=>task.status==='blocked'||Boolean(task.blocker_reason));
  const dueSoon=open.some(task=>task.due_at&&new Date(task.due_at).getTime()>=now&&new Date(task.due_at).getTime()-now<=7*24*60*60*1000);
  if(overdue)return 600;
  if(blocked)return 500;
  if(dueSoon)return 400;
  if(open.length)return 300;
  return 100+Math.max(0,Math.floor(new Date(joinedAt).getTime()/1_000_000_000));
}

export function nextPortfolioTask(tasks:PortfolioTask[]){
  const now=Date.now();
  const open=tasks.filter(task=>task.status!=='done');
  return open.find(task=>task.due_at&&new Date(task.due_at).getTime()<now)
    ||open.find(task=>task.status==='blocked'||Boolean(task.blocker_reason))
    ||[...open].sort((a,b)=>{
      const aDue=a.due_at?new Date(a.due_at).getTime():Number.MAX_SAFE_INTEGER;
      const bDue=b.due_at?new Date(b.due_at).getTime():Number.MAX_SAFE_INTEGER;
      return aDue-bDue;
    })[0]
    ||null;
}

export function matchesProjectPortfolioFilter(input:{title:string;role:string;query:string;roleFilter:string}){
  const query=input.query.trim().toLowerCase();
  const roleFilter=input.roleFilter.trim().toLowerCase();
  if(roleFilter&&roleFilter!=='all'&&input.role.toLowerCase()!==roleFilter)return false;
  if(!query)return true;
  return `${input.title} ${input.role}`.toLowerCase().includes(query);
}
