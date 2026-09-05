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
  decisionToSupport?:string|null;
  constraintsTradeOffs?:string[];
  assumptions?:string[];
  acceptanceChecks?:string[];
  responsibleUseRisks?:string[];
  evidenceExpectations?:string[];
  technicalSkills?:string[];
  professionalSkills?:string[];
  methods?:string[];
  tools?:string[];
  stakeholderHandover?:string|null;
  capabilityOutcome?:string|null;
};

export type ProjectExperienceMilestone={
  id:string;
  title:string;
  description:string|null;
  weekStart:number|null;
  weekEnd:number|null;
  expectedOutput:string|null;
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
  participationMode?:'solo'|'team'|'flexible'|null;
  minTeamSize?:number|null;
  targetTeamSize?:number|null;
  maxTeamSize?:number|null;
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
    decisionToSupport:string|null;
    supportingObjectives:string[];
    keyQuestions:string[];
    inScope:string[];
    outOfScope:string[];
    constraintsTradeOffs:string[];
    assumptions:string[];
    responsibleUseRisks:string[];
  };
  resources:ProjectDetailDataSource[];
  deliverables:ProjectDetailDeliverable[];
  successCriteria:string[];
  acceptanceChecks:string[];
  stakeholderHandover:string|null;
  timeline:ProjectExperienceMilestone[];
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
  milestones?:ProjectExperienceMilestone[];
};

function unique(values:(string|null|undefined)[]){
  return [...new Set(values.map(value=>value?.trim()||'').filter(Boolean))];
}

export function buildProjectExperienceModel({project,roles,domains,tools,methods,detail,brief,milestones=[]}:Input):ProjectExperienceModel{
  const technical=unique([
    ...(brief?.technicalSkills||[]),
    ...detail.technicalSkills,
    ...detail.capabilities.filter(item=>item.type==='technical').map(item=>item.name)
  ]);
  const professional=unique([
    ...(brief?.professionalSkills||[]),
    ...detail.professionalSkills,
    ...detail.capabilities.filter(item=>item.type==='professional').map(item=>item.name)
  ]);
  const methodsAndTools=unique([
    ...(brief?.methods||[]),
    ...(brief?.tools||[]),
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
  // Evidence expectations are opportunities, not verified Proof. They can be
  // published as configured evidence areas while the review/verification gate
  // remains unchanged.
  const proofSignals=unique([
    ...(brief?.evidenceExpectations||[]),
    ...detail.capabilities.filter(item=>item.evidenceExpected).map(item=>item.name)
  ]).slice(0,12);

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
      decisionToSupport:brief?.decisionToSupport?.trim()||null,
      supportingObjectives:unique(brief?.supportingObjectives||[]),
      keyQuestions:unique(brief?.keyQuestions||[]),
      inScope:unique(brief?.inScope||[]),
      outOfScope:unique(brief?.outOfScope||[]),
      constraintsTradeOffs:unique(brief?.constraintsTradeOffs||[]),
      assumptions:unique(brief?.assumptions||[]),
      responsibleUseRisks:unique(brief?.responsibleUseRisks||[])
    },
    resources:detail.dataSources,
    deliverables:detail.deliverables,
    successCriteria,
    acceptanceChecks:unique(brief?.acceptanceChecks||[]),
    stakeholderHandover:brief?.stakeholderHandover?.trim()||null,
    timeline:milestones,
    capabilities:{technical,professional,methodsAndTools},
    proofSignals,
    pathContexts:detail.pathContexts,
    sourceProjectKey:detail.sourceProjectKey
  };
}
