import {redirect} from 'next/navigation';

type Search={project_id?:string|string[];project_run_id?:string|string[];collaboration_need?:string|string[]};
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}

export default async function LegacyFindPeoplePage({searchParams}:{searchParams?:Promise<Search>}){
 const params=await searchParams||{};
 const query=new URLSearchParams({view:'people'});
 const projectId=one(params.project_id).trim(),runId=one(params.project_run_id).trim(),needId=one(params.collaboration_need).trim();
 if(projectId)query.set('project_id',projectId);
 if(runId)query.set('project_run_id',runId);
 if(needId)query.set('collaboration_need',needId);
 redirect(`/member/collaboration?${query.toString()}`);
}
