import fs from 'node:fs';

const routePath='app/api/profile/route.ts';
const migrationPath='supabase/migrations/20260819133000_profile_readiness.sql';
const readinessPath='lib/profile-readiness.ts';

const failures=[];
for(const file of [routePath,migrationPath,readinessPath]){
  if(!fs.existsSync(file))failures.push(`Missing required profile contract file: ${file}`);
}

if(!failures.length){
  const route=fs.readFileSync(routePath,'utf8');
  const migration=fs.readFileSync(migrationPath,'utf8');
  const readiness=fs.readFileSync(readinessPath,'utf8');

  const requiredColumns=[
    'portfolio_url','current_job_title','organisation','experience_level',
    'employment_status','project_availability','weekly_capacity','preferred_roles',
    'languages','profile_readiness'
  ];

  for(const column of requiredColumns){
    if(route.includes(`${column}:`)||route.includes(`${column},`)||route.includes(`.${column}`)){
      if(!migration.includes(column))failures.push(`Profile API depends on ${column}, but the canonical readiness migration does not establish it.`);
    }
  }

  const requiredMigrationEvidence=[
    'profile_readiness smallint not null default 0',
    'profiles_profile_readiness_range',
    'check (profile_readiness between 0 and 100)'
  ];
  for(const evidence of requiredMigrationEvidence){
    if(!migration.toLowerCase().includes(evidence.toLowerCase()))failures.push(`Canonical readiness migration is missing: ${evidence}`);
  }

  if(!route.includes('profile_readiness:readiness.score'))failures.push('Profile save must persist the calculated readiness score.');
  if(!route.includes("supabase.from('profiles').upsert"))failures.push('Profile save must remain idempotent for existing and historical members.');
  if(!readiness.includes('PROFILE_APPLICATION_READY=85'))failures.push('Application readiness threshold must remain 85.');
  if(!readiness.includes('PROFILE_INTEREST_READY=60'))failures.push('Interest readiness threshold must remain 60.');
  if(/profile_readiness\s*[<>]=?\s*85/.test(route))failures.push('Profile editing must not be gated by the 85% readiness threshold.');
}

if(failures.length){
  console.error('Profile schema contract audit failed:');
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Profile schema contract audit passed.');
