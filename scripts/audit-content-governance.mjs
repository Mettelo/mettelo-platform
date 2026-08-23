import fs from 'node:fs';
import path from 'node:path';

const roots=['app','components','lib'];
const extensions=new Set(['.ts','.tsx','.js','.jsx','.mjs']);
const excluded=new Set(['node_modules','.next','coverage']);

function filesUnder(root){
  if(!fs.existsSync(root))return [];
  const entries=fs.readdirSync(root,{withFileTypes:true});
  return entries.flatMap(entry=>{
    if(excluded.has(entry.name))return [];
    const full=path.join(root,entry.name);
    if(entry.isDirectory())return filesUnder(full);
    return extensions.has(path.extname(entry.name))?[full]:[];
  });
}

const files=roots.flatMap(filesUnder);
const sources=files.map(file=>({file,text:fs.readFileSync(file,'utf8')}));

const prohibited=[
  ['verified professional',/verified professional/gi],
  ['verified capability',/verified capability/gi],
  ['employer verified',/employer[- ]verified/gi],
  ['Mettelo verified',/Mettelo[- ]verified/gi],
  ['Mettelo-certified',/Mettelo[- ]certified/gi],
  ['certified capability',/certified capability/gi],
  ['guaranteed job',/guaranteed (job|role|employment)/gi],
  ['guaranteed match',/guaranteed match/gi],
  ['guaranteed opportunity',/guaranteed opportunit(?:y|ies)/gi]
];

const findings=[];
for(const {file,text} of sources){
  for(const [label,pattern] of prohibited){
    pattern.lastIndex=0;
    if(pattern.test(text))findings.push(`${file}: prohibited trust/outcome claim: ${label}`);
  }
}

const requiredContracts=[
  ['contribution review route exists','app/api/project-contributions/route.ts'],
  ['member Proof surface exists','app/member/proof/page.tsx'],
  ['opportunity detail surface exists','app/opportunities/[id]/page.tsx'],
  ['signup surface exists','app/signin/AuthAccountClient.tsx']
];
for(const [label,file] of requiredContracts){
  if(!fs.existsSync(file))findings.push(`${file}: missing trust-critical surface (${label})`);
}

const checks=[
  ['No prohibited professional/capability verification claims',!findings.some(item=>item.includes('prohibited trust/outcome claim'))],
  ['Trust-critical content surfaces remain present',!findings.some(item=>item.includes('missing trust-critical surface'))]
];

for(const [label,passed] of checks)console.log(`${passed?'PASS':'FAIL'}  ${label}`);
for(const finding of findings)console.error(`FAIL  ${finding}`);
if(findings.length)process.exitCode=1;
