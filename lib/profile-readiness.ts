export const PROFILE_APPLICATION_READY=85;
export const PROFILE_INTEREST_READY=60;

export type ReadinessProfile={
  full_name?:string|null;
  headline?:string|null;
  current_job_title?:string|null;
  professional_area?:string|null;
  bio?:string|null;
  location?:string|null;
  experience_level?:string|null;
  employment_status?:string|null;
  project_availability?:string|null;
  weekly_capacity?:string|null;
  primary_goal?:string|null;
  linkedin_url?:string|null;
  github_url?:string|null;
  portfolio_url?:string|null;
  skills?:string[]|null;
  preferred_roles?:string[]|null;
};

export type ReadinessInput={
  profile:ReadinessProfile|Record<string,unknown>;
  domainCount?:number;
  toolCount?:number;
  verifiedProofCount?:number;
};

type Check={key:string;label:string;weight:number;complete:boolean;action:string};

export function calculateProfileReadiness({profile:profileRow,domainCount=0,toolCount=0,verifiedProofCount=0}:ReadinessInput){
  const profile=profileRow as ReadinessProfile;
  const professionalLink=Boolean(profile.linkedin_url?.trim()||profile.github_url?.trim()||profile.portfolio_url?.trim());
  const identityComplete=Boolean(profile.full_name?.trim()&&(profile.headline?.trim()||profile.current_job_title?.trim())&&profile.professional_area&&profile.location?.trim());
  const capabilityComplete=Boolean(profile.experience_level&&(profile.skills?.length||0)>=3&&(profile.preferred_roles?.length||0)>0&&(domainCount>0||toolCount>0));
  const availabilityComplete=Boolean(profile.project_availability&&profile.weekly_capacity?.trim());
  const credibilityComplete=Boolean(profile.bio?.trim()&&professionalLink);
  const intentComplete=Boolean(profile.primary_goal?.trim()||profile.employment_status);

  const checks:Check[]=[
    {key:'identity',label:'Professional identity',weight:20,complete:identityComplete,action:'Add your headline, professional area and location.'},
    {key:'capability',label:'Capability and project fit',weight:30,complete:capabilityComplete,action:'Add 3+ skills, an experience level, preferred roles and at least one domain or tool.'},
    {key:'availability',label:'Availability',weight:20,complete:availabilityComplete,action:'Add project availability and weekly collaboration capacity.'},
    {key:'credibility',label:'Credibility',weight:15,complete:credibilityComplete,action:'Add a professional bio and at least one LinkedIn, GitHub or portfolio link.'},
    {key:'proof',label:'Verified Proof',weight:5,complete:verifiedProofCount>0,action:'Complete useful project work and add verified Proof when available.'},
    {key:'intent',label:'Professional intent',weight:10,complete:intentComplete,action:'Add what you are working toward or your current employment status.'}
  ];

  const score=checks.reduce((total,check)=>total+(check.complete?check.weight:0),0);
  const missing=checks.filter(check=>!check.complete);
  return{score,checks,missing,interestReady:score>=PROFILE_INTEREST_READY,applicationReady:score>=PROFILE_APPLICATION_READY};
}
