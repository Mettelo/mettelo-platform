export type MemberReadinessProfile={
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

export type ReadinessRequirement={
  key:string;
  label:string;
  action:string;
  complete:boolean;
};

export type ReadinessState={
  ready:boolean;
  missing:ReadinessRequirement[];
  checks:ReadinessRequirement[];
};

export type ProfileCompletionState={
  percentage:number;
  complete:boolean;
  missing:ReadinessRequirement[];
  checks:ReadinessRequirement[];
};

export type MemberReadiness={
  profileCompletion:ProfileCompletionState;
  matchingReadiness:ReadinessState;
  applicationReadiness:ReadinessState;
  publicProfileReadiness:ReadinessState;
  proofStatus:{verifiedCount:number;hasVerifiedProof:boolean};
  legacyProfileReadiness:number;
};

export type MemberReadinessInput={
  profile:MemberReadinessProfile|Record<string,unknown>;
  domainCount?:number;
  toolCount?:number;
  verifiedProofCount?:number;
};

function text(value:unknown){return typeof value==='string'&&Boolean(value.trim())}
function list(value:unknown){return Array.isArray(value)?value.filter(item=>typeof item==='string'&&Boolean(item.trim())):[]}
function requirement(key:string,label:string,action:string,complete:boolean):ReadinessRequirement{return{key,label,action,complete}}
function state(checks:ReadinessRequirement[]):ReadinessState{const missing=checks.filter(item=>!item.complete);return{ready:missing.length===0,missing,checks}}

export function calculateMemberReadiness({profile:profileRow,domainCount=0,toolCount=0,verifiedProofCount=0}:MemberReadinessInput):MemberReadiness{
  const profile=profileRow as MemberReadinessProfile;
  const skills=list(profile.skills);
  const preferredRoles=list(profile.preferred_roles);
  const hasProfessionalIdentity=text(profile.headline)||text(profile.current_job_title);
  const hasProfessionalLink=text(profile.linkedin_url)||text(profile.github_url)||text(profile.portfolio_url);
  const hasTaxonomyPreference=domainCount>0||toolCount>0;

  const completionChecks=[
    requirement('full_name','Add your full name.','Add your full name.',text(profile.full_name)),
    requirement('professional_identity','Add a professional headline or current job title.','Add a professional headline or current job title.',hasProfessionalIdentity),
    requirement('professional_area','Choose your professional area.','Choose your professional area.',text(profile.professional_area)),
    requirement('location','Add your location.','Add your location.',text(profile.location)),
    requirement('experience_level','Select your experience level.','Select your experience level.',text(profile.experience_level)),
    requirement('skills','Add at least three core skills.','Add at least three specific core skills.',skills.length>=3),
    requirement('preferred_roles','Choose at least one preferred project role.','Choose at least one project role you would realistically accept.',preferredRoles.length>0),
    requirement('project_preferences','Choose at least one domain or tool preference.','Choose at least one domain or tool so Mettelo can understand your project fit.',hasTaxonomyPreference),
    requirement('availability','Set your project availability.','Set when you are available for project work.',text(profile.project_availability)),
    requirement('weekly_capacity','Set your weekly collaboration capacity.','Set the weekly capacity you can realistically commit.',text(profile.weekly_capacity)),
    requirement('bio','Add a professional bio.','Add a short professional bio explaining the work you do.',text(profile.bio)),
    requirement('professional_link','Add at least one professional link.','Add LinkedIn, GitHub or a portfolio link.',hasProfessionalLink),
    requirement('professional_intent','Add your professional goal or employment status.','Add what you are working toward or your current employment status.',text(profile.primary_goal)||text(profile.employment_status))
  ];
  const completionMissing=completionChecks.filter(item=>!item.complete);
  const completionPercentage=Math.round(((completionChecks.length-completionMissing.length)/completionChecks.length)*100);

  const matchingChecks=[
    requirement('experience_level','Select your experience level.','Select your experience level so recommendations have career context.',text(profile.experience_level)),
    requirement('skills','Add at least three core skills.','Add at least three specific skills used for matching.',skills.length>=3),
    requirement('preferred_roles','Choose at least one preferred project role.','Choose at least one preferred role used for project matching.',preferredRoles.length>0),
    requirement('project_preferences','Choose at least one domain or tool preference.','Choose a domain or tool preference used by recommendations.',hasTaxonomyPreference)
  ];

  const applicationChecks=[
    requirement('full_name','Add your full name.','Add your full name before applying.',text(profile.full_name)),
    requirement('professional_identity','Add a professional headline or current job title.','Add a professional headline or current job title before applying.',hasProfessionalIdentity),
    requirement('professional_area','Choose your professional area.','Choose your professional area before applying.',text(profile.professional_area)),
    requirement('location','Add your location.','Add your location before applying.',text(profile.location)),
    requirement('experience_level','Select your experience level.','Select your experience level before applying.',text(profile.experience_level)),
    requirement('skills','Add at least three core skills.','Add at least three specific skills before applying.',skills.length>=3),
    requirement('preferred_roles','Choose at least one preferred project role.','Choose at least one preferred project role before applying.',preferredRoles.length>0),
    requirement('project_preferences','Choose at least one domain or tool preference.','Choose at least one domain or tool preference before applying.',hasTaxonomyPreference),
    requirement('availability','Set your project availability.','Set your project availability before applying.',text(profile.project_availability)),
    requirement('weekly_capacity','Set your weekly collaboration capacity.','Set the weekly capacity you can realistically commit before applying.',text(profile.weekly_capacity))
  ];

  const publicChecks=[
    requirement('full_name','Add your full name.','Add your full name before publishing your profile.',text(profile.full_name)),
    requirement('professional_identity','Add a professional headline or current job title.','Add a professional headline or current job title before publishing your profile.',hasProfessionalIdentity),
    requirement('professional_area','Choose your professional area.','Choose your professional area before publishing your profile.',text(profile.professional_area)),
    requirement('location','Add your location.','Add your location before publishing your profile.',text(profile.location)),
    requirement('skills','Add at least three core skills.','Add at least three specific skills before publishing your profile.',skills.length>=3),
    requirement('bio','Add a professional bio.','Add a professional bio before publishing your profile.',text(profile.bio)),
    requirement('professional_link','Add at least one professional link.','Add LinkedIn, GitHub or a portfolio link before publishing your profile.',hasProfessionalLink)
  ];

  return{
    profileCompletion:{percentage:completionPercentage,complete:completionMissing.length===0,missing:completionMissing,checks:completionChecks},
    matchingReadiness:state(matchingChecks),
    applicationReadiness:state(applicationChecks),
    publicProfileReadiness:state(publicChecks),
    proofStatus:{verifiedCount:Math.max(0,verifiedProofCount),hasVerifiedProof:verifiedProofCount>0},
    // Compatibility cache only. Product capability gates must consume the explicit states above.
    legacyProfileReadiness:completionPercentage
  };
}
