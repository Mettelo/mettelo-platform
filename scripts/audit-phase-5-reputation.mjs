import fs from 'node:fs';

const checks=[
  ['Proof visibility migration','supabase/migrations/20260816100000_phase5_proof_credentials_reputation.sql',['public','mettelo_only','private','consent_status']],
  ['Proof contribution grants','supabase/migrations/20260819232500_member_contribution_grants.sql',['grant select on table public.contributions to anon, authenticated','grant insert, update on table public.contributions to authenticated']],
  ['Proof verified query','app/member/proof/page.tsx',["from('contributions')","eq('user_id',user.id)","eq('verification_status','verified')","in('verification_status',['pending','needs_changes'])",'MemberProofPortfolio','MY WORK · CONTRIBUTION & EVIDENCE','title="Mettelo Proof"']],
  ['Proof member portfolio','components/MemberProofPortfolio.tsx',['ProofVisibilityControl','✓ Verified','◷ Pending verification','Evidence you can stand behind','Evidence still in review','Visibility is separate from verification','Spotlight stays separate','Review &amp; resubmit','No Proof matches these filters']],
  ['Public Proof gate','app/proof/[id]/page.tsx',[".eq('visibility','public')",'verified_at','VERIFIED BY METTELO']],
  ['Credential actions','components/CredentialActions.tsx',['Download / print credential','Copy LinkedIn details','Share credential']],
  ['Credential inactive state','app/credentials/[credentialId]/page.tsx',['CURRENT STATUS','not currently active','CredentialActions']],
  ['Spotlight member consent','app/member/spotlight/page.tsx',['SpotlightConsentPanel','you decide whether your personal recognition becomes public']],
  ['Spotlight consent API','app/api/spotlight-consent/route.ts',['grant','decline','withdraw','publishSpotlightIfReady']],
  ['Spotlight automatic workflow','lib/spotlight-workflow.ts',['requestSpotlightConsent','publishSpotlightIfReady','consent-request']],
  ['Admin exception governance','app/api/admin/spotlights/route.ts',['replaceExcludedSpotlight',"action==='exclude'","action==='hold'","action==='suppress_project'"]],
  ['Public Spotlight projection','lib/public-spotlight.ts',[".eq('consent_status','granted')",".eq('publication_held',false)",".eq('visibility','public')"]],
  ['Public Spotlight permission copy','app/spotlight/[id]/page.tsx',['Published with member permission.','Share this public Spotlight.']],
  ['Public profile reputation','app/people/[id]/page.tsx',[".eq('visibility','public')",".eq('consent_status','granted')",".eq('publication_held',false)",'VERIFIED BY METTELO']]
];
let failed=false;
for(const [label,file,needles] of checks){
  if(!fs.existsSync(file)){console.error(`FAIL ${label}: missing ${file}`);failed=true;continue;}
  const text=fs.readFileSync(file,'utf8');
  for(const needle of needles)if(!text.includes(needle)){console.error(`FAIL ${label}: missing ${needle}`);failed=true;}
}

const adminSpotlight=fs.readFileSync('app/api/admin/spotlights/route.ts','utf8');
for(const forbidden of ["'request_consent'","action==='publish'"]){
  if(adminSpotlight.includes(forbidden)){console.error(`FAIL Spotlight governance: Admin must not own routine consent/publication (${forbidden}).`);failed=true;}
}

const proofPage=fs.readFileSync('app/member/proof/page.tsx','utf8');
for(const forbidden of ["from('project_tasks')","from('project_milestones')","from('profiles')",'ContributionForm','MY WORK · VERIFIED EVIDENCE']){
  if(proofPage.includes(forbidden)){console.error(`FAIL Proof truth: My Mettelo Proof must not infer or globally overstate verified evidence (${forbidden}).`);failed=true;}
}
if(!proofPage.includes("row.verification_status==='needs_changes'?row.review_notes:null")){
  console.error('FAIL Proof privacy: review feedback must only cross into the member portfolio for an actionable needs_changes state.');failed=true;
}

const portfolio=fs.readFileSync('components/MemberProofPortfolio.tsx','utf8');
for(const forbidden of ['Filter by verified skill','Skills evidenced']){
  if(portfolio.includes(forbidden)){console.error(`FAIL Proof skills: no verified contribution-skill mapping exists, so ${forbidden} must not be fabricated.`);failed=true;}
}
if(!portfolio.includes("verified&&<section className=\"mpVisibilityBlock\"")){
  console.error('FAIL Proof visibility: visibility controls must remain subordinate to the verified state.');failed=true;
}
if(!portfolio.includes("item.verification_status==='needs_changes'")){
  console.error('FAIL Proof pending: changes-required evidence must remain a distinct member-action state.');failed=true;
}

const contributionApi=fs.readFileSync('app/api/contributions/route.ts','utf8');
for(const required of ["verification_status:'pending'",'membership?.project_run_id','You can only submit evidence against work assigned to you.','Only contributions with requested changes can be resubmitted.']){
  if(!contributionApi.includes(required)){console.error(`FAIL Proof evidence workflow: missing ${required}`);failed=true;}
}

if(failed)process.exit(1);
console.log(`Phase 5 reputation audit passed (${checks.length} surfaces plus Spotlight governance and Proof truth/privacy/grant guards).`);
