import type {ProjectDetailContent,ProjectDetailDataSource,ProjectDetailDeliverable,ProjectDetailPathContext} from '@/lib/project-detail-content';

export type ProjectExperienceTaxonomy={slug:string;name:string};
export type ProjectExperienceRole={
  id:string;
  title:string;
  description:string|null;
  discipline?:string|null;
  skills:string[];
  openings:number;
  responsibilities?:string[];
  recommendedSkills?:string[];
  experienceExpectation?:string|null;
  weeklyCommitment?:string|null;
  roleStatus?:string|null;
  applicationRequirements?:string|null;
};

export type ProjectExperienceBrief={
  businessContext?:string|null;
  stakeholder?:string|null;
  useCase?:string|null;
  primaryObjective?:string|null;
  supportingObjectives?:string[];
  keyQuestions?:string[];
  inScope?:string[];
  outOfScope?:string[];
  successMeasures?:string[];
};

export type ProjectExperienceProject={
  id:string;
  title:string;
  summary:string;
  problemStatement:string|null;
  status:string;
  projectType:string|null;
  applicationsOpen:boolean|null;
  partnerName?:string|null;
  location:string|null;
  locationType:string|null;
  difficultyLevel?:string|null;
  durationWeeks:number|null;
  weeklyCommitment:string|null;
  applicationDeadline:string|null;
  teamSizeThreshold?:number|null;
  startsAt?:string|null;
  endsAt?:string|null;
};

export type ProjectExperienceModel={
  project:ProjectExperienceProject;
  roles:ProjectExperienceRole[];
  taxonomy:{domains:ProjectExperienceTaxonomy[];tools:ProjectExperienceTaxonomy[];methods:ProjectExperienceTaxonomy[]};
  challenge:{
    problemStatement:string|null;
    businessContext:string|null;
    stakeholder:string|null;
    useCase:string|null;
    primaryObjective:string|null;
    supportingObjectives:string[];
    keyQuestions:string[];
    inScope:string[];
    outOfScope:string[];
  };
  resources:ProjectDetailDataSource[];
  deliverables:ProjectDetailDeliverable[];
  successCriteria:string[];
  capabilities:{technical:string[];professional:string[];methodsAndTools:string[]};
  proofSignals:string[];
  pathContexts:ProjectDetailPathContext[];
  sourceProjectKey:string|null;
};

type Input={
  project:ProjectExperienceProject;
  roles:ProjectExperienceRole[];
  domains:ProjectExperienceTaxonomy[];
  tools:ProjectExperienceTaxonomy[];
  methods:ProjectExperienceTaxonomy[];
  detail:ProjectDetailContent;
  brief?:ProjectExperienceBrief|null;
};

function unique(values:(string|null|undefined)[]){
  return [...new Set(values.map(value=>value?.trim()||'').filter(Boolean))];
}

export function buildProjectExperienceModel({project,roles,domains,tools,methods,detail,brief}:Input):ProjectExperienceModel{
  const technical=unique([
    ...detail.technicalSkills,
    ...detail.capabilities.filter(item=>item.type==='technical').map(item=>item.name)
  ]);
  const professional=unique([
    ...detail.professionalSkills,
    ...detail.capabilities.filter(item=>item.type==='professional').map(item=>item.name)
  ]);
  const methodsAndTools=unique([
    ...methods.map(item=>item.name),
    ...tools.map(item=>item.name),
    ...detail.importedMethods,
    ...detail.importedTools
  ]);
  const canonicalSuccess=unique(detail.successCriteria.map(item=>item.measurement?`${item.title} — ${item.measurement}`:item.description?`${item.title}: ${item.description}`:item.title));
  const fallbackSuccess=unique([
    ...(brief?.successMeasures||[]),
    ...detail.deliverables.map(item=>item.acceptanceCriteria)
  ]);
  const successCriteria=canonicalSuccess.length?canonicalSuccess:fallbackSuccess;
  const proofSignals=unique([
    ...detail.pathContexts.map(item=>item.capabilityBuilt),
    ...detail.capabilities.filter(item=>item.evidenceExpected).map(item=>item.name),
    ...technical.slice(0,3),
    ...professional.slice(0,2)
  ]).slice(0,6);

  return{
    project,
    roles,
    taxonomy:{domains,tools,methods},
    challenge:{
      problemStatement:project.problemStatement,
      businessContext:brief?.businessContext?.trim()||null,
      stakeholder:brief?.stakeholder?.trim()||null,
      useCase:brief?.useCase?.trim()||null,
      primaryObjective:brief?.primaryObjective?.trim()||null,
      supportingObjectives:unique(brief?.supportingObjectives||[]),
      keyQuestions:unique(brief?.keyQuestions||[]),
      inScope:unique(brief?.inScope||[]),
      outOfScope:unique(brief?.outOfScope||[])
    },
    resources:detail.dataSources,
    deliverables:detail.deliverables,
    successCriteria,
    capabilities:{technical,professional,methodsAndTools},
    proofSignals,
    pathContexts:detail.pathContexts,
    sourceProjectKey:detail.sourceProjectKey
  };
}
