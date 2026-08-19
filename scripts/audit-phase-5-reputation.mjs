import fs from 'node:fs';

const checks=[
  ['Proof visibility migration','supabase/migrations/20260816100000_phase5_proof_credentials_reputation.sql',['public','mettelo_only','private','consent_status']],
  ['Proof verified query','app/member/proof/page.tsx',["from('contributions')","eq('user_id',user.id)","eq('verification_status','verified')","in('verification_status',['pending','needs_changes'])",'MemberProofPortfolio','MY WORK · VERIFIED EVIDENCE']],
  ['Proof member portfolio','components/MemberProofPortfolio.tsx',['ProofVisibilityControl','✓ Verified','◷ Pending verification','Evidence you can stand behind','Evidence still in review','Visibility is separate from verification','Spotlight stays separate','Review &amp; resubmit','No Proof matches these filters']],
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

const proofPage=fs.readFileSync('app/member/proof/page.tsx','utf8');
for(const forbidden of ["from('project_tasks')","from('project_milestones')","from('profiles')",'ContributionForm']){
  if(proofPage.includes(forbidden)){console.error(`FAIL Proof truth: My Mettelo Proof must not infer verified evidence from unrelated sources (${forbidden}).`);failed=true;}
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
console.log(`Phase 5 reputation audit passed (${checks.length} surfaces plus Proof truth/privacy guards).`);
