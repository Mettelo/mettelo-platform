import fs from 'node:fs';

const checks=[
  ['Proof visibility migration','supabase/migrations/20260816100000_phase5_proof_credentials_reputation.sql',['public','mettelo_only','private','consent_status']],
  ['Proof member controls','app/member/proof/page.tsx',['ProofVisibilityControl','visibility','Verified']],
  ['Public Proof gate','app/proof/[id]/page.tsx',[".eq('visibility','public')",'verified_at','VERIFIED BY METTELO']],
  ['Credential actions','components/CredentialActions.tsx',['Download / print credential','Copy LinkedIn details','Share credential']],
  ['Credential inactive state','app/credentials/[credentialId]/page.tsx',['CURRENT STATUS','not currently active','CredentialActions']],
  ['Spotlight member consent','app/member/spotlight/page.tsx',['SpotlightConsentPanel','you decide whether your personal recognition becomes public']],
  ['Spotlight consent API','app/api/spotlight-consent/route.ts',['grant','decline','withdraw','publishSpotlightIfReady']],
  ['Spotlight automatic workflow','lib/spotlight-workflow.ts',['requestSpotlightConsent','publishSpotlightIfReady','consent-request']],
  ['Admin exception governance','app/api/admin/spotlights/route.ts',['exclude','hold','suppress_project','replaceExcludedSpotlight']],
  ['Public Spotlight projection','lib/public-spotlight.ts',[".eq('consent_status','granted')",".eq('publication_held',false)",".eq('visibility','public')"]],
  ['Public Spotlight permission copy','app/spotlight/[id]/page.tsx',['Published with member permission.','Share this public Spotlight.']],
  ['Member Spotlight social sharing','components/SpotlightConsentPanel.tsx',['Share your public Spotlight.','Share my Spotlight recognition','View public recognition']],
  ['Public profile reputation','app/people/[id]/page.tsx',[".eq('visibility','public')",".eq('consent_status','granted')",".eq('publication_held',false)",'VERIFIED BY METTELO']]
];
let failed=false;
for(const [label,file,needles] of checks){
  if(!fs.existsSync(file)){console.error(`FAIL ${label}: missing ${file}`);failed=true;continue;}
  const text=fs.readFileSync(file,'utf8');
  for(const needle of needles)if(!text.includes(needle)){console.error(`FAIL ${label}: missing ${needle}`);failed=true;}
}
if(failed)process.exit(1);
console.log(`Phase 5 reputation audit passed (${checks.length} surfaces).`);
