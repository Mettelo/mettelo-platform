import fs from 'node:fs';

const files={
  discoverPage:'app/member/discover/page.tsx',
  discoverLoader:'lib/member-discover-project-loader.ts',
  saveStyles:'components/SaveProjectButton.module.css',
  pagination:'app/projects/project-pagination-polish.css',
  projectsLayout:'app/projects/layout.tsx',
  publicPage:'app/projects/[id]/page.tsx',
  memberPage:'app/member/discover/[id]/page.tsx',
  memberComponent:'components/project-experience/MemberProjectDetailV2.tsx',
  memberBody:'components/project-experience/MemberProjectDetailBodyV3.tsx',
  memberApplyPage:'app/member/discover/[id]/apply/page.tsx',
  brandPolish:'components/project-experience/ProjectExperiencePolish.module.css',
  parityMigration:'supabase/migrations/20260902184500_restore_project_runtime_parity.sql'
};
const failures=[];
for(const [name,file] of Object.entries(files))if(!fs.existsSync(file))failures.push(`missing ${name}: ${file}`);

if(!failures.length){
  const discoverPage=fs.readFileSync(files.discoverPage,'utf8');
  const loader=fs.readFileSync(files.discoverLoader,'utf8');
  const saveStyles=fs.readFileSync(files.saveStyles,'utf8');
  const pagination=fs.readFileSync(files.pagination,'utf8');
  const projectsLayout=fs.readFileSync(files.projectsLayout,'utf8');
  const publicPage=fs.readFileSync(files.publicPage,'utf8');
  const memberPage=fs.readFileSync(files.memberPage,'utf8');
  const memberComponent=fs.readFileSync(files.memberComponent,'utf8');
  const memberBody=fs.readFileSync(files.memberBody,'utf8');
  const memberApplyPage=fs.readFileSync(files.memberApplyPage,'utf8');
  const polish=fs.readFileSync(files.brandPolish,'utf8');
  const migration=fs.readFileSync(files.parityMigration,'utf8');

  if(!discoverPage.includes('loadMemberDiscoverProjects'))failures.push('Member Discover does not use the resilient project loader');
  for(const marker of ['PRIMARY_SELECT','CORE_FACET_SELECT','MINIMAL_SELECT','retrying without optional role-family catalogue relation','retrying canonical project and role fields only'])if(!loader.includes(marker))failures.push(`Member Discover resilient loader lost ${marker}`);
  for(const marker of ['width:100%;max-width:none','var(--bronze-deep)','@media(min-width:1500px)','grid-template-columns:repeat(3,minmax(0,1fr))'])if(!discoverPage.includes(marker))failures.push(`Member Discover workspace/brand polish lost ${marker}`);

  if(!migration.includes('create table if not exists public.saved_projects'))failures.push('runtime parity migration does not restore saved_projects');
  if(!migration.includes('create table if not exists public.project_role_families'))failures.push('runtime parity migration does not restore project_role_families');
  if(!migration.includes('create table if not exists public.capability_aliases'))failures.push('runtime parity migration does not restore capability_aliases');
  if(!migration.includes('alter table public.projects add column if not exists catalogue_working_model_source'))failures.push('runtime parity migration does not restore catalogue working-model metadata');
  if(!saveStyles.includes('.wrap:not(.compact)')||!saveStyles.includes('width:100%'))failures.push('detail Save Project control does not retain a stable aligned wrapper');

  for(const marker of ['grid-template-columns:auto minmax(0,1fr) auto','@media(max-width:560px)','@media(max-width:360px)','var(--bronze)','var(--sand-2)'])if(!pagination.includes(marker))failures.push(`public pagination polish lost ${marker}`);
  if(!projectsLayout.includes("import './project-pagination-polish.css'"))failures.push('public Projects layout does not load pagination polish');
  if(!publicPage.includes('ProjectExperiencePolish.module.css')||!publicPage.includes('polish.host')||!publicPage.includes('polish.publicHost'))failures.push('public Project Detail is not wrapped by the shared public brand/layout polish');
  if(!memberPage.includes('ProjectExperiencePolish.module.css')||!memberPage.includes('polish.memberHost'))failures.push('member Project Detail is not left-aligned in the shared brand polish');
  if(!memberPage.includes("from('project_role_families')")||!memberPage.includes('contributionAreas={contributionAreas}'))failures.push('member Project Detail does not load governed project-specific contribution areas separately from the canonical project query');

  // Phase 5 keeps the accepted hero/decision wrapper, but contribution areas are
  // informational and the conversion path is a role-neutral Submit Interest handoff.
  for(const marker of ["label:'Submit Interest'",'contributionAreas','MemberProjectDetailBodyV3','primaryAction'])if(!memberComponent.includes(marker))failures.push(`member Project Detail Phase 5 wrapper contract lost ${marker}`);
  for(const marker of ['Possible contribution areas','You are not choosing or applying for a formal role at this stage.','What happens after you submit interest','Submit Interest'])if(!memberBody.includes(marker))failures.push(`member Project Detail Phase 5 decision contract lost ${marker}`);
  for(const retired of ['Choose your contribution area','aria-pressed={selected}','Choose this role','selectedRoleId','Apply as {selectedRole.title}',"?role=${encodeURIComponent(selectedRole.id)}",'/apply?role='])if(memberBody.includes(retired))failures.push(`member Project Detail reintroduced retired role-first marker ${retired}`);
  if(memberBody.includes("useState(roles[0]")||memberBody.includes('availableRoles[0]')||memberBody.includes('selectableRoles[0]'))failures.push('member Project Detail reintroduced first-role auto-selection');
  if(!memberBody.includes('canApply&&<div className={styles.mobileAction}'))failures.push('member mobile project CTA is not gated on Phase 5 eligibility');
  if(!memberBody.includes('href={`/member/discover/${projectId}/apply`}'))failures.push('member mobile project CTA does not preserve the role-neutral Phase 6 handoff');
  if(!memberApplyPage.includes('MemberProjectApplicationFlow'))failures.push('application page no longer renders the canonical Phase 6 interest form');
  for(const marker of ['calculateMemberReadiness','loadMemberProjectTeamState','resolveMemberProjectState',"state!=='open_eligible'"]){if(!memberApplyPage.includes(marker))failures.push(`application page lost current qualification revalidation marker ${marker}`)}
  if(memberApplyPage.includes('requestedRole')||memberApplyPage.includes('initialRoleId')||memberApplyPage.includes('availableRoles[0]?.id'))failures.push('application page reintroduced a required pre-interest role selection contract');

  for(const marker of ['--px-ink:var(--ink)','--mp-ink:var(--ink)','var(--bronze)','var(--indigo)','linear-gradient(138deg,var(--ink)','grid-template-columns:minmax(0,1.58fr) 350px','pdv2SaveUtility'])if(!polish.includes(marker))failures.push(`Project Experience brand/hierarchy polish lost ${marker}`);
}

if(failures.length){console.error('Project post-merge regression audit failed:');failures.forEach(item=>console.error(`- ${item}`));process.exit(1)}
console.log('Project post-merge regression audit passed: Discover resilience, Save parity, pagination, brand hierarchy, Phase 5 role-neutral qualification and Submit Interest routing are protected.');
