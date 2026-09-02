import fs from 'node:fs';

const journeys=[
  {name:'Contact submission',source:'app/contact/page.tsx',endpoint:'/api/forms',route:'app/api/forms/route.ts',contract:'tests/critical-ui.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Partnership submission',source:'app/partnership/page.tsx',endpoint:'/api/forms',route:'app/api/forms/route.ts',contract:'tests/critical-ui.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Feedback submission',source:'app/feedback/page.tsx',endpoint:'/api/forms',route:'app/api/forms/route.ts',contract:'tests/critical-ui.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Newsletter subscription',source:'app/newsletter/page.tsx',endpoint:'/api/newsletter',route:'app/api/newsletter/route.ts',contract:'tests/form-route-contracts.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Project application',source:'components/SubmissionForm.tsx',endpoint:'/api/project-applications',route:'app/api/project-applications/route.ts',contract:'tests/form-route-contracts.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Open Project continuous cohorts',source:'lib/project-lifecycle-policy.ts',route:'app/api/admin/applications/route.ts',contract:'tests/project-lifecycle-policy.spec.ts',e2e:'tests/project-lifecycle-policy-db.spec.ts'},
  {name:'Career application',source:'components/CareerApplicationForm.tsx',endpoint:'/api/careers/apply',route:'app/api/careers/apply/route.ts',contract:'tests/form-route-contracts.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Admin intake queue',source:'app/admin/intake/page.tsx',endpoint:'/api/admin/intake',route:'app/api/admin/intake/route.ts',contract:'tests/form-route-contracts.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Admin project queue',source:'app/admin/project-operations/applications/page.tsx',endpoint:'/api/admin/applications',route:'app/api/admin/applications/route.ts',contract:'tests/form-route-contracts.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Admin career queue',source:'app/admin/careers/page.tsx',endpoint:'/api/admin/careers/applications',route:'app/api/admin/careers/applications/route.ts',contract:'tests/form-route-contracts.spec.ts',e2e:'tests/staging-submission-journeys.spec.ts'},
  {name:'Spotlight publication consent',source:'components/SpotlightConsentPanel.tsx',endpoint:'/api/spotlight-consent',route:'app/api/spotlight-consent/route.ts',contract:'scripts/audit-spotlight-v2.mjs',e2e:'tests/spotlight-v2-visual.spec.ts'},
  {name:'Mobile navigation',source:'components/MobileMenuEnhancer.tsx',contract:'tests/critical-ui.spec.ts'}
];

const failures=[];
for(const journey of journeys){
  for(const key of ['source','route','contract','e2e']){
    const file=journey[key];
    if(file&&!fs.existsSync(file))failures.push(`${journey.name}: missing ${key} file ${file}`);
  }
  if(journey.endpoint){
    const evidence=[journey.source,journey.route,journey.contract,journey.e2e].filter(Boolean).map(file=>fs.readFileSync(file,'utf8')).join('\n');
    if(!evidence.includes(journey.endpoint))failures.push(`${journey.name}: ${journey.endpoint} is not asserted by its implementation/tests`);
  }
}

if(failures.length){
  console.error('Critical regression coverage audit failed:');
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Critical regression coverage audit passed (${journeys.length} journeys).`);
