import {serviceDb} from '@/lib/project-flow';

export type ProjectExperienceRoleDetail={
  id:string;
  responsibilities:string[];
  recommendedSkills:string[];
  experienceExpectation:string|null;
  weeklyCommitment:string|null;
  roleStatus:string|null;
  applicationRequirements:string|null;
};

function strings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())):[]}
function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}

/**
 * V2 role-definition fields are additive to the long-lived project_roles shape.
 * During a normal schema/app rollout a preview can briefly point at a database
 * that does not have the V2 columns yet. Rich role detail is therefore an
 * enhancement, never a prerequisite for resolving the canonical project page.
 *
 * The caller has already established project visibility/authorisation. Only
 * presentation-safe role-definition fields are selected here.
 */
export async function getProjectExperienceRoleDetails(projectId:string):Promise<Map<string,ProjectExperienceRoleDetail>>{
  const db=serviceDb();
  if(!db)return new Map();
  const {data,error}=await db.from('project_roles')
    .select('id,responsibilities,recommended_skills,experience_expectation,weekly_commitment,role_status,application_requirements')
    .eq('project_id',projectId);
  if(error)return new Map();
  return new Map((data||[]).map(row=>[String(row.id),{
    id:String(row.id),
    responsibilities:strings(row.responsibilities),
    recommendedSkills:strings(row.recommended_skills),
    experienceExpectation:text(row.experience_expectation),
    weeklyCommitment:text(row.weekly_commitment),
    roleStatus:text(row.role_status),
    applicationRequirements:text(row.application_requirements)
  }]));
}
