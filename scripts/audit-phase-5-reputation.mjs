import fs from 'node:fs';

const checks=[
  ['Proof visibility migration','supabase/migrations/20260816100000_phase5_proof_credentials_reputation.sql',['public','mettelo_only','private','consent_status']],
  ['Proof member controls','app/member/proof/page.tsx',['ProofVisibilityControl','visibility','Verified']],
  ['Public Proof gate','app/proof/[id]/page.tsx',[".eq('visibility','public')",'verified_at','VERIFIED BY METTELO']],
  ['Credential actions','components/CredentialActions.tsx',['Download / print credential','Copy LinkedIn details','Share credential']],
  ['Credential inactive state','app/credentials/[credentialId]/page.tsx',['CURRENT STATUS','not currently active','CredentialActions']],
  ['Spotlight member consent','app/member/spotlight/page.tsx',['SpotlightConsentPanel','explicit permission']],
  ['Spotlight consent API','app/api/spotlight-consent/route.ts',['grant','decline','withdraw','consent_status']],
  ['Admin consent gate','app/api/admin/spotlights/route.ts',['request_consent',"consent_status!=='granted'",'Publication is blocked']],
  ['Public Spotlight gate','app/spotlight/[id]/page.tsx',[".eq('consent_status','granted')",'Published with member permission']],
  ['Public profile reputation','app/people/[id]/page.tsx',[".eq('visibility','public')",".eq('consent_status','granted')",'VERIFIED BY METTELO']]
];
let failed=false;
for(const [label,file,needles] of checks){
  if(!fs.existsSync(file)){console.error(`FAIL ${label}: missing ${file}`);failed=true;continue;}
  const text=fs.readFileSync(file,'utf8');
  for(const needle of needles)if(!text.includes(needle)){console.error(`FAIL ${label}: missing ${needle}`);failed=true;}
}
if(failed)process.exit(1);
console.log(`Phase 5 reputation audit passed (${checks.length} surfaces).`);
