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
  'tests/project-experience-v2-admin-draft-index-contract.spec.ts',
  'tests/project-team-readiness-v2-contract.spec.ts'
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
  roleData:'lib/project-experience-role-data.ts',
  canonicalData:'lib/project-experience-data.ts',
  labData:'lib/project-lab-canonical-data.ts',
  architectCreate:'components/ArchitectProjectForm.tsx',
  architectEdit:'components/ArchitectProjectEditForm.tsx',
  draftRoute:'app/api/architect-projects/[id]/route.ts',
  revisionRoute:'app/api/architect-projects/[id]/revision/route.ts',
  resourceGovernance:'app/api/architect-project-resources/route.ts',
  atomicUpdate:'supabase/migrations/20260902122000_project_experience_draft_atomic_update.sql',
  atomicAudit:'supabase/migrations/20260902122100_project_experience_draft_atomic_audit.sql',
  resourceAtomic:'supabase/migrations/20260902122200_project_resource_governance_atomic_review.sql',
  teamMigration:'supabase/migrations/20260902122300_project_team_readiness_v2.sql',
  teamReadiness:'lib/project-team-readiness.ts',
  memberApplication:'components/MemberProjectApplicationFlow.tsx',
  memberApplicationRoute:'app/api/project-applications/route.ts',
  adminApplicationRoute:'app/api/admin/applications/route.ts',
  adminTeamRoute:'app/api/admin/project-flow/route.ts'
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
  const roleData=fs.readFileSync(v2Files.roleData,'utf8');
  const canonicalData=fs.readFileSync(v2Files.canonicalData,'utf8');
  const labData=fs.readFileSync(v2Files.labData,'utf8');
  const createForm=fs.readFileSync(v2Files.architectCreate,'utf8');
  const editForm=fs.readFileSync(v2Files.architectEdit,'utf8');
  const draftRoute=fs.readFileSync(v2Files.draftRoute,'utf8');
  const revisionRoute=fs.readFileSync(v2Files.revisionRoute,'utf8');
  const governance=fs.readFileSync(v2Files.resourceGovernance,'utf8');
  const atomicUpdate=fs.readFileSync(v2Files.atomicUpdate,'utf8');
  const atomicAudit=fs.readFileSync(v2Files.atomicAudit,'utf8');
  const resourceAtomic=fs.readFileSync(v2Files.resourceAtomic,'utf8');
  const teamMigration=fs.readFileSync(v2Files.teamMigration,'utf8');
  const teamReadiness=fs.readFileSync(v2Files.teamReadiness,'utf8');
  const memberApplication=fs.readFileSync(v2Files.memberApplication,'utf8');
  const memberApplicationRoute=fs.readFileSync(v2Files.memberApplicationRoute,'utf8');
  const adminApplicationRoute=fs.readFileSync(v2Files.adminApplicationRoute,'utf8');
  const adminTeamRoute=fs.readFileSync(v2Files.adminTeamRoute,'utf8');

  for(const marker of ['getProjectDetailContent','getProjectExperiencePlanning','getProjectExperienceRoleDetails','buildProjectExperienceModel','ProjectPublicDetailV2'])if(!publicPage.includes(marker))failures.push(`Project Experience V2: public detail is missing canonical wiring marker ${marker}`);
  for(const marker of ['getProjectDetailContent','getProjectExperiencePlanning','getProjectExperienceRoleDetails','buildProjectExperienceModel','MemberProjectDetailV2'])if(!memberPage.includes(marker))failures.push(`Project Experience V2: member detail is missing canonical wiring marker ${marker}`);
  if(!canonicalData.includes(".is('project_run_id',null)"))failures.push('Project Experience V2: canonical data projection does not explicitly exclude run execution rows');
  if(!labData.includes("governanceStatus==='green'&&row.internal_storage_policy==='permitted'"))failures.push('Project Experience V2: Lab private resource links are not gated by green storage governance');

  const decisionFirstMarkers=['Decide whether this is the right project for you.','Understand the problem, contribution areas, commitment and quality bar before you apply.','01 · Understand the challenge','02 · Data & trust','03 · What you will produce','04 · Quality bar','05 · Capability & evidence','06 · Contribution areas','07 · Delivery journey','View full challenge and scope','View all ','Evidence opportunity · verification required','styles.mobileCta'];
  for(const marker of decisionFirstMarkers)if(!publicComponent.includes(marker))failures.push(`Project Experience V2: decision-first public redesign lost required marker ${marker}`);
  for(const marker of ['Decision</span>','Outputs</span>','Roles</span>','Evidence</span>'])if(!publicComponent.includes(marker))failures.push(`Project Experience V2: decision summary strip lost ${marker}`);
  for(const forbidden of ['externalUrl','licenceUrl','providerUrl','internal_storage_url'])if(publicComponent.includes(forbidden))failures.push(`Project Experience V2: public decision component reintroduced direct resource URL marker ${forbidden}`);

  if(!publicDetailContent.includes("row.sensitivity==='public'&&row.publish_policy==='permitted'&&row.governance_status==='green'"))failures.push('Project Experience V2: public resource projection is not GREEN + public + publish-permitted');
  if(publicDetailContent.includes('internal_storage_url'))failures.push('Project Experience V2: private stored-copy URL leaked into public resource projection');
  for(const marker of ['grid-template-columns:minmax(0,1.32fr) 360px','grid-template-columns:repeat(4,minmax(0,1fr))','@media(max-width:980px)','@media(max-width:680px)','prefers-reduced-motion','focus-visible'])if(!publicStyles.includes(marker))failures.push(`Project Experience V2: decision-first responsive/accessibility styling lost ${marker}`);

  for(const marker of ['responsibilities','recommended_skills','experience_expectation','weekly_commitment','role_status','application_requirements'])if(!roleData.includes(marker))failures.push(`Project Experience V2: rollout-safe rich role projection lost ${marker}`);
  if(!roleData.includes('if(error)return new Map()'))failures.push('Project Experience V2: rich role projection no longer degrades safely before the additive schema reaches a preview database');
  for(const marker of ['role.responsibilities','role.recommendedSkills','role.experienceExpectation','role.weeklyCommitment','role.applicationRequirements','pdv2Disclosure'])if(!memberComponent.includes(marker))failures.push(`Project Experience V2: member role decision UI lost rich role marker ${marker}`);
  for(const marker of ['pdv2Disclosure','pdv2DisclosureBody','grid-template-columns:minmax(0,1.3fr) 360px','@media(max-width:1060px)','@media(max-width:760px)','@media(max-width:520px)','prefers-reduced-motion','focus-visible'])if(!memberStyles.includes(marker))failures.push(`Project Experience V2: decision-first Member responsive treatment lost ${marker}`);

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
  if(!governance.includes("db.rpc('apply_project_resource_governance_review'"))failures.push('Project Experience V2: resource governance is not delegated to the atomic review RPC');
  if(governance.includes("db.from('project_data_sources').update("))failures.push('Project Experience V2: resource governance reintroduced route-level source mutation');
  for(const marker of ['update public.project_data_sources','insert into public.project_data_source_governance_reviews','insert into public.project_governance_events',"'atomic_review',true",'GREEN_REQUIRES_LICENCE_EVIDENCE','from public,anon,authenticated'])if(!resourceAtomic.includes(marker))failures.push(`Project Experience V2: atomic resource review lost ${marker}`);

  if(!teamMigration.includes('leadership_interest boolean not null default false'))failures.push('Project Experience V2: leadership willingness is not persisted');
  if(!memberApplication.includes('I would be willing to lead this project team if selected.'))failures.push('Project Experience V2: application UI lost leadership willingness');
  if(!memberApplicationRoute.includes('leadership_interest:isInterest?false:leadershipInterest'))failures.push('Project Experience V2: application endpoint does not persist leadership willingness');
  for(const marker of ["members.every(member=>Boolean(member.project_role_id))",".from('project_experience_readiness')","if(leads.length===0)blockers.push('project_lead')","if(leads.length>1)blockers.push('multiple_project_leads')","leadershipInterest?60:0",'activeLeadProjects*25'])if(!teamReadiness.includes(marker))failures.push(`Project Experience V2: team readiness lost ${marker}`);
  if(!adminApplicationRoute.includes("if(readiness.ready&&project.project_type==='open'&&!run.has_started)"))failures.push('Project Experience V2: Open Project auto-start is not gated on complete team readiness');
  if(adminApplicationRoute.includes("if(full&&project.project_type==='open'&&!run.has_started)"))failures.push('Project Experience V2: legacy headcount-only auto-start was reintroduced');
  if(!adminTeamRoute.includes("Project Lead can only be changed while the team is still forming."))failures.push('Project Experience V2: Admin can change leadership after team lock');
  if(!adminTeamRoute.includes('if(!readiness.ready)return NextResponse.json'))failures.push('Project Experience V2: Admin team start can bypass readiness');
}

if(failures.length){console.error('Critical regression coverage audit failed:');failures.forEach(failure=>console.error(`- ${failure}`));process.exit(1)}
console.log(`Critical regression coverage audit passed (${journeys.length} journeys + ${projectExperienceContracts.length} Project Experience V2 contracts + decision-first Public/Member redesign).`);
