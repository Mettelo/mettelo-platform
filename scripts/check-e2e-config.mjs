const required=[
  'E2E_BASE_URL',
  'E2E_SUPABASE_URL',
  'E2E_SUPABASE_ANON_KEY',
  'E2E_SUPABASE_SERVICE_ROLE_KEY',
  'E2E_MEMBER_EMAIL',
  'E2E_MEMBER_PASSWORD',
  'E2E_ARCHITECT_EMAIL',
  'E2E_ARCHITECT_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD'
];

const missing=required.filter(name=>!process.env[name]?.trim());
if(missing.length){
  console.error(`E2E configuration is incomplete. Missing: ${missing.join(', ')}`);
  console.error('Use the isolated local Supabase CI stack or a dedicated non-production project with disposable accounts. Never use production credentials.');
  process.exit(1);
}

const e2eUrl=new URL(process.env.E2E_SUPABASE_URL);
const productionUrl=process.env.PRODUCTION_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const knownProductionRef='aconptuqupsgznyrxhrh';
if(e2eUrl.hostname.includes(knownProductionRef)||(productionUrl&&new URL(productionUrl).hostname===e2eUrl.hostname)){
  console.error('Refusing to run destructive E2E tests against the production Supabase project.');
  process.exit(1);
}

if(process.env.CI_LOCAL_SUPABASE==='1'&&!['127.0.0.1','localhost'].includes(e2eUrl.hostname)){
  console.error('CI_LOCAL_SUPABASE requires a loopback Supabase URL.');
  process.exit(1);
}

if(process.env.E2E_ADMIN_EMAIL===process.env.E2E_MEMBER_EMAIL||process.env.E2E_ARCHITECT_EMAIL===process.env.E2E_MEMBER_EMAIL||process.env.E2E_ARCHITECT_EMAIL===process.env.E2E_ADMIN_EMAIL){
  console.error('E2E member, Project Architect and Admin accounts must be separate disposable identities.');
  process.exit(1);
}

console.log(`E2E configuration verified for ${e2eUrl.hostname}. Production guard active.`);
