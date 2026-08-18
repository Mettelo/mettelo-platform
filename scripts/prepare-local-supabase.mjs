import {cp,mkdir,readdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const target=path.join(root,'.supabase-ci');
const targetSupabase=path.join(target,'supabase');
const targetMigrations=path.join(targetSupabase,'migrations');
const sourceMigrations=path.join(root,'supabase','migrations');

await rm(target,{recursive:true,force:true});
await mkdir(targetMigrations,{recursive:true});
await cp(path.join(root,'supabase','config.toml'),path.join(targetSupabase,'config.toml'));

const files=(await readdir(sourceMigrations)).filter(name=>name.endsWith('.sql')).sort();
const launch='20260809_launch_readiness.sql';
const core='20260809_product_core.sql';
for(const required of [launch,core]){
  if(!files.includes(required))throw new Error(`Required historical baseline migration is missing: ${required}`);
}

await cp(path.join(sourceMigrations,launch),path.join(targetMigrations,'20260809000000_launch_readiness.sql'));
await cp(path.join(sourceMigrations,core),path.join(targetMigrations,'20260809010000_product_core.sql'));
await cp(path.join(root,'supabase','ci','20260809020000_missing_hosted_baseline.sql'),path.join(targetMigrations,'20260809020000_missing_hosted_baseline.sql'));

for(const file of files){
  if(file===launch||file===core)continue;
  await cp(path.join(sourceMigrations,file),path.join(targetMigrations,file));
}

const manifest={
  generatedAt:new Date().toISOString(),
  sourceMigrationCount:files.length,
  localMigrationCount:(await readdir(targetMigrations)).filter(name=>name.endsWith('.sql')).length,
  normalized:[
    `${launch} -> 20260809000000_launch_readiness.sql`,
    `${core} -> 20260809010000_product_core.sql`,
    'supabase/ci/20260809020000_missing_hosted_baseline.sql'
  ]
};
await writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');

const baseline=await readFile(path.join(targetMigrations,'20260809020000_missing_hosted_baseline.sql'),'utf8');
if(!baseline.includes("'career-cvs'"))throw new Error('Local compatibility baseline must create the private career-cvs bucket.');
console.log(`Prepared isolated Supabase workdir with ${manifest.localMigrationCount} migrations.`);
