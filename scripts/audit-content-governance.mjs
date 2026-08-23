import fs from 'node:fs';
import path from 'node:path';

const roots=['app','components','lib'];
const extensions=new Set(['.ts','.tsx','.js','.jsx','.mjs']);
const excluded=new Set(['node_modules','.next','coverage']);
function filesUnder(root){if(!fs.existsSync(root))return[];return fs.readdirSync(root,{withFileTypes:true}).flatMap(entry=>{if(excluded.has(entry.name))return[];const full=path.join(root,entry.name);if(entry.isDirectory())return filesUnder(full);return extensions.has(path.extname(entry.name))?[full]:[];});}
const files=roots.flatMap(filesUnder);const sources=files.map(file=>({file,text:fs.readFileSync(file,'utf8')}));const findings=[];

// Outcome guarantees are unsafe everywhere, regardless of product surface.
const globallyProhibited=[
 ['guaranteed job',/guaranteed (job|role|employment)/gi],
 ['guaranteed match',/guaranteed match/gi],
 ['guaranteed opportunity',/guaranteed opportunit(?:y|ies)/gi],
 ['employer verified',/employer[- ]verified/gi],
 ['Mettelo-certified capability',/Mettelo[- ]certified capability/gi]
];
for(const {file,text} of sources){for(const [label,pattern] of globallyProhibited){pattern.lastIndex=0;if(pattern.test(text))findings.push(`${file}: prohibited trust/outcome claim: ${label}`);}}

// Contribution/Proof surfaces have a narrower verification contract. Project Architect
// credentials are a separate explicit credential model and are therefore not policed by
// blunt global string matching here.
const contributionSurfaces=[
 'components/ContributionForm.tsx',
 'components/ProjectContributionReview.tsx',
 'app/api/project-contributions/route.ts',
 'app/member/proof/page.tsx',
 'components/MemberProofPortfolio.tsx',
 'app/proof/[id]/page.tsx',
 'app/people/[id]/page.tsx',
 'app/opportunities/[id]/page.tsx',
 'app/search/page.tsx',
 'app/signin/AuthAccountClient.tsx'
];
const contributionForbidden=[
 ['verified professional',/verified professional/gi],
 ['verified capability',/verified capability/gi],
 ['verified by Mettelo',/verified by Mettelo/gi],
 ['Mettelo Verified Proof',/Mettelo Verified Proof/gi],
 ['Verified Mettelo Proof',/Verified Mettelo Proof/gi]
];
for(const file of contributionSurfaces){if(!fs.existsSync(file)){findings.push(`${file}: missing trust-critical surface`);continue;}const text=fs.readFileSync(file,'utf8');for(const [label,pattern] of contributionForbidden){pattern.lastIndex=0;if(pattern.test(text))findings.push(`${file}: prohibited contribution-Proof claim: ${label}`);}}

const required=[
 ['app/api/project-contributions/route.ts',['Contribution verified','Changes requested','Contribution not verified']],
 ['components/ContributionForm.tsx',['YOUR CONTRIBUTION','FOR REVIEW','Submit contribution for review →']],
 ['components/ProjectContributionReview.tsx',['Request changes','Verify contribution','Do not verify']],
 ['app/member/proof/page.tsx',['MY WORK · CONTRIBUTION & EVIDENCE','Mettelo Proof']],
 ['components/MemberProofPortfolio.tsx',['Verified contribution evidence','Contribution verified','Visibility is separate from verification','Spotlight stays separate']],
 ['app/proof/[id]/page.tsx',['CONTRIBUTION VERIFIED','What contribution verification means']],
 ['app/people/[id]/page.tsx',['Reviewed contribution evidence.','CONTRIBUTION VERIFIED']],
 ['app/opportunities/[id]/page.tsx',['Source & listing checks','They do not verify the employer, role outcome or any professional capability.']],
 ['app/search/page.tsx',['Contribution verified']],
 ['app/signin/AuthAccountClient.tsx',['Mettelo Proof']]
];
for(const [file,needles] of required){if(!fs.existsSync(file)){findings.push(`${file}: missing trust-critical surface`);continue;}const text=fs.readFileSync(file,'utf8');for(const needle of needles)if(!text.includes(needle))findings.push(`${file}: missing trust contract ${JSON.stringify(needle)}`);}

// Project Architect is deliberately a separate credential model. Guard the separation
// rather than treating its credential verification as contribution-Proof verification.
const architect=fs.existsSync('components/ProjectArchitectApplication.tsx')?fs.readFileSync('components/ProjectArchitectApplication.tsx','utf8'):'';
for(const needle of ['evidence-backed Mettelo designation—not employment or professional certification','Open verification page →'])if(!architect.includes(needle))findings.push(`components/ProjectArchitectApplication.tsx: missing Project Architect credential boundary ${JSON.stringify(needle)}`);

const websitePages=fs.existsSync('lib/website-pages.ts')?fs.readFileSync('lib/website-pages.ts','utf8'):'';
for(const needle of [
 'INFORMATION TECHNOLOGY · DATA · AI',
 'Build job-ready experience through',
 'meaningful projects.',
 'Work on IT, Data & AI projects, collaborate with others and build evidence of what you can do.',
 'Turn your contributions into credible professional Proof that helps you stand out for relevant roles.'
])if(!websitePages.includes(needle))findings.push(`lib/website-pages.ts: missing approved homepage positioning ${JSON.stringify(needle)}`);

console.log(`${findings.length?'FAIL':'PASS'}  Cross-product content governance`);
for(const finding of findings)console.error(`FAIL  ${finding}`);
if(findings.length)process.exitCode=1;
