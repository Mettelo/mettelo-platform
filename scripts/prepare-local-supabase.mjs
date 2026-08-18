import {cp,mkdir,readdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const target=path.join(root,'.supabase-ci');
const targetSupabase=path.join(target,'supabase');
const targetMigrations=path.join(targetSupabase,'migrations');
const sourceMigrations=path.join(root,'supabase','migrations');
const ciMigrations=path.join(root,'supabase','ci');

await rm(target,{recursive:true,force:true});
await mkdir(targetMigrations,{recursive:true});
await cp(path.join(root,'supabase','config.toml'),path.join(targetSupabase,'config.toml'));

const files=(await readdir(sourceMigrations)).filter(name=>name.endsWith('.sql')).sort();
const compatibilityMigrations=(await readdir(ciMigrations)).filter(name=>name.endsWith('.sql')).sort();
const canonicalHostedBaselines=[
  '20260809020000_missing_hosted_baseline.sql',
  '20260812090000_project_run_hosted_baseline.sql',
  '20260816095000_spotlight_hosted_baseline.sql'
];
const allowedCiCompatibility=new Set(['20260818990000_service_role_hosted_grants.sql']);
const legacyOrder=[
  ['20260809_launch_readiness.sql','20260809000000_launch_readiness.sql'],
  ['20260809_product_core.sql','20260809010000_product_core.sql'],
  ['20260809_performance_indexes.sql','20260809025000_performance_indexes.sql'],
  ['20260809_security_hardening.sql','20260809030000_security_hardening.sql'],
  ['20260809_seed_labs_pilots.sql','20260809035000_seed_labs_pilots.sql']
];
for(const [source] of legacyOrder){
  if(!files.includes(source))throw new Error(`Required historical migration is missing: ${source}`);
}
for(const file of canonicalHostedBaselines){
  if(!files.includes(file))throw new Error(`Canonical hosted baseline is missing from supabase/migrations: ${file}`);
}
for(const file of compatibilityMigrations){
  if(!allowedCiCompatibility.has(file))throw new Error(`Schema compatibility must live in supabase/migrations, not supabase/ci: ${file}`);
  await readFile(path.join(ciMigrations,file),'utf8');
}

for(const [source,destination] of legacyOrder){
  await cp(path.join(sourceMigrations,source),path.join(targetMigrations,destination));
}

const legacySources=new Set(legacyOrder.map(([source])=>source));
for(const file of files){
  if(legacySources.has(file))continue;
  await cp(path.join(sourceMigrations,file),path.join(targetMigrations,file));
}
for(const file of compatibilityMigrations){
  if(files.includes(file))throw new Error(`CI compatibility migration collides with canonical migration: ${file}`);
  await cp(path.join(ciMigrations,file),path.join(targetMigrations,file));
}

const manifest={
  generatedAt:new Date().toISOString(),
  sourceMigrationCount:files.length,
  compatibilityMigrationCount:compatibilityMigrations.length,
  localMigrationCount:(await readdir(targetMigrations)).filter(name=>name.endsWith('.sql')).length,
  normalized:[
    ...legacyOrder.map(([source,destination])=>`${source} -> ${destination}`),
    ...compatibilityMigrations.map(file=>`supabase/ci/${file}`)
  ]
};
await writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');

const baseline=await readFile(path.join(targetMigrations,'20260809020000_missing_hosted_baseline.sql'),'utf8');
if(!baseline.includes("'career-cvs'"))throw new Error('Canonical hosted baseline must create the private career-cvs bucket.');
const runBaseline=await readFile(path.join(targetMigrations,'20260812090000_project_run_hosted_baseline.sql'),'utf8');
if(!runBaseline.includes('is_project_run_member'))throw new Error('Canonical project-run baseline must define run membership helpers.');
const spotlightBaseline=await readFile(path.join(targetMigrations,'20260816095000_spotlight_hosted_baseline.sql'),'utf8');
if(!spotlightBaseline.includes('award_month'))throw new Error('Canonical Spotlight baseline must define reputation fields.');
console.log(`Prepared isolated Supabase workdir with ${manifest.localMigrationCount} migrations.`);
