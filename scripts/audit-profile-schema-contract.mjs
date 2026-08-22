import fs from 'node:fs';

const routePath='app/api/profile/route.ts';
const migrationPath='supabase/migrations/20260819133000_profile_readiness.sql';
const canonicalReadinessPath='lib/member-readiness.ts';
const compatibilityPath='lib/profile-readiness.ts';

const failures=[];
for(const file of [routePath,migrationPath,canonicalReadinessPath,compatibilityPath]){
  if(!fs.existsSync(file))failures.push(`Missing required profile contract file: ${file}`);
}

if(!failures.length){
  const route=fs.readFileSync(routePath,'utf8');
  const migration=fs.readFileSync(migrationPath,'utf8');
  const canonical=fs.readFileSync(canonicalReadinessPath,'utf8');
  const compatibility=fs.readFileSync(compatibilityPath,'utf8');

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

  if(!route.includes('calculateMemberReadiness'))failures.push('Profile save must calculate the canonical member readiness result.');
  if(!route.includes('profile_readiness:memberReadiness.legacyProfileReadiness'))failures.push('Profile save must persist the canonical compatibility readiness value.');
  if(!canonical.includes('legacyProfileReadiness:completionPercentage'))failures.push('Compatibility profile_readiness must be derived from canonical profile completion.');
  if(!route.includes('member_readiness:memberReadiness'))failures.push('Profile save must return the canonical readiness result to the client.');
  if(!route.includes("supabase.from('profiles').upsert"))failures.push('Profile save must remain idempotent for existing and historical members.');

  for(const requiredState of ['profileCompletion','matchingReadiness','applicationReadiness','publicProfileReadiness','proofStatus']){
    if(!canonical.includes(requiredState))failures.push(`Canonical readiness domain must expose ${requiredState}.`);
  }
  if(!canonical.includes('verifiedProofCount'))failures.push('Canonical readiness must keep Verified Proof as a separate status input.');
  if(!compatibility.includes('calculateMemberReadiness'))failures.push('Legacy profile-readiness compatibility facade must delegate to the canonical readiness domain.');

  if(/profile_readiness\s*[<>]=?\s*\d+/.test(route))failures.push('Profile editing must never be gated by a persisted profile_readiness threshold.');
  if(/PROFILE_(APPLICATION|INTEREST)_READY/.test(canonical))failures.push('Canonical readiness must not reintroduce legacy numeric eligibility thresholds.');
}

if(failures.length){
  console.error('Profile schema contract audit failed:');
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Profile schema contract audit passed.');
