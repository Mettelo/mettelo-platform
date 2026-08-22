import {expect,test} from '@playwright/test';
import {calculateMemberReadiness} from '../lib/member-readiness';

const applicationReadyProfile={
  full_name:'Ada Analyst',headline:'Data analyst',professional_area:'Data Analysis / BI',location:'London, UK',experience_level:'mid',
  skills:['SQL','Power BI','Python'],preferred_roles:['Data Analyst / BI'],project_availability:'available_now',weekly_capacity:'4–6 hours/week'
};

const fullProfile={
  ...applicationReadyProfile,bio:'I turn operational data into useful decisions.',linkedin_url:'https://linkedin.com/in/ada',primary_goal:'Lead useful analytics delivery.'
};

test('profile completion is independent from Verified Proof',()=>{
  const withoutProof=calculateMemberReadiness({profile:fullProfile,domainCount:1,verifiedProofCount:0});
  const withProof=calculateMemberReadiness({profile:fullProfile,domainCount:1,verifiedProofCount:3});
  expect(withoutProof.profileCompletion.percentage).toBe(100);
  expect(withProof.profileCompletion.percentage).toBe(100);
  expect(withoutProof.proofStatus.hasVerifiedProof).toBe(false);
  expect(withProof.proofStatus.hasVerifiedProof).toBe(true);
});

test('matching readiness is explicit and can unlock before application readiness',()=>{
  const result=calculateMemberReadiness({profile:{experience_level:'mid',skills:['SQL','Python','Power BI'],preferred_roles:['Data Analyst / BI']},toolCount:1});
  expect(result.matchingReadiness.ready).toBe(true);
  expect(result.applicationReadiness.ready).toBe(false);
  expect(result.applicationReadiness.missing.map(item=>item.key)).toContain('availability');
});

test('application readiness never requires Verified Proof',()=>{
  const result=calculateMemberReadiness({profile:applicationReadyProfile,domainCount:1,verifiedProofCount:0});
  expect(result.applicationReadiness.ready).toBe(true);
  expect(result.applicationReadiness.checks.some(item=>item.key==='proof')).toBe(false);
  expect(result.proofStatus.verifiedCount).toBe(0);
});

test('Verified Proof cannot compensate for missing application basics',()=>{
  const result=calculateMemberReadiness({profile:{full_name:'Ada Analyst'},verifiedProofCount:12});
  expect(result.proofStatus.hasVerifiedProof).toBe(true);
  expect(result.applicationReadiness.ready).toBe(false);
  expect(result.matchingReadiness.ready).toBe(false);
});

test('public-profile readiness is separate from application readiness',()=>{
  const appOnly=calculateMemberReadiness({profile:applicationReadyProfile,domainCount:1});
  expect(appOnly.applicationReadiness.ready).toBe(true);
  expect(appOnly.publicProfileReadiness.ready).toBe(false);
  expect(appOnly.publicProfileReadiness.missing.map(item=>item.key)).toEqual(expect.arrayContaining(['bio','professional_link']));

  const publicOnly=calculateMemberReadiness({profile:{
    full_name:'Ada Analyst',headline:'Data analyst',professional_area:'Data Analysis / BI',location:'London, UK',skills:['SQL','Power BI','Python'],
    bio:'I turn operational data into useful decisions.',linkedin_url:'https://linkedin.com/in/ada'
  }});
  expect(publicOnly.publicProfileReadiness.ready).toBe(true);
  expect(publicOnly.applicationReadiness.ready).toBe(false);
});

test('missing requirements are actionable and deterministic',()=>{
  const first=calculateMemberReadiness({profile:{}});
  const second=calculateMemberReadiness({profile:{}});
  expect(first).toEqual(second);
  expect(first.applicationReadiness.missing.length).toBeGreaterThan(0);
  for(const item of first.applicationReadiness.missing){expect(item.key).toBeTruthy();expect(item.label).toBeTruthy();expect(item.action).toBeTruthy();}
});
