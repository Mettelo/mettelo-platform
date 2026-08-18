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
  console.error(`Staging E2E configuration is incomplete. Missing: ${missing.join(', ')}`);
  console.error('Use a dedicated Supabase staging project/branch and disposable test accounts. Never use production credentials.');
  process.exit(1);
}

const stagingUrl=new URL(process.env.E2E_SUPABASE_URL);
const productionUrl=process.env.PRODUCTION_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const knownProductionRef='aconptuqupsgznyrxhrh';
if(stagingUrl.hostname.includes(knownProductionRef)||(productionUrl&&new URL(productionUrl).hostname===stagingUrl.hostname)){
  console.error('Refusing to run destructive E2E tests against the production Supabase project.');
  process.exit(1);
}

if(process.env.E2E_ADMIN_EMAIL===process.env.E2E_MEMBER_EMAIL){
  console.error('E2E_ADMIN_EMAIL and E2E_MEMBER_EMAIL must be separate disposable accounts.');
  process.exit(1);
}

console.log(`Staging E2E configuration verified for ${stagingUrl.hostname}.`);
