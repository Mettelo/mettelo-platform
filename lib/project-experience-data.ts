import {serviceDb} from '@/lib/project-flow';
import type {ProjectExperienceBrief,ProjectExperienceMilestone} from '@/lib/project-experience-model';

function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}
function stringArray(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).map(item=>item.trim()):[]}
function metricLines(value:unknown){
  const raw=text(value);if(!raw)return[];
  return raw.split(/\r?\n|;|•/).map(item=>item.replace(/^[-*\d.)\s]+/,'').trim()).filter(Boolean).slice(0,12);
}

/**
 * Loads the canonical planning layer for Project Experience discovery surfaces.
 *
 * The canonical brief/milestone tables are intentionally protected for Lab and
 * governance workflows. Public and Member Project Detail therefore read them
 * server-side and select only presentation-safe planning fields. A project-level
 * milestone is identified by project_run_id IS NULL; run-scoped milestones are
 * live execution state and must never be projected into discovery/decision pages.
 * Do not add internal notes, reviewer identities, task execution state, private
 * links or governance evidence to this projection.
 */
export async function getProjectExperiencePlanning(projectId:string):Promise<{brief:ProjectExperienceBrief|null;milestones:ProjectExperienceMilestone[]}>
{
  const db=serviceDb();if(!db)return{brief:null,milestones:[]};
  const [briefResult,milestonesResult]=await Promise.all([
    db.from('project_problem_briefs').select('context,stakeholder,primary_use_case,primary_objective,supporting_objectives,key_questions,in_scope,out_of_scope,success_metrics').eq('project_id',projectId).maybeSingle(),
    db.from('project_milestones').select('id,title,description,week_start,week_end,expected_output,sort_order').eq('project_id',projectId).is('project_run_id',null).order('sort_order',{ascending:true}).order('created_at',{ascending:true})
  ]);
  const row=briefResult.data;
  const brief=row?{
    businessContext:text(row.context),
    stakeholder:text(row.stakeholder),
    useCase:text(row.primary_use_case),
    primaryObjective:text(row.primary_objective),
    supportingObjectives:stringArray(row.supporting_objectives),
    keyQuestions:stringArray(row.key_questions),
    inScope:stringArray(row.in_scope),
    outOfScope:stringArray(row.out_of_scope),
    successMeasures:metricLines(row.success_metrics)
  }:null;
  const milestones=(milestonesResult.data||[]).map(item=>({
    id:String(item.id),
    title:String(item.title),
    description:text(item.description),
    weekStart:typeof item.week_start==='number'?item.week_start:null,
    weekEnd:typeof item.week_end==='number'?item.week_end:null,
    expectedOutput:text(item.expected_output)
  }));
  return{brief,milestones};
}
