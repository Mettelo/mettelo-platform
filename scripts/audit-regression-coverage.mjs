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

const projectExperienceContracts=[
  'tests/project-experience-v2-canonical-contract.spec.ts',
  'tests/project-experience-v2-resource-visibility.spec.ts',
  'tests/project-experience-v2-lab-canonical-contract.spec.ts',
  'tests/project-experience-v2-architect-builder-contract.spec.ts',
  'tests/project-experience-v2-resource-governance-contract.spec.ts',
  'tests/project-experience-v2-draft-edit-contract.spec.ts',
  'tests/project-experience-v2-admin-draft-index-contract.spec.ts'
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

for(const file of projectExperienceContracts){if(!fs.existsSync(file))failures.push(`Project Experience V2: missing blocking contract ${file}`)}

const v2Files={
  publicPage:'app/projects/[id]/page.tsx',
  publicComponent:'components/project-experience/ProjectPublicDetailV2.tsx',
  publicStyles:'components/project-experience/ProjectPublicDetailV2.module.css',
  publicDetailContent:'lib/project-detail-content.ts',
  memberPage:'app/member/discover/[id]/page.tsx',
  memberComponent:'components/project-experience/MemberProjectDetailV2.tsx',
  memberStyles:'components/project-experience/MemberProjectDetailV2.module.css',
  canonicalData:'lib/project-experience-data.ts',
  labData:'lib/project-lab-canonical-data.ts',
  architectCreate:'components/ArchitectProjectForm.tsx',
  architectEdit:'components/ArchitectProjectEditForm.tsx',
  draftRoute:'app/api/architect-projects/[id]/route.ts',
  revisionRoute:'app/api/architect-projects/[id]/revision/route.ts',
  resourceGovernance:'app/api/architect-project-resources/route.ts',
  atomicUpdate:'supabase/migrations/20260902122000_project_experience_draft_atomic_update.sql',
  atomicAudit:'supabase/migrations/20260902122100_project_experience_draft_atomic_audit.sql'
};
for(const [name,file] of Object.entries(v2Files)){if(!fs.existsSync(file))failures.push(`Project Experience V2: missing ${name} implementation ${file}`)}

if(Object.values(v2Files).every(file=>fs.existsSync(file))){
  const publicPage=fs.readFileSync(v2Files.publicPage,'utf8');
  const publicComponent=fs.readFileSync(v2Files.publicComponent,'utf8');
  const publicStyles=fs.readFileSync(v2Files.publicStyles,'utf8');
  const publicDetailContent=fs.readFileSync(v2Files.publicDetailContent,'utf8');
  const memberPage=fs.readFileSync(v2Files.memberPage,'utf8');
  const memberComponent=fs.readFileSync(v2Files.memberComponent,'utf8');
  const memberStyles=fs.readFileSync(v2Files.memberStyles,'utf8');
  const canonicalData=fs.readFileSync(v2Files.canonicalData,'utf8');
  const labData=fs.readFileSync(v2Files.labData,'utf8');
  const createForm=fs.readFileSync(v2Files.architectCreate,'utf8');
  const editForm=fs.readFileSync(v2Files.architectEdit,'utf8');
  const draftRoute=fs.readFileSync(v2Files.draftRoute,'utf8');
  const revisionRoute=fs.readFileSync(v2Files.revisionRoute,'utf8');
  const governance=fs.readFileSync(v2Files.resourceGovernance,'utf8');
  const atomicUpdate=fs.readFileSync(v2Files.atomicUpdate,'utf8');
  const atomicAudit=fs.readFileSync(v2Files.atomicAudit,'utf8');

  for(const marker of ['getProjectDetailContent','getProjectExperiencePlanning','buildProjectExperienceModel','ProjectPublicDetailV2'])if(!publicPage.includes(marker))failures.push(`Project Experience V2: public detail is missing canonical wiring marker ${marker}`);
  for(const marker of ['getProjectDetailContent','getProjectExperiencePlanning','buildProjectExperienceModel','MemberProjectDetailV2'])if(!memberPage.includes(marker))failures.push(`Project Experience V2: member detail is missing canonical wiring marker ${marker}`);
  if(!canonicalData.includes(".is('project_run_id',null)"))failures.push('Project Experience V2: canonical data projection does not explicitly exclude run execution rows');
  if(!labData.includes("governanceStatus==='green'&&row.internal_storage_policy==='permitted'"))failures.push('Project Experience V2: Lab private resource links are not gated by green storage governance');

  const designMarkers=[
    'Build evidence of capability, not just another portfolio piece.',
    'Start with the decision, not the dataset.',
    'Clear objectives. Room for judgement.',
    'Data, provenance & trust',
    'Professional outputs, not tick-box files.',
    'Know the quality bar before you start.',
    'Capability becomes more valuable when there is evidence behind it.',
    'A structured route from ambiguity to handover.',
    'Choose where you can contribute—and where you want to stretch.',
    'Good fit if…',
    'challenge.keyQuestions',
    'challenge.inScope',
    'challenge.outOfScope',
    'providerLogoAssetPath',
    'licenceName',
    'governanceVerifiedAt',
    'retentionPolicy',
    "proofConfigured?'Mettelo Proof potential · verification required':'Evidence expectations pending'",
    'styles.mobileCta'
  ];
  for(const marker of designMarkers)if(!publicComponent.includes(marker))failures.push(`Project Experience V2: advanced public redesign lost required marker ${marker}`);
  for(const marker of ['Problem</span>','Output</span>','Proof</span>','Data</span>'])if(!publicComponent.includes(marker))failures.push(`Project Experience V2: Problem / Output / Proof / Data decision strip lost ${marker}`);

  if(!publicDetailContent.includes("row.sensitivity==='public'&&row.publish_policy==='permitted'&&row.governance_status==='green'"))failures.push('Project Experience V2: public resource projection is not GREEN + public + publish-permitted');
  if(publicDetailContent.includes('internal_storage_url'))failures.push('Project Experience V2: private stored-copy URL leaked into public resource projection');
  for(const marker of ['grid-template-columns:minmax(0,1.38fr) 390px','grid-template-columns:repeat(4,1fr)','position:sticky','@media(max-width:760px)','@media(max-width:520px)','prefers-reduced-motion','focus-visible'])if(!publicStyles.includes(marker))failures.push(`Project Experience V2: advanced responsive/accessibility styling lost ${marker}`);

  for(const marker of ['responsibilities','recommended_skills','experience_expectation','weekly_commitment','application_requirements'])if(!memberPage.includes(marker))failures.push(`Project Experience V2: Public to Member role continuity lost ${marker}`);
  for(const marker of ['role.responsibilities','role.recommendedSkills','role.experienceExpectation','role.weeklyCommitment','role.applicationRequirements','pdv2RoleDetails'])if(!memberComponent.includes(marker))failures.push(`Project Experience V2: member role decision UI lost rich role marker ${marker}`);
  for(const marker of ['pdv2RoleDetails','pdv2RoleDetail','@media(max-width:680px)'])if(!memberStyles.includes(marker))failures.push(`Project Experience V2: member rich-role responsive treatment lost ${marker}`);

  for(const label of ['Project basics','Problem & context','Data & resources','Deliverables & success','Skills & Proof','Roles & team','Timeline','Application settings','Lab preview']){
    if(!createForm.includes(label))failures.push(`Project Experience V2: create builder is missing ${label}`);
    if(!editForm.includes(label))failures.push(`Project Experience V2: edit builder is missing ${label}`);
  }
  if(!draftRoute.includes('saveAtomicRevision'))failures.push('Project Experience V2: canonical draft PATCH is not delegated to the atomic revision handler');
  if(!revisionRoute.includes("db.rpc('apply_project_experience_draft_revision'"))failures.push('Project Experience V2: canonical draft revision does not use the atomic RPC');
  if(draftRoute.includes("db.from('project_data_sources').update("))failures.push('Project Experience V2: route-level resource mutation reintroduced outside the atomic transaction');
  if(!atomicUpdate.includes('REVIEWED_RESOURCE_REMOVAL_BLOCKED')||!atomicUpdate.includes('GREEN_RESOURCE_EDIT_BLOCKED'))failures.push('Project Experience V2: atomic resource-governance safeguards are incomplete');
  if(!atomicUpdate.includes("update public.project_roles r set role_status='closed'"))failures.push('Project Experience V2: removed roles are not history-preserving closures');
  if(atomicUpdate.includes('delete from public.project_roles'))failures.push('Project Experience V2: role deletion would break stable role/application history');
  if(!atomicAudit.includes("'project_definition_updated'")||!atomicAudit.includes("'atomic_revision',true"))failures.push('Project Experience V2: canonical revision audit is not coupled to the database transaction');
  if(!atomicUpdate.includes('from public,anon,authenticated')||!atomicAudit.includes('from public,anon,authenticated'))failures.push('Project Experience V2: atomic RPC privileges are not revoked from browser roles');
  if(!governance.includes('if(!isAdmin)'))failures.push('Project Experience V2: resource-governance decision endpoint is not Admin restricted');
}

if(failures.length){
  console.error('Critical regression coverage audit failed:');
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Critical regression coverage audit passed (${journeys.length} journeys + ${projectExperienceContracts.length} Project Experience V2 contracts + advanced Public/Member redesign).`);
