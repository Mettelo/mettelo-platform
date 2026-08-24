import fs from 'node:fs';

let failed=false;
function read(file){if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;return'';}return fs.readFileSync(file,'utf8');}
function requireText(label,text,needles){for(const needle of needles)if(!text.includes(needle)){console.error(`FAIL ${label}: missing ${needle}`);failed=true;}}
function forbidText(label,text,needles){for(const needle of needles)if(text.includes(needle)){console.error(`FAIL ${label}: forbidden ${needle}`);failed=true;}}

const applications=read('components/MemberApplicationTracker.tsx');
requireText('Application actionability guard',applications,['needs:0',"view==='needs'?false",'Nothing needs your attention']);
forbidText('Application actionability guard',applications,['actionRequiredStates','Review action','Action required before this application can continue']);

const contributionForm=read('components/ContributionForm.tsx');
requireText('Contribution submission semantics',contributionForm,['YOUR CONTRIBUTION','Record what you contributed','FOR REVIEW','Submit contribution for review →','Spotlight or Showcase publication remains a separate consent process.']);
forbidText('Contribution submission semantics',contributionForm,['Mettelo Proof/Showcase','Submit for verification →','Submit for verification']);

const review=read('components/ProjectContributionReview.tsx');
requireText('Contribution review semantics',review,['Request changes','Verify contribution','Do not verify','body.task_updated','Contribution verified.','Contribution not verified.']);

const reviewApi=read('app/api/project-contributions/route.ts');
requireText('Contribution notification semantics',reviewApi,["title:'Contribution verified'","title:'Changes requested'","title:'Contribution not verified'",'task_updated:Boolean(contribution.task_id)']);
forbidText('Contribution notification semantics',reviewApi,["const outcome=status==='verified'?'approved'","'not approved'"]);

const proof=read('app/member/proof/page.tsx');
requireText('Mettelo Proof framing',proof,['MY WORK · CONTRIBUTION & EVIDENCE','title="Mettelo Proof"','what has completed review and what still needs attention']);
forbidText('Mettelo Proof framing',proof,['MY WORK · VERIFIED EVIDENCE','Your verified record of what you contributed']);

const publicProof=read('app/proof/[id]/page.tsx');
requireText('Public Proof trust boundary',publicProof,['Mettelo Proof','CONTRIBUTION VERIFIED','What contribution verification means','does not verify or certify the professional']);
forbidText('Public Proof trust boundary',publicProof,['VERIFIED BY METTELO','Mettelo Verified Proof','Verified Mettelo Proof']);

const publicProfile=read('app/people/[id]/page.tsx');
requireText('Public profile Proof boundary',publicProfile,['Mettelo Proof','Reviewed contribution evidence.','CONTRIBUTION VERIFIED','Profile information is member-provided.']);
forbidText('Public profile Proof boundary',publicProfile,['VERIFIED BY METTELO','Verified Proof']);

const opportunity=read('app/opportunities/[id]/page.tsx');
requireText('Opportunity listing checks',opportunity,['Source & listing checks','Listing status','They do not verify the employer, role outcome or any professional capability.']);
forbidText('Opportunity listing checks',opportunity,['Source & verification','<span>Verification</span>']);

const auth=read('app/signin/AuthAccountClient.tsx');
requireText('Signup trust',auth,['Create your account to build your professional profile, discover Mettelo projects and start building evidence through real work.','Account creation · professional profile setup follows','Access your profile, applications, projects and Mettelo Proof from one secure account.']);
forbidText('Signup trust',auth,['Access your profile, applications, projects, and verified Proof from one secure account.']);

if(failed)process.exit(1);
console.log('Content trust and lifecycle contract passed.');
