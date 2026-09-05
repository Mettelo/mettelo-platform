import {expect,test} from '@playwright/test';
import {memberProjectCatalogueAction} from '@/lib/member-project-journey';
import {eventRecommendationEligible,isRecruitmentOpportunity,projectRecommendationEligible,projectRecommendationReason,recommendationRank,sortRecommendations,spotlightRecommendationEligible,textRecommendationReason,type RecommendationProfile} from '@/lib/member-recommendations';

const profile:RecommendationProfile={
  skills:['Data Analysis','Research'],
  preferredRoles:['Data Analyst'],
  domains:[{slug:'responsible-ai',name:'Responsible AI'}],
  tools:[{slug:'power-bi',name:'Power BI'}]
};

test('Recommended project reasons use only explicit member/project signals',()=>{
  expect(projectRecommendationReason(profile,{state:'open_eligible',saved:false,roleTitles:['Data Analyst'],roleSkills:['SQL'],domainSlugs:[],toolSlugs:[]})).toEqual(expect.objectContaining({type:'preferred_role',signal:'Data Analyst'}));
  expect(projectRecommendationReason(profile,{state:'open_eligible',saved:false,roleTitles:['Researcher'],roleSkills:['Data Analysis'],domainSlugs:[],toolSlugs:[]})).toEqual(expect.objectContaining({type:'skill',signal:'Data Analysis'}));
  expect(projectRecommendationReason(profile,{state:'open_eligible',saved:false,roleTitles:['Researcher'],roleSkills:['Statistics'],domainSlugs:['responsible-ai'],toolSlugs:[]})).toEqual(expect.objectContaining({type:'domain',signal:'responsible-ai'}));
  expect(projectRecommendationReason(profile,{state:'open_eligible',saved:false,roleTitles:['Engineer'],roleSkills:['Python'],domainSlugs:[],toolSlugs:['power-bi']})).toEqual(expect.objectContaining({type:'tool',signal:'power-bi'}));
  expect(projectRecommendationReason(profile,{state:'open_eligible',saved:true,roleTitles:[],roleSkills:[],domainSlugs:[],toolSlugs:[]})).toEqual(expect.objectContaining({type:'saved_project'}));
  expect(projectRecommendationReason(profile,{state:'open_eligible',saved:false,roleTitles:['Designer'],roleSkills:['Figma'],domainSlugs:[],toolSlugs:[]})).toBeNull();
});

test('existing project lifecycle is a truthful recommendation signal and routes to the owning surface',()=>{
  const expected:Array<[Parameters<typeof memberProjectCatalogueAction>[0],string,string]>=[
    ['open_eligible','View project','/member/discover/project-1'],
    ['ineligible','View project','/member/discover/project-1'],
    ['application_submitted','View interest','/member/applications'],
    ['application_action_required','View interest','/member/applications'],
    ['application_in_review','View interest','/member/applications'],
    ['team_forming','View interest','/member/applications'],
    ['confirmed','Open in Projects','/member/projects'],
    ['active','Open in Projects','/member/projects'],
    ['completed','View in Projects','/member/projects?state=completed']
  ];
  for(const [state,label,href] of expected){const action=memberProjectCatalogueAction(state,'project-1');expect(action).toEqual({label,href});expect(projectRecommendationEligible(state)).toBe(true)}
  expect(projectRecommendationEligible('closed')).toBe(false);expect(projectRecommendationEligible('cancelled')).toBe(false);
});

test('event and Spotlight eligibility are checked before ranking',()=>{
  const now=Date.parse('2026-08-19T18:00:00.000Z');
  expect(eventRecommendationEligible({status:'published',startsAt:'2026-08-28T18:00:00.000Z',slug:'member-roundtable',now})).toBe(true);
  expect(eventRecommendationEligible({status:'cancelled',startsAt:'2026-08-28T18:00:00.000Z',slug:'member-roundtable',now})).toBe(false);
  expect(eventRecommendationEligible({status:'published',startsAt:'2026-08-18T18:00:00.000Z',slug:'member-roundtable',now})).toBe(false);
  expect(spotlightRecommendationEligible({status:'published',isExcluded:false,consentStatus:'granted',id:'spotlight-1'})).toBe(true);
  expect(spotlightRecommendationEligible({status:'published',isExcluded:false,consentStatus:'pending',id:'spotlight-1'})).toBe(false);
  expect(spotlightRecommendationEligible({status:'published',isExcluded:true,consentStatus:'granted',id:'spotlight-1'})).toBe(false);
});

test('text reasons require a literal supported signal',()=>{
  expect(textRecommendationReason(profile,{title:'Responsible AI member roundtable',summary:'A practical session.'})).toEqual(expect.objectContaining({type:'domain',signal:'responsible-ai'}));
  expect(textRecommendationReason(profile,{title:'Power BI practice session'})).toEqual(expect.objectContaining({type:'tool',signal:'power-bi'}));
  expect(textRecommendationReason(profile,{title:'General member social'})).toBeNull();
});

test('current Opportunities recruitment feeds are excluded even when rows are mislabeled',()=>{
  expect(isRecruitmentOpportunity({opportunityType:'job',sourceType:'official_greenhouse_ats'})).toBe(true);
  expect(isRecruitmentOpportunity({opportunityType:'internship',sourceType:'discovery_arbeitnow'})).toBe(true);
  expect(isRecruitmentOpportunity({opportunityType:'volunteer',sourceType:'discovery_arbeitnow'})).toBe(true);
});

test('internal ranking is deterministic and never needs a displayed percentage',()=>{
  const now=Date.parse('2026-08-19T18:00:00.000Z');
  const skill={type:'skill' as const,signal:'Data Analysis',copy:'Matches your Data Analysis skill.',weight:6};
  const projectRank=recommendationRank({kind:'project',reason:skill,date:'2026-08-24T18:00:00.000Z',now});
  const eventRank=recommendationRank({kind:'event',reason:skill,date:'2026-09-24T18:00:00.000Z',now});
  const sorted=sortRecommendations([{kind:'event' as const,id:'e',title:'Event',rank:eventRank},{kind:'project' as const,id:'p',title:'Project',rank:projectRank}]);
  expect(sorted[0].id).toBe('p');expect(projectRank).toBeGreaterThan(eventRank);
});
