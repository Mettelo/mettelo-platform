import type {MemberProjectState} from '@/lib/member-project-journey';

export type RecommendationKind='project'|'event'|'spotlight';
export type RecommendationReasonType='project_relationship'|'saved_project'|'preferred_role'|'skill'|'domain'|'tool';
export type RecommendationReason={
  type:RecommendationReasonType;
  signal:string;
  copy:string;
  weight:number;
};

export type RecommendationProfile={
  skills:string[];
  preferredRoles:string[];
  domains:Array<{slug:string;name:string}>;
  tools:Array<{slug:string;name:string}>;
};

export type ProjectReasonInput={
  state:MemberProjectState;
  saved:boolean;
  roleTitles:string[];
  roleSkills:string[];
  domainSlugs:string[];
  toolSlugs:string[];
};

export type TextReasonInput={
  title:string;
  summary?:string|null;
  description?:string|null;
};

export type RankInput={
  kind:RecommendationKind;
  reason:RecommendationReason;
  date?:string|null;
  now?:number;
};

const relationshipCopy:Partial<Record<MemberProjectState,string>>={
  application_action_required:'Your application for this project needs an update in Applications.',
  application_submitted:'You already have an application for this project.',
  application_in_review:'Your application for this project is currently being reviewed.',
  team_forming:'Your application is moving forward while Mettelo forms the delivery team.',
  confirmed:'This project is part of your confirmed Mettelo work.',
  active:'This project is part of your current Mettelo work.',
  completed:'This project is part of your completed Mettelo work.'
};

const relationshipWeight:Partial<Record<MemberProjectState,number>>={
  application_action_required:12,
  team_forming:11,
  confirmed:10,
  active:10,
  application_in_review:9,
  application_submitted:8,
  completed:4
};

export function normaliseSignal(value:string){
  return value.trim().toLocaleLowerCase('en-GB').replace(/\s+/g,' ');
}

function exactTextContains(text:string,signal:string){
  const needle=normaliseSignal(signal);
  if(!needle)return false;
  return normaliseSignal(text).includes(needle);
}

function firstExact(left:string[],right:string[]){
  const rightMap=new Map(right.map(value=>[normaliseSignal(value),value]));
  for(const value of left){const match=rightMap.get(normaliseSignal(value));if(match)return match}
  return null;
}

export function projectRecommendationEligible(state:MemberProjectState){
  return !['closed','ineligible','cancelled'].includes(state);
}

export function projectRecommendationReason(profile:RecommendationProfile,input:ProjectReasonInput):RecommendationReason|null{
  const relationship=relationshipCopy[input.state];
  if(relationship)return{type:'project_relationship',signal:input.state,copy:relationship,weight:relationshipWeight[input.state]||8};

  if(input.saved)return{type:'saved_project',signal:'saved',copy:'You saved this project to revisit later.',weight:7};

  const preferredRole=firstExact(input.roleTitles,profile.preferredRoles);
  if(preferredRole)return{type:'preferred_role',signal:preferredRole,copy:`Includes your preferred ${preferredRole} role.`,weight:7};

  const skill=firstExact(input.roleSkills,profile.skills);
  if(skill)return{type:'skill',signal:skill,copy:`Matches your ${skill} skill.`,weight:6};

  const domain=profile.domains.find(item=>input.domainSlugs.includes(item.slug));
  if(domain)return{type:'domain',signal:domain.slug,copy:`Related to your ${domain.name} interest.`,weight:5};

  const tool=profile.tools.find(item=>input.toolSlugs.includes(item.slug));
  if(tool)return{type:'tool',signal:tool.slug,copy:`Uses ${tool.name}, one of your selected tools.`,weight:4};

  return null;
}

export function textRecommendationReason(profile:RecommendationProfile,input:TextReasonInput):RecommendationReason|null{
  const text=[input.title,input.summary||'',input.description||''].join(' ');
  const skill=profile.skills.find(value=>exactTextContains(text,value));
  if(skill)return{type:'skill',signal:skill,copy:`Related to your ${skill} skill.`,weight:6};
  const domain=profile.domains.find(item=>exactTextContains(text,item.name));
  if(domain)return{type:'domain',signal:domain.slug,copy:`Related to your ${domain.name} interest.`,weight:5};
  const tool=profile.tools.find(item=>exactTextContains(text,item.name));
  if(tool)return{type:'tool',signal:tool.slug,copy:`Related to ${tool.name}, one of your selected tools.`,weight:4};
  return null;
}

export function eventRecommendationEligible(input:{status:string;startsAt:string;slug:string|null|undefined;now?:number}){
  const now=input.now??Date.now();
  return input.status==='published'&&Boolean(input.slug)&&new Date(input.startsAt).getTime()>now;
}

export function spotlightRecommendationEligible(input:{status:string;isExcluded:boolean;consentStatus:string;id:string|null|undefined}){
  return input.status==='published'&&!input.isExcluded&&input.consentStatus==='granted'&&Boolean(input.id);
}

export function isRecruitmentOpportunity(input:{opportunityType:string;sourceType:string|null}){
  const type=normaliseSignal(input.opportunityType);
  const source=normaliseSignal(input.sourceType||'');
  return ['job','internship','graduate','fellowship','contractor'].includes(type)||source.startsWith('discovery_')||source.includes('ats');
}

export function recommendationRank(input:RankInput){
  const now=input.now??Date.now();
  let score=input.reason.weight*100;
  const date=input.date?new Date(input.date).getTime():Number.NaN;
  if(Number.isFinite(date)&&date>now){
    const days=(date-now)/(24*60*60*1000);
    if(days<=7)score+=35;
    else if(days<=21)score+=20;
    else if(days<=45)score+=10;
  }
  if(input.kind==='project')score+=3;
  return score;
}

export function sortRecommendations<T extends {rank:number;title:string;kind:RecommendationKind}>(items:T[]){
  return [...items].sort((a,b)=>b.rank-a.rank||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title));
}
