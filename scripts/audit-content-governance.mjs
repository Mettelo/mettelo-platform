import fs from 'node:fs';
import path from 'node:path';

const roots=['app','components','lib'];
const extensions=new Set(['.ts','.tsx','.js','.jsx','.mjs']);
const excluded=new Set(['node_modules','.next','coverage']);
function filesUnder(root){if(!fs.existsSync(root))return[];return fs.readdirSync(root,{withFileTypes:true}).flatMap(entry=>{if(excluded.has(entry.name))return[];const full=path.join(root,entry.name);if(entry.isDirectory())return filesUnder(full);return extensions.has(path.extname(entry.name))?[full]:[];});}
const files=roots.flatMap(filesUnder);const sources=files.map(file=>({file,text:fs.readFileSync(file,'utf8')}));
const findings=[];
const prohibited=[
 ['verified professional',/verified professional/gi],
 ['verified capability',/verified capability/gi],
 ['employer verified',/employer[- ]verified/gi],
 ['Mettelo verified',/Mettelo[- ]verified/gi],
 ['verified by Mettelo',/verified by Mettelo/gi],
 ['Mettelo Verified Proof',/Mettelo Verified Proof/gi],
 ['Verified Mettelo Proof',/Verified Mettelo Proof/gi],
 ['Mettelo-certified',/Mettelo[- ]certified/gi],
 ['certified capability',/certified capability/gi],
 ['guaranteed job',/guaranteed (job|role|employment)/gi],
 ['guaranteed match',/guaranteed match/gi],
 ['guaranteed opportunity',/guaranteed opportunit(?:y|ies)/gi]
];
for(const {file,text} of sources){for(const [label,pattern] of prohibited){pattern.lastIndex=0;if(pattern.test(text))findings.push(`${file}: prohibited trust/outcome claim: ${label}`);}}

const critical=[
 ['app/api/project-contributions/route.ts',['Contribution verified','Changes requested','Contribution not verified']],
 ['components/ContributionForm.tsx',['FOR REVIEW','Submit contribution for review →']],
 ['app/member/proof/page.tsx',['MY WORK · CONTRIBUTION & EVIDENCE','Mettelo Proof']],
 ['app/proof/[id]/page.tsx',['CONTRIBUTION VERIFIED','What contribution verification means']],
 ['app/people/[id]/page.tsx',['Reviewed contribution evidence.','CONTRIBUTION VERIFIED']],
 ['app/opportunities/[id]/page.tsx',['Source & listing checks','They do not verify the employer, role outcome or any professional capability.']],
 ['app/signin/AuthAccountClient.tsx',['Mettelo Proof']]
];
for(const [file,needles] of critical){if(!fs.existsSync(file)){findings.push(`${file}: missing trust-critical surface`);continue;}const text=fs.readFileSync(file,'utf8');for(const needle of needles)if(!text.includes(needle))findings.push(`${file}: missing trust contract ${JSON.stringify(needle)}`);}

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
