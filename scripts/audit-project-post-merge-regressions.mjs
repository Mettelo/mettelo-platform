import fs from 'node:fs';

const files={
  discoverPage:'app/member/discover/page.tsx',
  discoverLoader:'lib/member-discover-project-loader.ts',
  saveStyles:'components/SaveProjectButton.module.css',
  pagination:'app/projects/project-pagination-polish.css',
  projectsLayout:'app/projects/layout.tsx',
  publicPage:'app/projects/[id]/page.tsx',
  memberPage:'app/member/discover/[id]/page.tsx',
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
  const polish=fs.readFileSync(files.brandPolish,'utf8');
  const migration=fs.readFileSync(files.parityMigration,'utf8');

  if(!discoverPage.includes('loadMemberDiscoverProjects'))failures.push('Member Discover does not use the resilient project loader');
  for(const marker of ['PRIMARY_SELECT','CORE_FACET_SELECT','MINIMAL_SELECT','retrying without optional role-family catalogue relation','retrying canonical project and role fields only'])if(!loader.includes(marker))failures.push(`Member Discover resilient loader lost ${marker}`);
  if(!migration.includes('create table if not exists public.saved_projects'))failures.push('runtime parity migration does not restore saved_projects');
  if(!migration.includes('create table if not exists public.project_role_families'))failures.push('runtime parity migration does not restore project_role_families');
  if(!migration.includes('create table if not exists public.capability_aliases'))failures.push('runtime parity migration does not restore capability_aliases');
  if(!migration.includes('alter table public.projects add column if not exists catalogue_working_model_source'))failures.push('runtime parity migration does not restore catalogue working-model metadata');
  if(!saveStyles.includes('.wrap:not(.compact)')||!saveStyles.includes('width:100%'))failures.push('detail Save Project control is not full-width/aligned');
  for(const marker of ['grid-template-columns:auto minmax(0,1fr) auto','@media(max-width:560px)','@media(max-width:360px)','var(--bronze)','var(--sand-2)'])if(!pagination.includes(marker))failures.push(`public pagination polish lost ${marker}`);
  if(!projectsLayout.includes("import './project-pagination-polish.css'"))failures.push('public Projects layout does not load pagination polish');
  if(!publicPage.includes('ProjectExperiencePolish.module.css')||!publicPage.includes('polish.host'))failures.push('public Project Detail is not wrapped by the shared brand polish');
  if(!memberPage.includes('ProjectExperiencePolish.module.css')||!memberPage.includes('polish.memberHost'))failures.push('member Project Detail is not left-aligned in the shared brand polish');
  for(const marker of ['--px-ink:var(--ink)','--mp-ink:var(--ink)','var(--bronze)','var(--indigo)','linear-gradient(138deg,var(--ink)'])if(!polish.includes(marker))failures.push(`Project Experience brand polish lost ${marker}`);
}

if(failures.length){console.error('Project post-merge regression audit failed:');failures.forEach(item=>console.error(`- ${item}`));process.exit(1)}
console.log('Project post-merge regression audit passed: Discover resilience, Save parity, pagination, brand and alignment are protected.');
