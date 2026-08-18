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
const legacyOrder=[
  ['20260809_launch_readiness.sql','20260809000000_launch_readiness.sql'],
  ['20260809_product_core.sql','20260809010000_product_core.sql'],
  ['20260809_performance_indexes.sql','20260809025000_performance_indexes.sql'],
  ['20260809_security_hardening.sql','20260809030000_security_hardening.sql'],
  ['20260809_seed_labs_pilots.sql','20260809035000_seed_labs_pilots.sql']
];
const compatibilityMigrations=[
  '20260809020000_missing_hosted_baseline.sql',
  '20260812090000_project_run_hosted_baseline.sql'
];
for(const [source] of legacyOrder){
  if(!files.includes(source))throw new Error(`Required historical migration is missing: ${source}`);
}
for(const file of compatibilityMigrations){
  await readFile(path.join(ciMigrations,file),'utf8');
}

for(const [source,destination] of legacyOrder.slice(0,2)){
  await cp(path.join(sourceMigrations,source),path.join(targetMigrations,destination));
}
await cp(path.join(ciMigrations,compatibilityMigrations[0]),path.join(targetMigrations,compatibilityMigrations[0]));
for(const [source,destination] of legacyOrder.slice(2)){
  await cp(path.join(sourceMigrations,source),path.join(targetMigrations,destination));
}

const legacySources=new Set(legacyOrder.map(([source])=>source));
for(const file of files){
  if(legacySources.has(file))continue;
  await cp(path.join(sourceMigrations,file),path.join(targetMigrations,file));
}
await cp(path.join(ciMigrations,compatibilityMigrations[1]),path.join(targetMigrations,compatibilityMigrations[1]));

const normalized=[
  ...legacyOrder.slice(0,2).map(([source,destination])=>`${source} -> ${destination}`),
  `supabase/ci/${compatibilityMigrations[0]}`,
  ...legacyOrder.slice(2).map(([source,destination])=>`${source} -> ${destination}`),
  `supabase/ci/${compatibilityMigrations[1]}`
];
const manifest={
  generatedAt:new Date().toISOString(),
  sourceMigrationCount:files.length,
  localMigrationCount:(await readdir(targetMigrations)).filter(name=>name.endsWith('.sql')).length,
  normalized
};
await writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');

const baseline=await readFile(path.join(targetMigrations,compatibilityMigrations[0]),'utf8');
if(!baseline.includes("'career-cvs'"))throw new Error('Local compatibility baseline must create the private career-cvs bucket.');
const runBaseline=await readFile(path.join(targetMigrations,compatibilityMigrations[1]),'utf8');
if(!runBaseline.includes('is_project_run_member'))throw new Error('Project-run compatibility baseline must define run membership helpers.');
console.log(`Prepared isolated Supabase workdir with ${manifest.localMigrationCount} migrations.`);
